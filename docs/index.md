# Markdown Tools — Internal Wiki

A free, open-source (GPL-3.0), browser-only Markdown tool — write, preview,
import, and export, all in one page, all running client-side. This wiki is
internal documentation for whoever works on the repo: it explains how the
pieces fit together and why some non-obvious decisions were made. It is
never deployed with the public site. The public-facing docs are
`README.md` and `CONTRIBUTING.md` at the repo root, which GitHub renders
natively — this wiki is for engineering depth, not visitor-facing content.

## What exists right now

- **Landing page**, `site/index.html` — pitch, feature docs, and FAQ, with
  "Open Editor" links (header/footer nav, and inline in the body) into the
  tool. Not the tool itself — new tool capability doesn't belong here.
- **The tool**, `site/editor/index.html` at `/editor/` — a unified Markdown
  workspace: writing/splitting/previewing Markdown, importing from
  HTML/CSV/JSON, and exporting to Markdown/HTML/rich-clipboard/PDF.
  (Consolidates what used to be four separate converter pages —
  `markdown-to-html`, `html-to-markdown`, `markdown-editor`,
  `csv-to-markdown-table` — first into one page at `/`, then split back out
  to `/editor/` once the root became a landing page.)
- **Site shell**: `about/`, `privacy/`, `404.html`.
- **Shared assets**: `site/assets/site.css` (built Tailwind output),
  `site/assets/site.js` (the shared `convertMarkdown()`/`sanitizeHtml()`
  pipeline, rich-clipboard copy, file download, the `paneResizer()` mixin —
  see below — and `pinesSelect()`, a themeable button+listbox mixin that
  replaces every native `<select>` on the site, since a native select's open
  option list is drawn by the OS and can't be styled to match the rest of
  the Pines UI), `site/assets/vendor/` (pinned Alpine.js, marked, DOMPurify,
  KaTeX, Mermaid, highlight.js, turndown, turndown-plugin-gfm, PapaParse —
  vendored locally, no CDN hotlinking in production).
- **Icons**: Lucide, inlined as static `<svg>` markup (not the JS runtime),
  so icons stay themeable via `currentColor`/Tailwind classes and keep
  working with JavaScript disabled. Reference/source copies of each icon
  used on the site live in `site/assets/vendor/lucide/`.

## Markdown extensions (smart typography, math, diagrams)

The tool's conversion pipeline is one shared function —
`convertMarkdown(input, opts)` in `site/assets/site.js`. Smart typography and
GFM line breaks (`breaks: true`, single newlines render as `<br>`) are both
always on — there's no toggle, since neither is worth exposing as a decision
the user has to make; math and diagrams auto-enable themselves —
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
  tokenizer claims every `$` regardless of whether math is enabled. Rendered
  via `katex.renderToString(tex, {throwOnError:false})`, so malformed math
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

Both apply consistently everywhere `convertMarkdown()` is used: live
preview, copy / download / print-to-PDF. A `sanitizeHtml()` helper wraps
`DOMPurify.sanitize()` with `USE_PROFILES: {html, mathMl, svg}` so KaTeX's
MathML accessibility tree and Mermaid's SVG output survive sanitization
instead of being stripped as non-standard tags. "Copy HTML" and "Download
HTML" both hand out the plain converted fragment — there's no standalone
full-document wrap; Print / Save as PDF is the path for a standalone,
styled document (it builds its own print stylesheet, inlining KaTeX's CSS
when math is present).

### Mermaid labels vs. DOMPurify, and Word's clipboard quirks

Mermaid renders every node/edge label as `<foreignObject><div>...</div>
</foreignObject>` (HTML nested inside the SVG, needed for text measurement/
wrapping) — but DOMPurify hardcodes emptying anything nested inside a
`<foreignObject>` that's inside an `<svg>`, as a defense against a known
mutation-XSS namespace-confusion technique, with **no config flag to
disable it**. A plain `DOMPurify.sanitize(svg, {svg: true})` therefore
renders every diagram with correct shapes but blank labels — and this isn't
a one-time risk: `sanitizeHtml()` runs again on already-mermaid-rendered
HTML at every preview/copy/download call site, so even a diagram whose
labels survived the first pass gets re-blanked by the next sanitize call
unless every pass handles it. Both `renderMermaidDiagrams()` and
`sanitizeHtml()` route through a shared
`sanitizePreservingForeignObjectLabels()`: it sanitizes each label's HTML on
its own, outside SVG context (where DOMPurify allows `div`/`span`/`p`
normally), empties the foreignObjects before the real SVG-wide pass so it
has nothing left to wipe, then splices the cleaned label HTML back in.

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
highlightjs-11.11.1/`, ~35 common languages incl. Python bundled in one
file) plus the GitHub-light stylesheet, kicked off at widget `init()` and
awaited again after every `run()`. `highlightCodeBlocks(el)` then calls
`hljs.highlightElement()` on every `pre code` inside the **preview DOM
only** — never on `fragment`, so Raw HTML, Copy, Download, and
Print-to-PDF keep marked's plain `<pre><code class="language-python">`
untouched. This is deliberate: the tool promises the HTML you take with you
isn't opinionated about styling, so coloring only ever gets painted onto
the on-page preview, guarded by the same `_renderGen` counter pattern used
elsewhere to avoid a stale async load racing a newer edit.

- **Shared widget behavior**: the tool widget mixes in `paneResizer()`
  (defined once in `site/assets/site.js`) for the draggable horizontal
  split (`--split`, a %) and vertical pane height (`--pane-height`, px),
  plus the proportional scroll-mirroring between panes. `toolWidget()`
  spreads it in — `{ ...paneResizer(), /* page state */ }` — and needs
  `x-ref="paneRow"` on the flex-row ancestor plus the `.split-pane-left` /
  `.pane-height` CSS classes (`site/assets/input.css`) on its panes. Keep
  building on this mixin rather than re-implementing drag-resize or
  scroll-sync by hand. `paneResizer()` also carries a `stacked` boolean
  (default off), toggled by a "Stack panels" / "Side by side" button in the
  top toolbar, immediately next to the Write/Split/Preview view control
  (only shown once `view === 'split'`, since it has nothing to do outside
  that mode); the `.is-stacked` CSS class it applies forces
  `flex-direction: column` and lets the output pane's flex-basis follow its
  own content instead of `--split`, overriding the responsive side-by-side
  default regardless of viewport width. The horizontal drag divider hides
  while stacked (there's no width to drag); the vertical pane-height
  divider still works either way.
- **Shared toast/copy/export behavior**: the tool widget also mixes in
  `toolActionsMixin()` (`site/assets/site.js`) for `flash()` (the toast
  message shown after Copy/Download actions) and `copyRichClick()` (wraps
  `window.copyRich()` for the "Copy for Word / Docs" button) — spread
  alongside `paneResizer()`:
  `{ ...paneResizer(), ...toolActionsMixin(), /* page state */ }`. All of
  Copy Markdown/Copy HTML/Copy for Word/Download .md/Download HTML/Print to
  PDF live in the top toolbar too — a standalone "Copy Markdown" button
  plus an "Export" dropdown for the rest — so they're reachable without
  scrolling past the editor panes, however tall the panes are resized to.
- **Toolbar button grouping**: the formatting toolbar is split into three
  labeled clusters so it's clear which buttons act on the current selection
  versus which insert new content: **Format** (Bold/Italic/Strikethrough/
  Inline code/Link — `wrapSelection()`, wraps the selection or inserts a
  placeholder if nothing's selected), **Insert** (Bullet/Numbered/Task
  list/Quote — `prefixLines()`/`insertNumberedList()`, applied per selected
  line; Table/Image/Horizontal rule — inserted at the cursor), and **Embed**
  (Code block/Diagram/Math dropdowns — also inserted at the cursor). Each
  button's tooltip spells out which behavior it uses.
- **Import mechanism**: HTML and CSV/JSON aren't separate tools anymore —
  they're "Import" actions inside the same widget. Import-from-HTML runs
  the pasted/uploaded HTML through `TurndownService` (+ `turndown-plugin-gfm`
  for tables), lazy-loaded via `ensureTurndownLoaded()` (same
  memoized-promise pattern as `ensureHljsLoaded()`). Import-from-CSV/JSON
  runs the input through PapaParse (CSV) or `JSON.parse()` (JSON), then
  `rowsToMdTable(header, rows, align)` — a padded, alignment-aware,
  `|`/newline-escaping Markdown table generator, also in `site.js`. Both
  import paths insert their result at the cursor in the main Markdown
  buffer (never replace the whole buffer) — the buffer autosaves to
  localStorage, so a silent full-buffer replace on an accidental Import
  click would be the single worst way to lose a draft.
- **Build**: `build.py` expands the two shared partials
  (`site/partials/header.html`, `site/partials/footer.html`) into every
  page, substitutes site-wide tokens (`__SITE_URL__`, `__SITE_NAME__`,
  `__GITHUB_URL__`, `__YEAR__`), generates `sitemap.xml` + `robots.txt`, and
  validates each built page (title present, canonical present, exactly one
  `<h1>`, no leftover unsubstituted tokens).

## Known gaps (tracked, not hidden)

- **`SITE_URL`/`GITHUB_URL` in `build.py` are placeholders** until the repo
  has a real GitHub remote and (if used) a custom domain — update both in
  one place once that's decided.
- **GitHub Pages base path is unresolved.** If this ends up served at
  `https://<owner>.github.io/<repo>/` rather than a custom domain or a
  `<owner>.github.io` root repo, every root-relative path in this codebase
  (`/assets/site.css`, `/about/`, …) needs a base-path prefix to resolve.
  Settle this — a custom domain (`CNAME`) is the simplest fix — before the
  first real deploy.
- **`build.py`'s "exactly one `<h1>`" check is a naive text search**, not
  parsed HTML — it also matches a literal `<h1` substring anywhere in the
  file, including inside a page's own JS sample-content string. Any sample
  input embedded in a `<script>` block that itself contains HTML markup
  needs that substring broken up (e.g. `'<h' + '1>...'`) or the build fails
  validation.

## Where things live

Feature ideas and roadmap discussion happen as GitHub Issues, not a
versioned file — there's no keyword map to consult anymore.
