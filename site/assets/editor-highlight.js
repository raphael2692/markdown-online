// Write-pane syntax highlighting for the editor: a color-only backdrop that
// sits behind the (transparent-text) textarea. The textarea keeps every
// native behavior — caret, selection, undo, IME, scrolling — while this file
// renders the same characters, tokenized, into a div with identical metrics.
//
// Hard invariant: the backdrop's text content is byte-identical to the
// textarea value. Spans only wrap characters, never insert or remove them —
// that is the whole basis of the two layers staying pixel-aligned.
//
// Token classes reuse highlight.js's names (hljs-section, hljs-strong, ...)
// so the already-loaded github / github-dark stylesheets and syncHljsTheme()
// color the editor with zero extra theme plumbing. Fence interiors are
// delegated to hljs itself when it has (or we registered) the grammar;
// until hljs lazy-loads they render as plain text and upgrade on the next
// render pass.
(function () {
  'use strict';

  // Past this size the full-document tokenize + innerHTML replace per
  // keystroke stops being frame-budget friendly, so the overlay turns off
  // (CSS class `overlay-off` restores the textarea's own text color).
  const MAX_HIGHLIGHT_CHARS = 200000;
  // Lines longer than this (minified JSON pasted on one line, etc.) skip the
  // inline pass and render plain — the regexes are linear-time but there is
  // no point spending it on a line nobody reads as markdown.
  const MAX_INLINE_LINE = 2000;
  const LINE_CACHE_MAX = 4000;
  const FENCE_CACHE_MAX = 50;

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function span(cls, html) {
    return '<span class="' + cls + '">' + html + '</span>';
  }

  // ---- inline pass ----
  // One left-to-right scan, alternation order = precedence: code spans first
  // (so `**not bold**` inside backticks stays code), then links, autolinks,
  // bold, strikethrough, italic. Every branch is bounded ([^x]+ style), so
  // no backtracking blowups. StackEdit-level fidelity, not CommonMark.
  const INLINE_RE = new RegExp([
    '(`+)([^`]+)\\1',                        // 1,2: code span
    '(!?\\[[^\\]\\n]*\\]\\([^)\\n]*\\))',    // 3: link / image
    '(<https?:\\/\\/[^>\\s]+>)',             // 4: autolink
    '(\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__)',   // 5: bold
    '(~~[^~\\n]+~~)',                        // 6: strikethrough
    '(\\*[^*\\n]+\\*|\\b_[^_\\n]+_\\b)',     // 7: italic
  ].join('|'), 'g');
  const LINK_SPLIT_RE = /^(!?\[[^\]]*\])(\([\s\S]*\))$/;

  function plainText(s, pipes) {
    s = esc(s);
    // Table rows: color the pipes so the row structure reads at a glance.
    return pipes ? s.replace(/\|/g, '<span class="hljs-symbol">|</span>') : s;
  }

  function inlineHtml(text, pipes) {
    if (text.length > MAX_INLINE_LINE) return esc(text);
    let out = '';
    let last = 0;
    let m;
    INLINE_RE.lastIndex = 0;
    while ((m = INLINE_RE.exec(text))) {
      out += plainText(text.slice(last, m.index), pipes);
      const t = m[0];
      if (m[1]) out += span('hljs-code', esc(t));
      else if (m[3]) {
        // hljs-symbol, not hljs-link: the github themes don't style .hljs-link.
        const p = LINK_SPLIT_RE.exec(t);
        out += span('hljs-string', esc(p[1])) + span('hljs-symbol', esc(p[2]));
      } else if (m[4]) out += span('hljs-symbol', esc(t));
      else if (m[5]) out += span('hljs-strong', esc(t));
      else if (m[6]) out += span('hljs-strong', esc(t));
      else out += span('hljs-emphasis', esc(t));
      last = m.index + t.length;
    }
    out += plainText(text.slice(last), pipes);
    return out;
  }

  // ---- block pass (per line, outside fences) ----
  const HEADING_RE = /^#{1,6}\s/;
  const QUOTE_RE = /^\s{0,3}(?:>\s?)+/;
  const HR_RE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
  const LIST_RE = /^(\s*)((?:[-*+]|\d{1,9}[.)])\s+)(\[[ xX]\]\s+)?/;
  const TABLE_ROW_RE = /^\s*\|/;

  function lineHtml(line, cache) {
    if (line === '') return '';
    const cached = cache.get(line);
    if (cached !== undefined) return cached;
    let html;
    if (HEADING_RE.test(line)) {
      html = span('hljs-section', esc(line));
    } else if (QUOTE_RE.test(line)) {
      html = span('hljs-quote', esc(line));
    } else if (HR_RE.test(line)) {
      html = span('hljs-section', esc(line));
    } else {
      const lm = LIST_RE.exec(line);
      if (lm) {
        html = esc(lm[1])
          + span('hljs-bullet', esc(lm[2] + (lm[3] || '')))
          + inlineHtml(line.slice(lm[0].length), false);
      } else {
        html = inlineHtml(line, TABLE_ROW_RE.test(line));
      }
    }
    if (cache.size >= LINE_CACHE_MAX) cache.clear();
    cache.set(line, html);
    return html;
  }

  // ---- fences ----
  const FENCE_OPEN_RE = /^(\s*)(`{3,}|~{3,})(.*)$/;

  // Fence bodies are the expensive part (hljs.highlight); memoized so an
  // unchanged code block costs nothing on the keystrokes around it.
  function fenceBodyHtml(lang, body, cache) {
    // Before hljs lazy-loads, render plain but do NOT cache — otherwise the
    // upgrade pass scheduled after ensureHljsLoaded() would return this
    // stale uncolored entry forever.
    if (lang && !window.hljs) return esc(body);
    const key = lang + '\u0000' + body;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    let html = null;
    if (lang && window.hljs.getLanguage(lang)) {
      try {
        html = window.hljs.highlight(body, { language: lang, ignoreIllegals: true }).value;
      } catch (e) { html = null; }
    }
    if (html === null) html = esc(body);
    if (cache.size >= FENCE_CACHE_MAX) cache.clear();
    cache.set(key, html);
    return html;
  }

  function renderHtml(text, state) {
    const lines = text.split('\n');
    const out = [];
    let fence = null; // { char, len, lang, body: [] }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (fence) {
        const t = line.trim();
        if (t.length >= fence.len && t === fence.char.repeat(t.length)) {
          if (fence.body.length) out.push(fenceBodyHtml(fence.lang, fence.body.join('\n'), state.fenceCache));
          out.push(span('hljs-code', esc(line)));
          fence = null;
        } else {
          fence.body.push(line);
        }
        continue;
      }
      const fm = FENCE_OPEN_RE.exec(line);
      if (fm) {
        out.push(esc(fm[1])
          + span('hljs-code', esc(fm[2]))
          + (fm[3] ? span('hljs-symbol', esc(fm[3])) : ''));
        fence = {
          char: fm[2][0],
          len: fm[2].length,
          lang: fm[3].trim().split(/\s+/)[0].toLowerCase(),
          body: [],
        };
        continue;
      }
      out.push(lineHtml(line, state.lineCache));
    }
    // Unclosed fence while the user is still typing it: highlight what's there.
    if (fence && fence.body.length) {
      out.push(fenceBodyHtml(fence.lang, fence.body.join('\n'), state.fenceCache));
    }
    return out.join('\n');
  }

  // ---- overlay wiring ----
  function attach(opts) {
    const textarea = opts.textarea;
    const backdrop = opts.backdrop;
    const wrapper = backdrop.parentElement;
    const state = { lineCache: new Map(), fenceCache: new Map() };
    let raf = 0;

    function sync() {
      backdrop.scrollTop = textarea.scrollTop;
      backdrop.scrollLeft = textarea.scrollLeft;
    }

    function renderNow() {
      raf = 0;
      const text = textarea.value;
      if (text.length > MAX_HIGHLIGHT_CHARS) {
        // Too big to re-tokenize per keystroke — fall back to a normal,
        // uncolored textarea rather than a janky colored one.
        wrapper.classList.add('overlay-off');
        backdrop.textContent = '';
        return;
      }
      wrapper.classList.remove('overlay-off');
      // U+200B sentinel: a trailing "\n" gives the textarea a phantom last
      // row, but a pre-formatted div collapses it — the zero-width space
      // forces the matching line box so scrollHeights stay equal.
      backdrop.innerHTML = renderHtml(text, state) + '\u200b';
      sync();
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(renderNow);
    }

    textarea.addEventListener('scroll', sync, { passive: true });
    schedule();
    return { schedule, sync };
  }

  window.EditorHighlight = { attach };
})();
