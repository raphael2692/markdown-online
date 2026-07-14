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
    // User-toggled layout override: stacks the right pane below the left
    // one (via the .is-stacked CSS hook) instead of side by side, regardless
    // of viewport width.
    stacked: opts.stacked || false,

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

// Shared toast + rich-copy + standalone-HTML-wrap behavior for tool widgets.
// Mix into an Alpine component with: ...toolActionsMixin(), alongside the
// page's own `toast`, `input`, `opts` state.
function toolActionsMixin() {
  return {
    flash(msg) { this.toast = msg; setTimeout(() => this.toast = '', 2000); },

    async copyRichClick() {
      const ok = await window.copyRich(this.input, this.opts);
      this.flash(ok ? 'Copied — paste into Word or Google Docs' : 'Copied as plain text');
    },

    wrapDocument(html) {
      // getKatexCssText() already rewrites font url()s to an absolute,
      // this-origin URL — resolves correctly even opened outside this page.
      const katexCss = this.opts.math ? `<style>\n${getKatexCssText()}\n</style>\n` : '';
      return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        + '<title>Document</title>\n<style>\n'
        + '  body { font: 16px/1.6 system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }\n'
        + '  pre { background: #f6f6f6; padding: .75em; overflow-x: auto; }\n'
        + '  code { font-family: ui-monospace, monospace; }\n'
        + '  table { border-collapse: collapse; }\n'
        + '  th, td { border: 1px solid #ccc; padding: .35em .6em; }\n'
        + '  blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1em; color: #555; }\n'
        + '</style>\n' + katexCss + '</head>\n<body>\n' + html + '\n</body>\n</html>\n';
    },
  };
}
window.toolActionsMixin = toolActionsMixin;

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

// Mermaid renders every node/edge label as <foreignObject><div>...</div>
// (HTML nested inside the SVG, needed for text measurement/wrapping) —
// but DOMPurify hardcodes emptying anything nested inside a <foreignObject>
// that's inside an <svg>, as a defense against a known mutation-XSS
// namespace-confusion technique, with no config flag to disable it. A
// straight DOMPurify.sanitize(svg, {svg:true}) pass therefore renders every
// diagram with correct shapes but blank labels — and critically, this bites
// on *every* sanitize pass, not just the first: convertMarkdown()'s output
// gets fed through sanitizeHtml() again at each render site (preview,
// copyRich, download), so even a diagram whose labels survived
// renderMermaidDiagrams's own pass gets re-emptied the next time the page
// sanitizes the same HTML unless every pass uses this same two-step dance:
// clean each label's HTML on its own, outside SVG context (where DOMPurify
// allows div/span/p normally), empty the foreignObjects before the real
// SVG-wide pass so it has nothing to wipe, then splice the cleaned label
// HTML back in.
function sanitizePreservingForeignObjectLabels(html, config) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const labels = [];
  tpl.content.querySelectorAll('foreignObject').forEach((fo, i) => {
    labels.push(DOMPurify.sanitize(fo.innerHTML, { USE_PROFILES: { html: true } }));
    fo.innerHTML = '';
    fo.setAttribute('data-fo-index', String(i));
  });
  const cfg = Object.assign({}, config, {
    ADD_TAGS: (config.ADD_TAGS || []).concat('foreignObject'),
    ADD_ATTR: (config.ADD_ATTR || []).concat('data-fo-index'),
  });
  const cleaned = DOMPurify.sanitize(tpl.innerHTML, cfg);
  const out = document.createElement('template');
  out.innerHTML = cleaned;
  out.content.querySelectorAll('foreignObject[data-fo-index]').forEach((fo) => {
    fo.innerHTML = labels[Number(fo.getAttribute('data-fo-index'))];
    fo.removeAttribute('data-fo-index');
  });
  return out.innerHTML;
}

function sanitizeMermaidSvg(svg) {
  return sanitizePreservingForeignObjectLabels(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}

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
      div.innerHTML = sanitizeMermaidSvg(svg);
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
  // Routed through sanitizePreservingForeignObjectLabels (see comment above
  // it) rather than a bare DOMPurify.sanitize() call — this function runs
  // again on already-mermaid-rendered HTML at every preview/copy/download
  // site, and a plain call would silently re-blank every diagram's labels.
  return sanitizePreservingForeignObjectLabels(html, { USE_PROFILES: { html: true, mathMl: true, svg: true } });
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

// Rich features (math, diagrams) turn on automatically the moment their
// syntax appears in the document, rather than behind a manual checkbox the
// user has to remember to flip first. Once enabled they stay enabled for the
// rest of the session, even if the triggering syntax is later deleted.
const MATH_RE = /\$\$[^$]+\$\$|\$[^\s$][^$]*\$/;
const MERMAID_RE = /```mermaid\b/;

async function autoEnableRichFeatures(input, opts) {
  const errors = [];
  if (MATH_RE.test(input) && !opts.math) {
    try {
      await ensureKatexLoaded();
      opts.math = true;
    } catch (e) {
      errors.push('Could not load KaTeX — check your connection and try again.');
    }
  }
  if (MERMAID_RE.test(input) && !opts.mermaid) {
    try {
      await ensureMermaidLoaded();
      opts.mermaid = true;
    } catch (e) {
      errors.push('Could not load Mermaid — check your connection and try again.');
    }
  }
  return errors;
}
window.autoEnableRichFeatures = autoEnableRichFeatures;

// Syntax highlighting is a preview-only enhancement (unlike KaTeX/Mermaid,
// it's not gated behind a checkbox): the raw/copied/downloaded HTML keeps
// marked's plain `language-*` class untouched, since that's the whole point
// of this tool per its own on-page claims — colors only ever get painted
// onto the live preview DOM, never into `fragment`/`output`. Bundled build
// covers ~35 common languages (incl. python) in one file, so there's no
// per-language registration step.
let papaReadyPromise = null;

function ensurePapaParseLoaded() {
  if (!papaReadyPromise) {
    papaReadyPromise = loadScript('/assets/vendor/papaparse-5.4.1.min.js')
      .catch((e) => { papaReadyPromise = null; throw e; });
  }
  return papaReadyPromise;
}
window.ensurePapaParseLoaded = ensurePapaParseLoaded;

// Shared by every CSV/JSON/table-source -> Markdown-table tool: pads columns
// to a fixed width (most generators emit ragged tables) and escapes `|` /
// newlines so a data value can never break out of its cell.
function mdTableCell(v) {
  return String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function rowsToMdTable(header, rows, align) {
  const esc = mdTableCell;
  const widths = header.map((h, i) =>
    Math.max(esc(h).length, ...rows.map((r) => esc(r[i]).length), 3));
  const line = (cells) => '| ' + cells.map((c, i) => esc(c).padEnd(widths[i])).join(' | ') + ' |';
  const sep = (w) => {
    if (align === 'center') return ':' + '-'.repeat(Math.max(w - 2, 1)) + ':';
    if (align === 'right') return '-'.repeat(Math.max(w - 1, 1)) + ':';
    return '-'.repeat(w);
  };
  return [line(header), '| ' + widths.map(sep).join(' | ') + ' |', ...rows.map(line)].join('\n');
}
window.rowsToMdTable = rowsToMdTable;

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

// Mermaid's node/edge labels live inside <foreignObject><div>...</div></foreignObject>
// (see sanitizePreservingForeignObjectLabels above). Browsers taint any
// canvas that an <img> sourced from such an SVG gets drawn onto — even from
// a same-origin blob: URL — so canvas.toDataURL() throws SecurityError and
// the rasterization silently fails (copyRich's catch-all swallows it and
// falls back to a plain-text copy, with no visible error). There's no way
// to un-taint that canvas, so PNG export needs the foreignObject label gone
// *before* the image is drawn: this replaces each one with a plain SVG
// <text>/<tspan>, which canvas can rasterize freely. Only the export path
// does this — the live preview keeps the real foreignObject markup.
const SVG_NS = 'http://www.w3.org/2000/svg';

function flattenForeignObjectLabels(svgEl) {
  svgEl.querySelectorAll('foreignObject').forEach((fo) => {
    const width = parseFloat(fo.getAttribute('width')) || 0;
    const height = parseFloat(fo.getAttribute('height')) || 0;
    const x = parseFloat(fo.getAttribute('x')) || 0;
    const y = parseFloat(fo.getAttribute('y')) || 0;
    let lines = Array.from(fo.querySelectorAll('p')).map((p) => p.textContent);
    if (!lines.length) {
      const t = fo.textContent.trim();
      if (t) lines = [t];
    }
    if (!lines.length) { fo.remove(); return; }
    const fontSize = 16;
    const lineHeight = fontSize * 1.375;
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'trebuchet ms, verdana, arial, sans-serif');
    text.setAttribute('font-size', String(fontSize));
    text.setAttribute('fill', '#333');
    const startY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;
    lines.forEach((line, i) => {
      const tspan = document.createElementNS(SVG_NS, 'tspan');
      tspan.setAttribute('x', String(x + width / 2));
      tspan.setAttribute('y', String(startY + i * lineHeight));
      tspan.textContent = line;
      text.appendChild(tspan);
    });
    fo.replaceWith(text);
  });
}

// Word's clipboard-paste HTML importer silently drops inline <svg> — nothing
// renders, no error — so mermaid diagrams (rendered as SVG for the live
// preview and downloaded HTML, where they paste/display fine) get rasterized
// to a PNG <img> data URI just for this path. Detached from the document, an
// <svg> has no layout box, so intrinsic size comes from its own
// width/height/viewBox attributes rather than getBoundingClientRect().
function svgToPngDataUri(svgEl, scale) {
  scale = scale || 2;
  return new Promise((resolve, reject) => {
    const clone = svgEl.cloneNode(true);
    flattenForeignObjectLabels(clone);
    const viewBox = clone.getAttribute('viewBox');
    const viewBoxDims = viewBox ? viewBox.trim().split(/\s+/).map(Number) : null;
    // viewBox wins over width/height attributes: mermaid sets width="100%"
    // (no height at all) rather than pixel dimensions, and parseFloat("100%")
    // silently returns 100 — a plausible-looking number that's actually
    // meaningless and produces a squished image.
    let width = viewBoxDims ? viewBoxDims[2] : parseFloat(clone.getAttribute('width'));
    let height = viewBoxDims ? viewBoxDims[3] : parseFloat(clone.getAttribute('height'));
    width = width || 600;
    height = height || 400;
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      // Word pastes onto a white page — filling white avoids a transparent
      // diagram looking broken against it.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUri: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('mermaid SVG failed to rasterize')); };
    img.src = url;
  });
}

async function rasterizeMermaidDiagrams(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const svgs = tpl.content.querySelectorAll('.mermaid-diagram svg');
  for (const svg of svgs) {
    try {
      const png = await svgToPngDataUri(svg);
      const img = document.createElement('img');
      img.src = png.dataUri;
      img.width = png.width;
      img.height = png.height;
      svg.closest('.mermaid-diagram').replaceWith(img);
    } catch (e) {
      // Leave the SVG in place — some targets (Google Docs, browsers) do
      // render it; worst case matches today's behavior for this one diagram.
    }
  }
  return tpl.innerHTML;
}

// Word's clipboard-HTML importer maps <del> to a tracked-change deletion
// (shown as a reviewer comment/strikethrough revision) rather than plain
// strikethrough styling — it's the same tag Word's own export uses for
// revision markup. marked emits <del> for ~~strikethrough~~, so swap it for
// <s> (no revision semantics) on this path only; raw/download HTML keeps
// <del>, which is the semantically correct tag and round-trips through
// turndown correctly.
function neutralizeTrackedChangeTags(html) {
  return html.replace(/<del(\s[^>]*)?>/gi, '<s$1>').replace(/<\/del>/gi, '</s>');
}

async function copyRich(markdown, opts) {
  try {
    let html = sanitizeHtml(await convertMarkdown(markdown, opts));
    if (opts && opts.mermaid) html = await rasterizeMermaidDiagrams(html);
    html = neutralizeTrackedChangeTags(html);
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
