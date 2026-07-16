# Markdown Online — Internal Wiki

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
- **Shared header nav** (`site/partials/header.html`) is included on every
  page, including `/editor/` itself — its "Open Editor" link is scoped-CSS
  hidden there (`#page-editor #nav-open-editor{display:none}`, set inline in
  `site/editor/index.html`'s `<head>`) rather than branched out of the shared
  partial, since it's a plain SSI-style include with no templating.
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
  the Pines UI), `site/assets/theme.js` (the dark-mode toggle — see below),
  `site/assets/dbml.js` (the native DBML-to-SVG diagram renderer — see
  below; first-party code, but lazy-loaded like the vendored libraries since
  most visitors never trigger it),
  `site/assets/vendor/` (pinned Alpine.js, marked, DOMPurify, KaTeX, Mermaid,
  highlight.js — light **and** dark stylesheets — turndown,
  turndown-plugin-gfm, PapaParse — vendored locally, no CDN hotlinking in
  production).
- **Icons**: Lucide, inlined as static `<svg>` markup (not the JS runtime),
  so icons stay themeable via `currentColor`/Tailwind classes and keep
  working with JavaScript disabled. Reference/source copies of each icon
  used on the site live in `site/assets/vendor/lucide/`. One exception: the
  header/footer GitHub link uses the GitHub brand mark (a fill-based path,
  not a Lucide stroke icon) since Lucide doesn't ship brand logos.

## Markdown extensions (smart typography, math, diagrams)

The tool's conversion pipeline is one shared function —
`convertMarkdown(input, opts)` in `site/assets/site.js`. Smart typography and
GFM line breaks (`breaks: true`, single newlines render as `<br>`) are both
always on — there's no toggle, since neither is worth exposing as a decision
the user has to make; math and diagrams auto-enable themselves —
`autoEnableRichFeatures()` scans the input for `$inline$`/`$$block$$` math, a
` ```mermaid ` fence, or a ` ```dbml ` fence, and lazy-loads KaTeX/Mermaid/
`dbml.js` the moment that syntax appears, rather than requiring the user to
flip a checkbox first (Mermaid alone is ~3.5MB minified, so nothing
downloads it unasked). Once auto-enabled for a session, a feature stays on
even if the triggering syntax is later deleted.

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

## Database schema diagrams (DBML)

A ` ```dbml ` fence renders as a live entity-relationship diagram, the same
way ` ```mermaid ` does — but it is **not** a translation into Mermaid's
`erDiagram` grammar. That grammar is narrower than DBML (no enums as boxes,
no notes, no indexes/table groups, entity names restricted to a plain
identifier charset), so squeezing a parsed DBML AST through it would lose
real information from what the user wrote. Instead `site/assets/dbml.js` is
a small first-party module (lazy-loaded like the vendored libraries, via
`ensureDbmlLoaded()`) that owns the whole pipeline itself:

- **Parser** — a hand-written subset parser, not `@dbml/core` (its `lib/` is
  ~37MB uncompiled with no browser/UMD bundle, which would fight the site's
  "dependency-light, no bundler" constraint). Handles `Table`/`Enum`/`Ref`
  blocks (both multi-line and single-line, comma-packed columns like
  `id int [pk], name varchar`), inline column refs (`[ref: > users.id]`),
  `note:`/`default:` settings, and comments. Nesting is tracked by
  annotating every line with its brace depth in one pass
  (`annotateDepths()`) rather than hand-counting braces at each call site —
  that's what lets a nested `indexes { ... }` block inside a `Table` get
  skipped cleanly without misreading its lines as columns. Unsupported by
  design, and skipped rather than mis-rendered: composite (multi-column)
  refs/PKs, `TableGroup`, `Project` settings, quoted identifiers containing
  spaces.
- **Layout** — force-directed (Fruchterman-Reingold style): circular-radius
  repulsion between every node pair, a spring pulling ref-connected tables
  together, a centering pull strong enough (`0.15` per iteration) to stop
  weakly-connected tables drifting off to infinity over 250 iterations, then
  an AABB overlap-cleanup pass since the circular approximation can still
  leave two very-non-square boxes overlapping. An enum gets a soft
  layout-only edge toward any table whose column uses it as a type (weight
  `1.1`, no line drawn — DBML doesn't model "uses this enum" as a `Ref`), so
  it settles near its users instead of landing wherever repulsion happens to
  push it. The `+90` clearance term in the repulsion's `minSep` isn't
  arbitrary: two boxes linked by one strong edge otherwise converge close
  enough that the crow's-foot marker pair at each end visually crams
  together.
- **Drawing** — plain SVG built via `document.createElementNS` +
  `.textContent` (never string-concatenated HTML), so table/column/enum/note
  text is inert against injection by construction; `renderDbmlDiagrams()` in
  `site.js` still runs the output through `DOMPurify.sanitize(svg,
  {USE_PROFILES:{svg:true, svgFilters:true}})` as defense in depth, same as
  every other render site. No `<foreignObject>` is used (labels are plain
  SVG `<text>`), which sidesteps the whole
  `sanitizePreservingForeignObjectLabels()` dance Mermaid needs. Crow's-foot
  cardinality comes straight from the DBML operator — `>` many-to-one, `<`
  one-to-many, `-` one-to-one, `<>` many-to-many — with no invented
  optionality (no zero-vs-one distinction), since DBML itself doesn't encode
  that.
- **Errors** render as the same `.mermaid-error` box Mermaid failures use
  (e.g. no `Table` block found at all) — no new CSS needed since the visual
  output (a diagram or an error box inside `.mermaid-diagram`/
  `.mermaid-error`) is the same shape either way.
- **Theme** — colors are baked into the SVG at render time (like Mermaid),
  so the editor's `themechange` listener re-runs the conversion pipeline
  when `opts.dbml` is on, same as it does for Mermaid.

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
  are conversions from a foreign format, so they insert their result at the
  cursor in the main Markdown buffer rather than replacing it — the buffer
  autosaves to localStorage, so a silent full-buffer replace on an
  accidental Import click would be the single worst way to lose a draft.
  The third Import option, "Open Markdown file…", is different on purpose:
  a `.md`/`.markdown`/`.txt` file is already the target format, so
  `onOpenMarkdownFile()` skips the conversion step entirely and loads it as
  the document — it replaces the whole buffer (`confirm()`-gated whenever
  the current buffer is non-empty, since this is the one Import path that's
  actually destructive to an in-progress draft) instead of inserting at the
  cursor like the other two. It's wired as a hidden `<input type="file">`
  triggered programmatically (`$refs.mdFileInput.click()`) rather than a
  modal, since there's nothing to configure — no bullet-marker/heading-style
  options like HTML import has.
- **Build**: `build.py` expands the two shared partials
  (`site/partials/header.html`, `site/partials/footer.html`) into every
  page, substitutes site-wide tokens (`__SITE_URL__`, `__SITE_NAME__`,
  `__GITHUB_URL__`, `__YEAR__`), generates `sitemap.xml` + `robots.txt`, and
  validates each built page (title present, canonical present, exactly one
  `<h1>`, no leftover unsubstituted tokens).
- **Hosting**: GitHub Pages project site at
  `https://raphael2692.github.io/markdown-online/` (no custom domain), built
  by `.github/workflows/deploy.yml` on every push to `main`. Because it's a
  project site rather than a domain root, every page in this repo is written
  with root-relative paths (`/assets/site.css`, `/about/`, …) that need a
  `/markdown-online` prefix to resolve — `build.py`'s `BASE_PATH` constant
  rewrites `href`/`src`/`action` attributes at build time via
  `apply_base_path()`. `site/assets/site.js` isn't touched by that HTML-only
  rewrite, so its lazy-loaded vendor scripts (KaTeX, Mermaid, PapaParse,
  Turndown, highlight.js) instead derive the prefix at runtime from the
  script's own `src` (`ASSETS_BASE`, top of the file) — if a custom domain
  or root repo replaces this setup, set `BASE_PATH = ""` and `ASSETS_BASE`
  resolves to `""` automatically.

## Preview zoom, pan, and fit-to-view

The rendered preview (`x-ref="preview"`) is a fixed-size, both-axes
`overflow-auto` viewport wrapping a second element, `x-ref="previewInner"`
(the one carrying the `.md-preview` class), and `run()` writes
`sanitizeHtml(fragment)` into `previewInner`, not into the scrolling
viewport itself. Zoom is applied as an inline `style="zoom: …"` on
`previewInner` alone — CSS `zoom` (not `transform: scale()`) so text
actually reflows at the new size like native browser zoom, and because it
changes the subtree's real layout size, the *outer* viewport's
`overflow-auto` naturally grows scrollbars once zoomed content no longer
fits, with no manual width/height bookkeeping. Keeping zoom off the
scrolling element itself avoids the box that reports its size to
`paneResizer()`'s scroll-mirroring (`mirrorScroll()`, keyed off
`scrollHeight`/`clientHeight`) from being the same box being magnified.

- **Controls**: a floating pill (`position: absolute`, bottom-center via
  `left-1/2 -translate-x-1/2`) inside the pane's non-scrolling wrapper —
  zoom out / percentage (click to reset
  to 100%) / zoom in, then a fit-to-view button and a hand-tool toggle.
  Zoom steps by 10, clamped to 25–400% (`zoomMin`/`zoomMax`/`ZOOM_STEP` in
  `toolWidget()`).
- **Zoom to fit** (`zoomToFit()`) reads `previewInner.scrollWidth/Height`,
  divides out the *current* zoom factor to recover the unzoomed ("natural")
  content size, then scales to the smaller of the width/height ratios
  against the viewport's padding-adjusted `clientWidth`/`clientHeight`.
  Since normal text already reflows to the container's width, this is
  mostly a vertical fit in practice — it's for the case where a wide table,
  long Mermaid/DBML diagram, or tall document would otherwise need
  scrolling to see in full.
- **Hand tool** (`panMode`) reuses the same drag-tracking idiom as
  `paneResizer()`'s `startDrag()`/`startVDrag()` (mousedown/touchstart →
  document-level move/up listeners), just writing `scrollLeft`/`scrollTop`
  on the viewport instead of a CSS custom property. While active,
  `previewInner` gets `pointer-events: none` so a mousedown anywhere over
  rendered content (a link, a checkbox) falls through to the viewport's own
  handler and pans instead of following the link or starting a text
  selection.

## Dark mode

A header toggle (`#theme-toggle`, in `site/partials/header.html`, so it's on
every page) flips a `.dark` class on `<html>`. Tailwind's `dark:` variant is
remapped in `site/assets/input.css` to key off that class
(`@custom-variant dark (&:where(.dark, .dark *));`) rather than the default
`prefers-color-scheme` media query, so the toggle can override the OS
setting — every color utility across the site (and the two hand-rolled
non-Tailwind stylesheets, `.md-preview`'s inline styles and the Mermaid
error box) has a `dark:`/`.dark` counterpart.

- **No flash of the wrong theme**: `site/partials/theme-init.html` is
  included at the very top of every page's `<head>`, before the stylesheet
  link. It's a small inline (not deferred) `<script>` that reads
  `localStorage.getItem('theme')`, falls back to
  `matchMedia('(prefers-color-scheme: dark)')` if nothing's stored, and
  toggles the `.dark` class immediately — synchronously, before the parser
  reaches `<body>`, so there's nothing to flash.
- **The toggle itself** lives in `site/assets/theme.js`, deferred and loaded
  on every page (not just `/editor/`) since the button is in the shared
  header. Clicking it writes the explicit choice to `localStorage` and
  dispatches a `themechange` `CustomEvent` on `document`. Until the user
  makes an explicit choice, a `matchMedia` change listener keeps following
  the OS setting live. The sun/moon icons swap via plain `dark:hidden` /
  `dark:block` on the two SVGs — no icon-swapping JS needed.
- **Generated content follows the theme too**, which needs more than a CSS
  swap since two of the three lazy-loaded rich features bake colors in at
  render/highlight time rather than referencing them via a stylesheet:
  - **Mermaid diagrams** bake their theme's colors directly into the
    rendered SVG's attributes, so a `themechange` listener isn't enough by
    itself — `toolWidget()` (in `site/editor/index.html`) listens for the
    event, awaits `syncMermaidTheme()` (re-runs `mermaid.initialize()` with
    `theme: 'dark'`/`'default'`, from `site.js`), then calls `run()` again to
    regenerate every diagram currently on screen. The explicit `await`
    matters: it's what guarantees `mermaid.initialize()` lands before the
    regenerated `mermaid.render()` calls, rather than relying on two
    separate `themechange` listeners (this one and site.js's own, below)
    firing in a particular order.
  - **highlight.js** code coloring is plain CSS classes
    (`hljs-keyword`, `hljs-string`, …) painted once by
    `hljs.highlightElement()`, so following the theme is just swapping which
    stylesheet is active — `syncHljsTheme()` (`site.js`) flips the loaded
    `<link>`'s `href` between `github.min.css` and the newly-vendored
    `github-dark.min.css` (same pinned highlight.js version). No
    re-highlighting needed.
  - **KaTeX** math needs no theme-awareness at all — its CSS already colors
    everything via `currentColor`, so it inherits `.md-preview`'s text color
    automatically.
  - A page-wide `themechange` listener in `site.js` calls both sync
    functions (as no-ops if that feature was never lazy-loaded on the
    current page).
- **Print/PDF export and the rich clipboard copy (`printPdf()`,
  `copyRich()`) intentionally stay light-only**, regardless of the on-page
  theme — both already hardcode their own print-appropriate/paste-appropriate
  styles, since they're meant to look like a printed document or a plain
  Word/Docs paste, not a mirror of the editor's on-screen theme.
- `:root { color-scheme: light; } .dark { color-scheme: dark; }` in
  `input.css` lets native form controls (checkboxes, scrollbars) pick up the
  browser's own dark rendering too.

## Known gaps (tracked, not hidden)

- **`build.py`'s "exactly one `<h1>`" check is a naive text search**, not
  parsed HTML — it also matches a literal `<h1` substring anywhere in the
  file, including inside a page's own JS sample-content string. Any sample
  input embedded in a `<script>` block that itself contains HTML markup
  needs that substring broken up (e.g. `'<h' + '1>...'`) or the build fails
  validation.

## Where things live

Feature ideas and roadmap discussion happen as GitHub Issues, not a
versioned file — there's no keyword map to consult anymore.
