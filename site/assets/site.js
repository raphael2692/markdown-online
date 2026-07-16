// Derived from this script's own <script src>, so lazy-loaded vendor assets
// below resolve correctly under a GitHub Pages project-site base path
// (e.g. /markdown-online) without hardcoding it here.
const ASSETS_BASE = (() => {
  const src = document.currentScript && document.currentScript.src;
  const m = src && src.match(/^(.*)\/assets\/site\.js(?:[?#].*)?$/);
  return m ? m[1] : '';
})();

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

// Shared toast + rich-copy behavior for tool widgets.
// Mix into an Alpine component with: ...toolActionsMixin(), alongside the
// page's own `toast`, `input`, `opts` state.
function toolActionsMixin() {
  return {
    flash(msg) { this.toast = msg; setTimeout(() => this.toast = '', 2000); },

    async copyRichClick() {
      const ok = await window.copyRich(this.input, this.opts);
      this.flash(ok ? 'Copied — paste into Word or Google Docs' : 'Copied as plain text');
    },
  };
}
window.toolActionsMixin = toolActionsMixin;

// Pines-styled replacement for a native <select>: a native <select>'s open
// option list is drawn by the OS, not the page, so it can never be themed —
// this renders the closed button AND the open list as plain DOM (Tailwind +
// Alpine), matching the rest of the Pines UI on the page.
//
// Usage — mix into a nested x-data on a wrapper div, inside a page's main
// toolWidget() scope, so `value`/`onSelect` can close over that scope's own
// state and methods directly:
//   <div x-data="pinesSelect({
//          items: [{ value: 'a', label: 'A' }, { header: 'Group' }, ...],
//          value: () => opts.align,
//          onSelect: (v) => { opts.align = v; run(); },
//        })" class="relative inline-block">
// For an action menu with no persistent selection (e.g. "insert code
// block"), pass value: () => null and a fixed placeholder.
function pinesSelect({ items, value, onSelect, placeholder = 'Select' }) {
  return {
    open: false,
    dropUp: false,
    items,
    activeIndex: -1,

    get selectableIndexes() {
      return this.items.reduce((acc, item, i) => { if (!item.header) acc.push(i); return acc; }, []);
    },
    get selectedItem() {
      const v = value();
      return this.items.find((i) => !i.header && i.value === v) || null;
    },
    get displayLabel() {
      const sel = this.selectedItem;
      return sel ? sel.label : placeholder;
    },

    openMenu() {
      this.open = true;
      const selectable = this.selectableIndexes;
      const selIdx = this.items.indexOf(this.selectedItem);
      this.activeIndex = selIdx > -1 ? selIdx : (selectable[0] ?? -1);
      this.$nextTick(() => {
        const btn = this.$refs.pinesSelectButton;
        const list = this.$refs.pinesSelectList;
        if (btn && list) {
          const spaceBelow = window.innerHeight - btn.getBoundingClientRect().bottom;
          this.dropUp = spaceBelow < list.offsetHeight && btn.getBoundingClientRect().top > spaceBelow;
        }
        this.scrollActiveIntoView();
      });
    },
    close() {
      this.open = false;
      this.$refs.pinesSelectButton && this.$refs.pinesSelectButton.focus();
    },
    toggle() { this.open ? this.close() : this.openMenu(); },

    choose(item) {
      if (item.header) return;
      onSelect(item.value);
      this.close();
    },
    scrollActiveIntoView() {
      const list = this.$refs.pinesSelectList;
      const el = list && list.querySelector(`[data-idx="${this.activeIndex}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    },
    moveActive(step) {
      const selectable = this.selectableIndexes;
      if (!selectable.length) return;
      const pos = selectable.indexOf(this.activeIndex);
      const nextPos = pos === -1 ? 0 : Math.min(Math.max(pos + step, 0), selectable.length - 1);
      this.activeIndex = selectable[nextPos];
      this.scrollActiveIntoView();
    },
    chooseActive() {
      if (this.activeIndex > -1) this.choose(this.items[this.activeIndex]);
    },
  };
}
window.pinesSelect = pinesSelect;

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
      // Mermaid sizes its own svg responsively (width="100%" plus a
      // max-width inline style matching its natural size) — fine at the
      // default 100% preview zoom, but it means the svg's rendered size is
      // already clamped to the pane before the zoom controls (which scale a
      // diagram by its actual rendered box) get a chance to act, making
      // zoom in/out/to-fit a no-op on anything wider than the pane. Give it
      // the same explicit, absolute width/height dbml.js's own diagrams
      // use instead, so it participates in zoom the same way.
      const svgEl = div.querySelector('svg');
      const vb = (svgEl?.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
      if (svgEl && vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
        svgEl.setAttribute('width', vb[2]);
        svgEl.setAttribute('height', vb[3]);
        svgEl.style.maxWidth = '';
      }
      pre.replaceWith(div);
    } catch (e) {
      pre.outerHTML = `<pre class="mermaid-error">Diagram error: ${DOMPurify.sanitize(e.message || String(e))}</pre>`;
    }
  }
  return tpl.innerHTML;
}

// DBML integration follows the same "post-process marked's plain
// <pre><code class="language-dbml">" pattern as Mermaid above, for the same
// reason (marked's renderer merge is synchronous-only). Unlike Mermaid,
// this isn't a translation into another diagram grammar — dbml.js parses
// real DBML and draws its own SVG — so there's no intermediate render()
// call into a vendored library, just window.DbmlRenderer from that
// lazily-loaded first-party module.
async function renderDbmlDiagrams(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const blocks = tpl.content.querySelectorAll('code.language-dbml');
  for (const code of blocks) {
    const pre = code.closest('pre');
    try {
      const { svg } = window.DbmlRenderer.render(code.textContent, { dark: mermaidTheme() === 'dark' });
      const div = document.createElement('div');
      div.className = 'mermaid-diagram';
      // Built entirely from document.createElementNS + textContent (see
      // dbml.js), never from concatenated HTML strings, so there's nothing
      // for DOMPurify to catch here — this pass is defense-in-depth, kept
      // for the same reason every other render site sanitizes its output.
      div.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
      pre.replaceWith(div);
    } catch (e) {
      pre.outerHTML = `<pre class="mermaid-error">DBML error: ${DOMPurify.sanitize(e.message || String(e))}</pre>`;
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
  if (opts.dbml) html = await renderDbmlDiagrams(html);
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
      loadScript(`${ASSETS_BASE}/assets/vendor/katex-0.17.0/katex.min.js`),
      loadStylesheet(`${ASSETS_BASE}/assets/vendor/katex-0.17.0/katex.min.css`),
      // Cached text is only ever spliced into *other* documents (a downloaded
      // standalone HTML file, or the print-to-PDF iframe) whose base URL isn't
      // this page's own — so font url(fonts/...) references are rewritten to
      // an absolute, this-origin URL rather than left relative (which would
      // resolve against the wrong base and silently fall back to no font).
      fetch(`${ASSETS_BASE}/assets/vendor/katex-0.17.0/katex.min.css`).then((r) => r.text()).then((t) => {
        katexCssText = t.replace(/url\(fonts\//g, `url(${location.origin}${ASSETS_BASE}/assets/vendor/katex-0.17.0/fonts/`);
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

// Mermaid bakes its theme's colors directly into each rendered SVG's
// attributes at render time (not via CSS classes), so switching the site's
// dark/light toggle can't just be a stylesheet swap the way highlight.js's
// coloring is below — every already-rendered diagram needs regenerating
// through mermaid.render() again under the new theme. See the 'themechange'
// listener further down, which re-initializes and calls run() again.
function mermaidTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'default';
}

function ensureMermaidLoaded() {
  if (!mermaidReadyPromise) {
    mermaidReadyPromise = loadScript(`${ASSETS_BASE}/assets/vendor/mermaid-11.16.0.min.js`).then(() => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: mermaidTheme() });
    }).catch((e) => { mermaidReadyPromise = null; throw e; });
  }
  return mermaidReadyPromise;
}
window.ensureMermaidLoaded = ensureMermaidLoaded;

// Re-applies the current theme to Mermaid's config; a no-op if Mermaid was
// never loaded on this page. Doesn't repaint existing diagrams by itself —
// callers still need to re-run the conversion pipeline to regenerate them.
function syncMermaidTheme() {
  if (!mermaidReadyPromise) return Promise.resolve();
  return mermaidReadyPromise.then(() => mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: mermaidTheme() }));
}
window.syncMermaidTheme = syncMermaidTheme;

let dbmlReadyPromise = null;

// dbml.js is first-party code, not a third-party vendor library — but it's
// a non-trivial parser/layout/renderer that only a fraction of visitors
// will ever trigger, so it follows the same lazy-load-on-first-use
// discipline as the vendored libraries above rather than shipping in the
// deferred head-script bundle every page pays for.
function ensureDbmlLoaded() {
  if (!dbmlReadyPromise) {
    dbmlReadyPromise = loadScript(`${ASSETS_BASE}/assets/dbml.js`)
      .catch((e) => { dbmlReadyPromise = null; throw e; });
  }
  return dbmlReadyPromise;
}
window.ensureDbmlLoaded = ensureDbmlLoaded;

// Rich features (math, diagrams) turn on automatically the moment their
// syntax appears in the document, rather than behind a manual checkbox the
// user has to remember to flip first. Once enabled they stay enabled for the
// rest of the session, even if the triggering syntax is later deleted.
const MATH_RE = /\$\$[^$]+\$\$|\$[^\s$][^$]*\$/;
const MERMAID_RE = /```mermaid\b/;
const DBML_RE = /```dbml\b/;

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
  if (DBML_RE.test(input) && !opts.dbml) {
    try {
      await ensureDbmlLoaded();
      opts.dbml = true;
    } catch (e) {
      errors.push('Could not load the DBML renderer — check your connection and try again.');
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
    papaReadyPromise = loadScript(`${ASSETS_BASE}/assets/vendor/papaparse-5.4.1.min.js`)
      .catch((e) => { papaReadyPromise = null; throw e; });
  }
  return papaReadyPromise;
}
window.ensurePapaParseLoaded = ensurePapaParseLoaded;

// turndown-plugin-gfm only touches TurndownService at call time
// (turndownPluginGfm.gfm(td)), not at parse time, so load order between the
// two scripts doesn't matter and Promise.all is safe.
let turndownReadyPromise = null;

function ensureTurndownLoaded() {
  if (!turndownReadyPromise) {
    turndownReadyPromise = Promise.all([
      loadScript(`${ASSETS_BASE}/assets/vendor/turndown-7.2.0.min.js`),
      loadScript(`${ASSETS_BASE}/assets/vendor/turndown-plugin-gfm-1.0.2.min.js`),
    ]).catch((e) => { turndownReadyPromise = null; throw e; });
  }
  return turndownReadyPromise;
}
window.ensureTurndownLoaded = ensureTurndownLoaded;

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

// Unlike Mermaid, highlight.js's coloring is plain CSS classes (hljs-keyword,
// hljs-string, ...) painted once by hljs.highlightElement() — so following
// the theme only needs swapping which stylesheet is in effect, never
// re-highlighting the code itself.
function hljsStylesheetHref() {
  const dark = document.documentElement.classList.contains('dark');
  return `${ASSETS_BASE}/assets/vendor/highlightjs-11.11.1/${dark ? 'github-dark' : 'github'}.min.css`;
}

function ensureHljsLoaded() {
  if (!hljsReadyPromise) {
    hljsReadyPromise = Promise.all([
      loadScript(`${ASSETS_BASE}/assets/vendor/highlightjs-11.11.1/highlight.min.js`),
      loadStylesheet(hljsStylesheetHref()),
    ]).catch((e) => { hljsReadyPromise = null; throw e; });
  }
  return hljsReadyPromise;
}

// A no-op if highlight.js's stylesheet was never loaded on this page.
function syncHljsTheme() {
  if (!hljsReadyPromise) return;
  const link = document.querySelector('link[href*="/highlightjs-11.11.1/github"]');
  if (link) link.href = hljsStylesheetHref();
}
window.syncHljsTheme = syncHljsTheme;
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

// Keeps already-loaded generated content in step with the header's dark-mode
// toggle (theme.js dispatches this on document). Re-rendering the mermaid
// diagrams themselves (not just re-theming mermaid's config) is left to the
// page's own toolWidget(), which is the only place that knows whether any
// are currently on screen and can call run() to regenerate them.
document.addEventListener('themechange', () => {
  syncMermaidTheme();
  syncHljsTheme();
});
