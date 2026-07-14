# Markdown Tools — Internal Wiki

Static site of browser-only Markdown utilities, monetized with ads, engineered
to rank on Google one long-tail query per page. This wiki is internal
documentation for whoever works on the repo — it is never deployed with the
public site.

## What exists right now

- **Four live tool pages**, full page anatomy (meta/canonical/JSON-LD, tool
  widget, FAQ, prose) per the `seo-tool-pages` skill's template:
  - `site/markdown-to-html/index.html` (`/markdown-to-html/`) — Tier-1 hub,
    Markdown → HTML converter: resizable split-pane widget with synced
    line-number gutters, a Raw/Rendered toggle, and Copy / Copy-for-Word /
    Download.
  - `site/html-to-markdown/index.html` (`/html-to-markdown/`) — Tier-2 spoke
    of `markdown-to-html`, HTML → Markdown converter: same split-pane/gutter
    widget shape, a Raw/Rendered toggle (Rendered re-parses the generated
    Markdown through `marked`/`DOMPurify` as a fidelity check), options for
    bullet marker / code-block style / heading style, and Copy Markdown /
    Download .md. Conversion uses `turndown` + `turndown-plugin-gfm` (see
    below) rather than the shared `convertMarkdown()` pipeline, since that
    pipeline is Markdown → HTML, not the reverse.
  - `site/markdown-editor/index.html` (`/markdown-editor/`) — online
    Markdown editor for "markdown editor online" / "markdown preview
    online": Write/Split/Preview toggle, a resizable split-pane widget with
    a line-number gutter, a formatting toolbar (paragraph-style dropdown
    spanning Paragraph/H1-H6 that reflects and re-sets the current line,
    bold, italic,
    link, bullet/numbered list, quote, inline code, strikethrough, image,
    task list, table, horizontal rule, a code-block language picker, a
    Mermaid diagram-type picker, and a math insert) with keyboard
    shortcuts, word/character/reading-time counts, localStorage autosave
    with restore and an explicit Clear action, and Copy / Copy-for-Word /
    Download .md / Download HTML / Print-to-PDF export.
  - `markdown-to-html` and `markdown-editor` share the Markdown extensions
    pipeline — see "Markdown extensions" below. `html-to-markdown` doesn't
    need it (there's no Markdown output to add math/diagram/typography
    extensions to until a round trip back through `markdown-to-html`).
  - `site/csv-to-markdown-table/index.html` (`/csv-to-markdown-table/`) —
    Tier-2 page targeting "csv to markdown table" / "excel to markdown
    table": a CSV/JSON tab toggle over a single input pane (no line-number
    gutter — plain text, not a synced dual-language pair), an alignment
    dropdown (left/center/right, written as standard `:---`/`:---:`/`---:`
    colon syntax) and a "first row is header" checkbox (CSV only — JSON
    always uses the union of object keys as columns), a Raw/Rendered
    toggle, and Copy Markdown / Download .md / Copy-for-Word-Docs actions.
    CSV parsing uses vendored PapaParse, lazy-loaded on first conversion
    via `ensurePapaParseLoaded()` (`site/assets/site.js`) rather than at
    page load. The header-row/plain-array → padded, alignment-aware
    Markdown table logic lives in a shared `rowsToMdTable()` helper in
    `site.js` (used by both the CSV and JSON code paths on this page), so
    the next table-source page (`json-to-markdown-table`, the
    `markdown-table-generator` hub) can reuse it instead of
    reimplementing padding/escaping.
- **Site shell**: homepage (`site/index.html`), `about/`, `privacy/`, `404.html`.
- **Shared assets**: `site/assets/site.css` (built Tailwind output),
  `site/assets/site.js` (the shared `convertMarkdown()`/`sanitizeHtml()`
  pipeline, rich-clipboard copy, file download, ad-slot placeholder init,
  the `paneResizer()` mixin — see below — and `pinesSelect()`, a themeable
  button+listbox mixin that replaces every native `<select>` on the site,
  since a native select's open option list is drawn by the OS and can't be
  styled to match the rest of the Pines UI; used by the paragraph-style,
  code-block-language, diagram-type, bullet-marker, code-block-style,
  heading-style, and alignment dropdowns above),
  `site/assets/vendor/` (pinned Alpine.js, marked, DOMPurify, KaTeX,
  Mermaid, highlight.js, turndown, turndown-plugin-gfm, PapaParse —
  vendored locally, no CDN hotlinking in production).
- **Icons**: Lucide, inlined as static `<svg>` markup (not the JS runtime),
  so icons stay themeable via `currentColor`/Tailwind classes and keep
  working with JavaScript disabled. Reference/source copies of each icon
  used on the site live in `site/assets/vendor/lucide/`.

## Markdown extensions (smart typography, math, diagrams)

Both `markdown-to-html` and `markdown-editor` share one conversion pipeline —
`convertMarkdown(input, opts)` in `site/assets/site.js`. Smart typography is
the one remaining manual checkbox (a style preference, not something
detectable in the text); math and diagrams auto-enable themselves —
`autoEnableRichFeatures()` scans the input for `$inline$`/`$$block$$` math or
a ` ```mermaid ` fence and lazy-loads KaTeX/Mermaid the moment that syntax
appears, rather than requiring the user to flip a checkbox first (Mermaid
alone is ~3.5MB minified, so nothing downloads it unasked). Once auto-enabled
for a session, a feature stays on even if the triggering syntax is later
deleted.

- **Smart typography** — `smartyPants()` parses marked's HTML output into an
  inert `<template>`, walks text nodes only (skipping `pre`/`code`/`script`/
  `style`/KaTeX's hidden MathML annotation), and swaps straight quotes for
  curly quotes and `--`/`---` for en/em dashes. It deliberately runs on the
  parsed DOM rather than a regex over the HTML string: marked's own output
  HTML-entity-encodes ordinary prose text but leaves raw HTML the author
  typed directly unescaped (CommonMark raw-HTML passthrough), so the same
  document can mix both forms — a DOM text-node walk handles both uniformly
  via the browser's own decoded `.nodeValue`, and can't mistake an attribute
  value for prose text the way a tag-boundary regex could.
- **Render math (KaTeX)** — a marked extension (`registerKatexExtension()`)
  adds `$inline$` / `$$block$$` tokenizers, gated by a module-level
  `mathEnabled` flag checked inside the tokenizer's `start()`/match function
  itself (not just the renderer) — marked unshifts extension tokenizers to
  the front of the list, so gating only at render time would mean the
  tokenizer claims every `$` regardless of whether math is enabled. Rendered via
  `katex.renderToString(tex, {throwOnError:false})`, so malformed math
  degrades to a visible error span instead of crashing the conversion.
- **Render diagrams (Mermaid)** — deliberately *not* wired into marked's own
  renderer/extension system: the vendored marked build's renderer-merge path
  is synchronous-only, so an async `renderer.code` silently corrupts every
  code block (a raw Promise string-coerces to `"[object Promise]"`). Instead
  marked stays fully synchronous — a ` ```mermaid ` fence renders as an
  ordinary `<pre><code class="language-mermaid">`, like any unrecognized
  code-fence language — and a standalone async function,
  `renderMermaidDiagrams()`, post-processes the resulting HTML string
  afterward: parses it into an inert `<template>`, finds
  `code.language-mermaid` blocks, calls `mermaid.render()` per diagram, and
  replaces each with sanitized SVG (or an inline error box on failure, so one
  bad diagram never breaks the rest of the document).

All three apply consistently everywhere `convertMarkdown()` is used: live
preview, Raw view / Copy / Download on `markdown-to-html`, and preview / rich
clipboard copy / Download HTML / Print-to-PDF on `markdown-editor`. A
`sanitizeHtml()` helper wraps `DOMPurify.sanitize()` with
`USE_PROFILES: {html, mathMl, svg}` so KaTeX's MathML accessibility tree and
Mermaid's SVG output survive sanitization instead of being stripped as
non-standard tags. `wrapDocument()` (the "Full HTML document" / downloaded
HTML path) inlines KaTeX's CSS with font `url()`s rewritten to an absolute,
this-origin URL when math is enabled, so a downloaded standalone file still
renders math correctly even opened outside the site. It lives in the shared
`toolActionsMixin()` (see below), not per-page.

### Mermaid labels vs. DOMPurify, and Word's clipboard quirks

Mermaid renders every node/edge label as `<foreignObject><div>...</div>
</foreignObject>` (HTML nested inside the SVG, needed for text measurement/
wrapping) — but DOMPurify hardcodes emptying anything nested inside a
`<foreignObject>` that's inside an `<svg>`, as a defense against a known
mutation-XSS namespace-confusion technique, with **no config flag to disable
it**. A plain `DOMPurify.sanitize(svg, {svg: true})` therefore renders every
diagram with correct shapes but blank labels — and this isn't a one-time
risk: `sanitizeHtml()` runs again on already-mermaid-rendered HTML at every
preview/copy/download call site, so even a diagram whose labels survived the
first pass gets re-blanked by the next sanitize call unless every pass
handles it. Both `renderMermaidDiagrams()` and `sanitizeHtml()` now route
through a shared `sanitizePreservingForeignObjectLabels()`: it sanitizes each
label's HTML on its own, outside SVG context (where DOMPurify allows
`div`/`span`/`p` normally), empties the foreignObjects before the real
SVG-wide pass so it has nothing left to wipe, then splices the cleaned label
HTML back in.

Word's clipboard-HTML importer adds two more wrinkles, both handled only on
the "Copy for Word / Docs" path (`copyRich()`), not on preview/download:

- **Inline `<svg>` is silently dropped on paste** — no error, the diagram
  just doesn't appear. `copyRich()` rasterizes each mermaid SVG to a PNG
  `<img>` data URI (`svgToPngDataUri()`) instead. Drawing an SVG that
  contains a `<foreignObject>` onto a `<canvas>` taints that canvas (blocks
  `toDataURL()`, no way to un-taint it), so `flattenForeignObjectLabels()`
  first replaces each foreignObject with a plain SVG `<text>`/`<tspan>`
  purely for this export — the live preview keeps the real foreignObject
  markup.
- **`<del>` (marked's strikethrough tag) pastes as a tracked-change
  deletion/comment**, not plain strikethrough — Word's importer maps it the
  same way Word's own revision-tracking export does.
  `neutralizeTrackedChangeTags()` swaps `<del>` for `<s>` on the Word
  clipboard path only; raw/download HTML keeps `<del>`, the semantically
  correct tag that round-trips through turndown.

## Syntax highlighting (preview-only, always on)

Unlike the three extensions above, code-block syntax highlighting is not a
checkbox and is not part of `convertMarkdown()`'s output. `ensureHljsLoaded()`
lazy-loads the vendored highlight.js core bundle (`site/assets/vendor/
highlightjs-11.11.1/`, ~35 common languages incl. Python bundled in one file)
plus the GitHub-light stylesheet, kicked off at widget `init()` and awaited
again after every `run()`. `highlightCodeBlocks(el)` then calls
`hljs.highlightElement()` on every `pre code` inside the **preview DOM only**
— never on `fragment`/`output`, so Raw HTML, Copy, Download, and
Print-to-PDF on both tools keep marked's plain `<pre><code class="language-
python">` untouched. This is deliberate: both tool pages promise the HTML you
take with you isn't opinionated about styling, so coloring only ever gets
painted onto the on-page preview, guarded by the same `_renderGen` counter
pattern used elsewhere to avoid a stale async load racing a newer edit.

- **Shared widget behavior**: both tool widgets mix in `paneResizer()`
  (defined once in `site/assets/site.js`) for the draggable horizontal
  split (`--split`, a %) and vertical pane height (`--pane-height`, px),
  plus the proportional scroll-mirroring between panes. A page's
  `toolWidget()` spreads it in — `{ ...paneResizer(), /* page state */ }` —
  and needs `x-ref="paneRow"` on the flex-row ancestor plus the
  `.split-pane-left` / `.pane-height` CSS classes (`site/assets/input.css`)
  on its panes. Add any new two-pane tool widget on top of this mixin
  rather than re-implementing drag-resize or scroll-sync per page.
  `paneResizer()` also carries a `stacked` boolean (default off), toggled by
  a "Stack panels" / "Side by side" button shown at the `md` breakpoint
  above the pane row; the `.is-stacked` CSS class it applies forces
  `flex-direction: column` and lets the output pane's flex-basis follow its
  own content instead of `--split`, overriding the responsive side-by-side
  default regardless of viewport width. The horizontal drag divider hides
  while stacked (there's no width to drag); the vertical pane-height
  divider still works either way.
- **Shared toast/copy/export behavior**: both tool widgets also mix in
  `toolActionsMixin()` (`site/assets/site.js`) for `flash()` (the toast
  message shown after Copy/Download actions), `copyRichClick()` (wraps
  `window.copyRich()` for the "Copy for Word / Docs" button), and
  `wrapDocument()` described above — spread alongside `paneResizer()`:
  `{ ...paneResizer(), ...toolActionsMixin(), /* page state */ }`. These
  three were previously copy-pasted identically into both pages.
- **Build**: `build.py` expands the two shared partials
  (`site/partials/header.html`, `site/partials/footer.html`) into every page,
  substitutes site-wide tokens (`__SITE_URL__`, `__SITE_NAME__`,
  `__GITHUB_URL__`, `__YEAR__`), generates `sitemap.xml` + `robots.txt`, and
  validates each built page (title present, canonical present, exactly one
  `<h1>`, no leftover unsubstituted tokens).

## Known gaps (tracked, not hidden)

- **Domain is a placeholder.** `SITE_URL` in `build.py` is `https://example.com`
  until a real domain is chosen — it's the one line to change.
- **No real ad network wired in yet.** Ad slots exist in the markup
  (fixed `min-height`, zero CLS) but only show a static "Advertisement"
  placeholder — per the `seo-tool-pages` skill, ads wait until the site has
  ~10 real pages and some organic traffic.
- **Internal linking is thin** — with only three tool pages, "Related tools"
  mostly points back to the homepage. `markdown-to-html` and
  `html-to-markdown` link each other and `markdown-editor` links the HTML
  converter; this fills in as more Tier-2/3 pages ship per the keyword map.
- **`build.py`'s "exactly one `<h1>`" check is a naive text search**, not
  parsed HTML — it also matches a literal `<h1` substring anywhere in the
  file, including inside a page's own JS sample-content string. Any sample
  input embedded in a `<script>` block that itself contains HTML markup
  (e.g. `html-to-markdown`'s sample HTML) needs that substring broken up
  (e.g. `'<h' + '1>...'`) or the build fails validation.
- **No GitHub repo URL yet** — `__GITHUB_URL__` is a placeholder in `build.py`.

## Where things live

See the keyword map for the page roadmap and what's built vs. planned.
