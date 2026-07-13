function downloadFile(content, filename, mime) {
  mime = mime || 'text/plain;charset=utf-8';
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
window.downloadFile = downloadFile;

// Shared resizable split-pane behavior for two-pane tool widgets: a
// draggable vertical divider (sets --split, a %) and a draggable bottom
// bar (sets --pane-height, in px). Mix into an Alpine component with:
//   function toolWidget() { return { ...paneResizer(), /* page state */ }; }
// Requires the component to have x-ref="paneRow" on the flex row ancestor,
// with :style="`--split: ${split}%; --pane-height: ${paneHeight}px`", and
// the CSS classes .split-pane-left / .pane-height (site.css) on the panes.
function paneResizer(opts) {
  opts = opts || {};
  const minSplit = opts.minSplit || 20, maxSplit = opts.maxSplit || 80;
  const minHeight = opts.minHeight || 150, maxHeight = opts.maxHeight || 600;
  return {
    split: opts.split || 50,
    dragging: false,
    paneHeight: opts.paneHeight || 288,
    draggingV: false,
    syncingScroll: false,

    // Mirrors scroll *proportionally* (scrollTop / scrollable range) rather
    // than 1:1, since the two panes rarely have the same content length.
    // The syncingScroll guard breaks the feedback loop: mirroring sets the
    // other pane's scrollTop, which fires its own scroll event, which would
    // otherwise mirror straight back.
    mirrorScroll(source, target) {
      if (!target || this.syncingScroll) return;
      this.syncingScroll = true;
      const sMax = source.scrollHeight - source.clientHeight;
      const tMax = target.scrollHeight - target.clientHeight;
      target.scrollTop = sMax > 0 ? (source.scrollTop / sMax) * tMax : 0;
      requestAnimationFrame(() => { this.syncingScroll = false; });
    },

    startDrag(e) {
      e.preventDefault();
      this.dragging = true;
      const row = this.$refs.paneRow;

      const onMove = (ev) => {
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const rect = row.getBoundingClientRect();
        const pct = ((clientX - rect.left) / rect.width) * 100;
        this.split = Math.min(maxSplit, Math.max(minSplit, pct));
      };
      const onUp = () => {
        this.dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    },

    startVDrag(e) {
      e.preventDefault();
      this.draggingV = true;
      const startY = e.touches ? e.touches[0].clientY : e.clientY;
      const startHeight = this.paneHeight;

      const onMove = (ev) => {
        const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
        this.paneHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + (clientY - startY)));
      };
      const onUp = () => {
        this.draggingV = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    },
  };
}
window.paneResizer = paneResizer;

// ---------------------------------------------------------------------
// Markdown extensions: smart typography, KaTeX math, Mermaid diagrams.
// All three are opt-in (tool widgets gate them behind checkboxes) and
// lazy-loaded — see ensureKatexLoaded()/ensureMermaidLoaded() below.
// ---------------------------------------------------------------------

// Simplified SmartyPants: straight quotes -> curly, --/--- -> en/em dash.
// Writes literal Unicode characters (not HTML-entity strings): this runs on
// a DOM Text node's .nodeValue, which browsers never interpret as markup —
// entity text like "&#8220;" would round-trip back out through innerHTML as
// the literal six characters "&#8220;", not a rendered curly quote. Every
// page on this site already declares UTF-8, and the ClipboardItem/Blob
// writes elsewhere in this file are explicit about charset, so plain
// Unicode characters are both correct here and simpler than entities.
function smartyTransform(text) {
  return text
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/(^|[\s([{<])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(^|[\s([{<])'/g, '$1‘')
    .replace(/'/g, '’');
}

// Runs on marked's HTML *output*, not the raw markdown source: marked itself
// HTML-entity-encodes straight quotes in ordinary prose text nodes (e.g.
// "don't" becomes "don&#39;t" in its own output), while raw HTML the author
// typed directly is passed through unescaped per CommonMark — so the same
// document can mix both forms. Parsing into an inert <template> and walking
// only text nodes (skipping code/pre/script/style and KaTeX's hidden MathML
// annotation) handles both forms uniformly via the browser's own decoded
// .nodeValue, and can never mistake an attribute value for prose text.
function smartyPants(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      return n.parentElement && n.parentElement.closest('pre, code, script, style, .katex-mathml, annotation')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    n.nodeValue = smartyTransform(n.nodeValue);
  }
  return tpl.innerHTML;
}

// KaTeX integration: a marked extension gated by `mathEnabled`, which
// convertMarkdown() sets immediately before every marked.parse() call. The
// gate lives in the tokenizers themselves (not just the renderer) — marked
// unshifts extension tokenizers to the front of the tokenizer list, so an
// always-on tokenizer would claim every "$" before marked's own codespan/
// escaping logic ever saw it, regardless of any flag checked only later at
// render time. Returning `undefined` when disabled makes marked handle "$"
// exactly as if this extension were never registered.
let mathEnabled = false;
let katexRegistered = false;

function katexRender(tex, displayMode) {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode });
  } catch (e) {
    return DOMPurify.sanitize(displayMode ? `$$${tex}$$` : `$${tex}$`);
  }
}

function registerKatexExtension() {
  if (katexRegistered) return;
  katexRegistered = true;
  marked.use({
    extensions: [
      {
        name: 'mathBlock',
        level: 'block',
        start(src) { return mathEnabled ? src.indexOf('$$') : undefined; },
        tokenizer(src) {
          if (!mathEnabled) return undefined;
          const m = /^\$\$([\s\S]+?)\$\$/.exec(src);
          if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
        },
        renderer(token) { return `<p>${katexRender(token.text, true)}</p>`; },
      },
      {
        name: 'mathInline',
        level: 'inline',
        start(src) { return mathEnabled ? src.indexOf('$') : undefined; },
        tokenizer(src) {
          if (!mathEnabled) return undefined;
          // GitHub-style: no $$ (block math handles that), \$ escapes a literal dollar.
          const m = /^\$(?!\$)((?:\\\$|[^\n$])+?)\$(?!\$)/.exec(src);
          if (m) return { type: 'mathInline', raw: m[0], text: m[1].replace(/\\\$/g, '$') };
        },
        renderer(token) { return katexRender(token.text, false); },
      },
    ],
  });
}

// Mermaid integration deliberately does NOT hook into marked's renderer/
// extension system: marked.use({renderer:{...}}) merges renderer overrides
// with a synchronous-only wrapper (confirmed against the vendored build),
// so an async renderer.code silently corrupts every code block on the page
// (a raw Promise string-coerces to "[object Promise]"). Instead, marked
// stays fully synchronous and emits an ordinary
// <pre><code class="language-mermaid">, exactly like any other fenced code
// block with an unrecognized language — then this standalone async function
// post-processes the resulting HTML string.
let mermaidSeq = 0;

async function renderMermaidDiagrams(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const blocks = tpl.content.querySelectorAll('code.language-mermaid');
  for (const code of blocks) {
    const id = 'mermaid-diagram-' + (++mermaidSeq);
    const pre = code.closest('pre');
    try {
      const { svg } = await mermaid.render(id, code.textContent);
      const div = document.createElement('div');
      div.className = 'mermaid-diagram';
      // Sanitized here, at generation time, not just later in the shared
      // sanitizeHtml() pass — this is third-party-library output, not the
      // user's authored markdown, so it gets the same protection on every
      // output channel (Raw/Copy/Download included), not just the preview.
      div.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
      pre.replaceWith(div);
    } catch (e) {
      pre.outerHTML = `<pre class="mermaid-error">Diagram error: ${DOMPurify.sanitize(e.message || String(e))}</pre>`;
    }
  }
  return tpl.innerHTML;
}

// Single shared conversion pipeline used by every tool widget and by
// copyRich(), so the markdown -> HTML rules stay identical everywhere
// instead of being reimplemented at each call site.
async function convertMarkdown(input, opts) {
  opts = opts || {};
  mathEnabled = !!opts.math;
  let html = marked.parse(input, { gfm: true, breaks: !!opts.gfmBreaks });
  if (opts.smartypants) html = smartyPants(html);
  if (opts.mermaid) html = await renderMermaidDiagrams(html);
  return html;
}
window.convertMarkdown = convertMarkdown;

function sanitizeHtml(html) {
  // mathMl: KaTeX's accessibility tree (<math>/<semantics>/<annotation>...).
  // svg: Mermaid diagrams. `style` (load-bearing for KaTeX's inline-
  // positioned spans) is already allowed by DOMPurify's default profile.
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true, mathMl: true, svg: true } });
}
window.sanitizeHtml = sanitizeHtml;

// ---- lazy loading ----

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = () => resolve();
    l.onerror = () => reject(new Error(`Failed to load ${href}`));
    document.head.appendChild(l);
  });
}

let katexReadyPromise = null;
let katexCssText = '';

function ensureKatexLoaded() {
  if (!katexReadyPromise) {
    katexReadyPromise = Promise.all([
      loadScript('/assets/vendor/katex-0.17.0/katex.min.js'),
      loadStylesheet('/assets/vendor/katex-0.17.0/katex.min.css'),
      // Cached text is only ever spliced into *other* documents (a downloaded
      // standalone HTML file, or the print-to-PDF iframe) whose base URL isn't
      // this page's own — so font url(fonts/...) references are rewritten to
      // an absolute, this-origin URL rather than left relative (which would
      // resolve against the wrong base and silently fall back to no font).
      fetch('/assets/vendor/katex-0.17.0/katex.min.css').then((r) => r.text()).then((t) => {
        katexCssText = t.replace(/url\(fonts\//g, `url(${location.origin}/assets/vendor/katex-0.17.0/fonts/`);
      }),
    ]).then(() => registerKatexExtension())
      // A failed attempt (network blip) must not permanently wedge the
      // feature off for the rest of the page session — clear the cache so
      // the next checkbox toggle retries the actual network request.
      .catch((e) => { katexReadyPromise = null; throw e; });
  }
  return katexReadyPromise;
}
window.ensureKatexLoaded = ensureKatexLoaded;
window.getKatexCssText = () => katexCssText;

let mermaidReadyPromise = null;

function ensureMermaidLoaded() {
  if (!mermaidReadyPromise) {
    mermaidReadyPromise = loadScript('/assets/vendor/mermaid-11.16.0.min.js').then(() => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
    }).catch((e) => { mermaidReadyPromise = null; throw e; });
  }
  return mermaidReadyPromise;
}
window.ensureMermaidLoaded = ensureMermaidLoaded;

// Syntax highlighting is a preview-only enhancement (unlike KaTeX/Mermaid,
// it's not gated behind a checkbox): the raw/copied/downloaded HTML keeps
// marked's plain `language-*` class untouched, since that's the whole point
// of this tool per its own on-page claims — colors only ever get painted
// onto the live preview DOM, never into `fragment`/`output`. Bundled build
// covers ~35 common languages (incl. python) in one file, so there's no
// per-language registration step.
let hljsReadyPromise = null;

function ensureHljsLoaded() {
  if (!hljsReadyPromise) {
    hljsReadyPromise = Promise.all([
      loadScript('/assets/vendor/highlightjs-11.11.1/highlight.min.js'),
      loadStylesheet('/assets/vendor/highlightjs-11.11.1/github.min.css'),
    ]).catch((e) => { hljsReadyPromise = null; throw e; });
  }
  return hljsReadyPromise;
}
window.ensureHljsLoaded = ensureHljsLoaded;

// Call after replacing a preview element's innerHTML. Assumes hljs is
// already loaded (call ensureHljsLoaded() first) — kept synchronous so
// callers can gate it behind their own render-generation guard right up
// to the point of use.
function highlightCodeBlocks(el) {
  el.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
}
window.highlightCodeBlocks = highlightCodeBlocks;

// ---- rich clipboard ----

async function copyRich(markdown, opts) {
  try {
    const html = sanitizeHtml(await convertMarkdown(markdown, opts));
    const wrapped = `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">${html}</div>`;
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([wrapped], { type: 'text/html' }),
      'text/plain': new Blob([markdown], { type: 'text/plain' }),
    })]);
    return true;
  } catch (e) {
    await navigator.clipboard.writeText(markdown);
    return false;
  }
}
window.copyRich = copyRich;

// Reserved ad slots show a placeholder label until an ad network is wired in —
// see seo-tool-pages skill: ads wait until the site has ~10 real pages.
document.querySelectorAll('.ad-slot').forEach((el) => {
  el.textContent = 'Advertisement';
});
