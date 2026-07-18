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
  partial, since it's a plain SSI-style include with no templating. The
  header carries no About link (the About page is footer-only) — instead
  the GitHub link shows a live star counter: an inline script in the
  partial makes one unauthenticated GET to GitHub's public repo API
  (deriving the repo slug from the link's own `__GITHUB_URL__`-substituted
  href), caches the count in localStorage for 6 hours to stay far under
  the unauthenticated rate limit, formats ≥1000 as `1.2k`, and leaves the
  counter hidden if the fetch fails or is blocked. This is the one remote
  request the site makes beyond loading its own assets — it goes to the
  same organization that already serves the page (GitHub Pages), carries
  no user content, and is disclosed on the privacy page.
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
- **Layout** — deterministic, layered (Sugiyama-lite), not force-directed.
  An earlier version used a randomized force-directed (Fruchterman-Reingold)
  simulation, which for small schemas frequently left tables overlapping or
  connectors crossing through boxes — a different, sometimes-broken result
  on every render of the same source. The current `layoutGraph()` instead
  splits the graph into connected components and, within each, assigns every
  table/enum a column via BFS distance from a minimum-degree seed (seeding
  from a leaf rather than the highest-degree hub is what turns a simple
  chain into separate columns instead of collapsing a hub's neighbors into
  one column). Each column is then reordered with a few barycenter passes
  (`orderColumns()`) against its already-fixed neighboring column to reduce
  edge crossings, and finally positioned left to right with column width/row
  height taken from actual box sizes — no overlap is possible by
  construction, so there's no separate cleanup pass. Columns within a
  component are top-aligned (every column starts at the same y) rather than
  vertically centered against the tallest, so all tables originate from one
  horizontal row and grow downward. Separate connected components are then
  packed, tallest first, into vertical stacks capped at the tallest
  component's height rather than strung out in one top-aligned horizontal
  strip — a real schema is usually one big connected component plus a few
  disconnected stragglers, and the strip layout left a mostly-empty region
  under the stragglers that inflated the diagram's bounding box (and
  shrank the preview's zoom-to-fit result) for nothing. The stable
  height-descending sort plus greedy fill keeps this deterministic like
  the rest of the layout. An enum still gets a
  layout-only edge toward any table whose column uses it as a type (DBML
  doesn't model "uses this enum" as a `Ref`), so it lands in its own column
  near its users. A `Ref`'s FK column is derived from which side the DBML
  operator marks as "many" — `>` and `-`/`<>` (ambiguous cases, kept as the
  historical default) put it on the from-side, `<` reverses that onto the
  to-side (`one.col < many.col`); getting this backwards for `<` refs was a
  real bug that mislabeled the one-side as FK and left the actual FK column
  unmarked.
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
  when `opts.dbml` is on, same as it does for Mermaid. The palette
  (`colors()` in `dbml.js`) is deliberately desaturated — steel-blue table
  headers, muted-plum enum headers, softened PK/line accents, in both light
  and dark variants — after the original saturated blue/purple primaries
  read as toy-like next to dbdiagram.io's output.

## Syntax highlighting (on-page only, always on)

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

### First-party DBML and Mermaid grammars

highlight.js ships no grammar for DBML or Mermaid, but both are first-class
fence languages here, so `registerExtraHljsLanguages()` (site.js) registers
small display-grade grammars for them. Registration is **chained into
`ensureHljsLoaded()`'s ready promise** — not fired independently — so any
`ensureHljsLoaded().then(...)` caller is guaranteed the grammars already
exist. Keyword sets mirror what the first-party DBML parser (`dbml.js`)
understands and Mermaid's common cross-diagram vocabulary; the Mermaid
grammar sets `$pattern: /[\w-]+/` so hyphenated keywords like
`stateDiagram-v2` match. Class names used are only ones the vendored
github/github-dark themes actually style (notably: `.hljs-link` is *not*
styled by those themes — use `.hljs-symbol` for link-ish tokens). The DBML
grammar also tokenizes column definitions with an hljs multi-class matcher
(`begin: [...]` + `beginScope`): the column name gets `attr` (blue) and the
type `built_in` (orange) — not `type`, which the github themes color the
same red as `keyword`, erasing the distinction from `Table`/`Ref`/`Enum`.
A negative lookahead keeps block openers (`Table users {`) and `Note:`
lines on the keyword path instead of being eaten as a column.

### Write-pane highlighting (`editor-highlight.js`)

The editor's source pane is colored too, StackEdit-style, without replacing
the `<textarea>`: `site/assets/editor-highlight.js` renders a color-only
backdrop `<div class="editor-backdrop">` behind the (now
`text-transparent`, caret-colored) textarea. Key invariants and moving
parts:

- **Byte-identical text.** The backdrop's text content must equal the
  textarea value exactly — spans only wrap characters. That, plus identical
  metric classes on both layers (`font-mono text-sm leading-6 py-2 pl-12
  pr-2 whitespace-pre`, `font-variant-ligatures: none`, pinned `tab-size`),
  is what keeps the caret pixel-aligned with the colors. The hljs themes'
  bold/italic on `.hljs-strong`/`.hljs-emphasis` are reset to `inherit`
  inside `.editor-backdrop` (input.css) because bold/italic mono glyphs
  change advance widths.
- **Tokenizer.** A line-based pass (headings, quotes, HRs, list markers,
  table pipes) with a single carried fence state, plus a bounded
  one-scan inline regex (code spans, links, bold, strike, italic).
  Fence interiors go through `hljs.highlight(body, {language})` and reuse
  the same hljs theme classes as the preview; bodies are memoized on
  `(lang, body)` so unchanged blocks cost nothing per keystroke. Results
  rendered before hljs lazy-loads are *not* cached (they'd stay uncolored
  after the upgrade pass).
- **Wiring.** `EditorHighlight.attach({textarea, backdrop})` is called once
  in widget `init()`; a `$watch('input', ...)` covers every mutation path
  (typing, toolbar, undo/redo, imports, clear) with rAF-coalesced renders.
  The attach adds its own scroll listener syncing both `scrollTop` *and*
  `scrollLeft` (the pane is `wrap="off"`). A trailing U+200B sentinel keeps
  the backdrop's scrollHeight equal to the textarea's phantom last row.
- **Fallbacks.** Documents over 200 k chars flip an `overlay-off` class
  (plain, uncolored, responsive textarea); IME composition flips
  `is-composing` (textarea text visible, backdrop dimmed); lines over
  2 000 chars skip the inline pass. The gutter got `z-10` so it still
  paints above the now-`position:relative` textarea; it's styled
  "seamless" — the editor's own background plus a `border-r` divider, not
  a tinted panel — but must stay *opaque*, since horizontally scrolled
  text slides underneath it and would show through otherwise.
- **Font stack.** `input.css` overrides Tailwind's `--font-mono` via
  `@theme` to prefer developer faces the visitor has installed (JetBrains
  Mono, Fira Code, SF Mono) before the platform defaults. No webfont is
  shipped (dependency-light), the fixed `leading-6` metrics hold for any
  monospace face, and ligatures are already disabled on the editor layers
  so ligature fonts can't break caret alignment.

- **Shared widget behavior**: the tool widget mixes in `paneResizer()`
  (defined once in `site/assets/site.js`) for the draggable horizontal
  split (`--split`, a %) and vertical pane height (`--pane-height`, px),
  plus the proportional scroll-mirroring between panes. `toolWidget()`
  spreads it in — `{ ...paneResizer(), /* page state */ }` — and needs
  `x-ref="paneRow"` on the flex-row ancestor plus the `.split-pane-left` /
  `.pane-height` CSS classes (`site/assets/input.css`) on its panes. Keep
  building on this mixin rather than re-implementing drag-resize or
  scroll-sync by hand. The *initial* pane height comes from
  `fitPaneHeight()` (`site/editor/index.html`), not a flat constant: at
  `md`+ widths it sizes the pane to `innerHeight - 340px` (a rough estimate
  of header + toolbar + status bar + footer chrome), clamped to
  `[300, 1000]`px, so the whole editor (header through footer) fits one
  viewport with no scrolling the moment the page loads — the user can still
  drag it to any size afterward via the existing vertical divider. Below
  `md` the panes stack (doubling in the document), so this single-pane
  formula doesn't apply and a flat `720px` default is kept instead. The
  `.pane-height` CSS fallback in `input.css` (used for the instant before
  Alpine sets `--pane-height` inline) mirrors the same `md`+ formula via
  `calc(100vh - 340px)` — the two must stay in sync, or the pane visibly
  resizes right after load once Alpine's value overrides a mismatched CSS
  default. `paneResizer()` also carries a `stacked` boolean
  (default off), toggled by a "Stack panels" / "Side by side" button in the
  top toolbar, immediately next to the Write/Split/Preview view control
  (only shown once `view === 'split'`, since it has nothing to do outside
  that mode); the `.is-stacked` CSS class it applies forces
  `flex-direction: column` and lets the output pane's flex-basis follow its
  own content instead of `--split`, overriding the responsive side-by-side
  default regardless of viewport width. The horizontal drag divider hides
  while stacked (there's no width to drag); the vertical pane-height
  divider still works either way. The proportional scroll-mirroring is
  itself user-toggleable: a widget-level `syncScroll` boolean (default on),
  flipped by a "Sync on"/"Sync off" button next to the stack toggle (also
  split-view-only), gates the `mirrorScroll()` calls in
  `onInputScroll()`/`onPreviewScroll()` so the panes can scroll
  independently when comparing distant parts of source and preview.
- **Shared toast/copy/export behavior**: the tool widget also mixes in
  `toolActionsMixin()` (`site/assets/site.js`) for `flash()` (the toast
  message shown after Copy/Download actions) and `copyRichClick()` (wraps
  `window.copyRich()` for the "Copy for Word / Docs" button) — spread
  alongside `paneResizer()`:
  `{ ...paneResizer(), ...toolActionsMixin(), /* page state */ }`. All
  import/export/copy actions live in one right-side cluster of the top bar
  — the "Import" dropdown (Open Markdown file / from HTML / from CSV/JSON),
  a standalone "Copy Markdown" button, and the "Export" dropdown (Copy
  HTML / Copy for Word / Download .md / Download HTML / Print to PDF) — all
  in the same outlined button style, deliberately without a filled
  "primary" button among them: the three are peers, and the old heavy-fill
  Copy Markdown read as more important than Export for no reason. They're
  reachable without scrolling past the editor panes, however tall the panes
  are resized to; the toast confirmation renders inside the same cluster.
- **Toolbar button grouping**: the formatting toolbar is split into three
  labeled clusters so it's clear which buttons act on the current selection
  versus which insert new content: **Format** (Bold/Italic/Strikethrough/
  Inline code/Link — `wrapSelection()`, wraps the selection or inserts a
  placeholder if nothing's selected), **Insert** (Bullet/Numbered/Task
  list/Quote — `prefixLines()`/`insertNumberedList()`, applied per selected
  line; Table/Image/Horizontal rule — inserted at the cursor), and **Embed**
  (a plain code-fence button plus Code block/Diagram/Math dropdowns — also
  inserted at the cursor). The plain-fence button (`insertCodeFence()`) is
  the language-less sibling of the Code block dropdown: with a selection it
  wraps it in `` ``` `` fences pushed onto their own lines; with no selection it
  drops an empty fenced block and parks the cursor inside. Each button's
  tooltip spells out which behavior it uses. A "Number sections" toggle
  sits next to the paragraph-style picker: when on, `numberHeadings()`
  (`site.js`, run last in `convertMarkdown()`'s pipeline) prepends a
  hierarchical number (`1`, `1.1`, `1.2.1`, …) to every rendered `h2`
  through `h6`. The lone top-level `#` is left alone and `##` becomes
  section "1" — Markdown has no dedicated document-title style, so `#`
  conventionally plays that role, and numbering it too would read oddly.
  Numbering is display-only (applied to the rendered HTML, never written
  back into the Markdown source) and per-level independent, so a stray
  `####` with no parent `###` still gets a sane, if flat, number instead of
  throwing. It flows through every output channel that shares the
  pipeline — preview, copy-rich, download, print — identically. The
  paragraph-style picker itself previews each heading level at something
  close to its actual rendered size/weight (a `cls` field per option),
  Word-style-gallery fashion, rather than a flat list of same-sized labels.
  Pasting a URL over a selected range (`onPaste()`) wraps the selection as
  that URL's link label (`[selection](url)`) instead of overwriting it —
  gated on there being a non-empty selection and the clipboard payload
  being nothing but a bare `http(s)`/`mailto` URL (`_isUrl()`), so pasting a
  URL with nothing selected still just inserts the URL as plain text. The
  whole formatting bar is
  collapsible: a "Toolbar" chevron button in the top bar's left cluster
  flips a `toolbarOpen` boolean gating the bar's `x-show`, and the choice
  persists across visits in the `markdown-editor-ui-v1` localStorage key
  (a small JSON blob shared with the mini-map's collapsed state — separate
  from the documents' own content keys so clearing one never touches the
  other).
- **Status bar** (VS Code-style, bottom of the widget): a thin, low-contrast
  row carrying draft save/restore status on the left and, on the right,
  cursor position (`Ln n, Col n` — tracked in `updateHeadingLevel()`, which
  already resolves the caret's line for the heading dropdown), the live
  word/character counters, an LLM token estimate (`tokenCount`, the common
  ≈4-characters-per-token heuristic; deliberately an estimate, no tokenizer
  is shipped), and static `UTF-8` / `Markdown` fields. The counters used to
  float in the middle of the top bar, splitting the action buttons — the
  top bar is now strictly actions. When text is selected, the cursor-position
  field appends the selection's own word/char/token counts (computed in the
  same handler that tracks `cursorLine`/`cursorCol`, from `selectionStart`/
  `selectionEnd`) so you don't have to do the subtraction yourself.
- **Multiple documents**: the editor holds any number of named documents,
  all in localStorage. The index (doc names + active id) lives under
  `markdown-editor-docs-v1`; each document's content lives under its own
  `markdown-editor-doc-<id>` key, so the debounced autosave
  (`_persistActiveDoc()`, 500 ms after the last keystroke) rewrites one
  small key, never the whole set. A switcher dropdown (first control in
  the top bar — the document's name doubles as the editor's "title bar")
  lists documents with per-row delete, plus "Rename current…" (inline
  input, Enter/Escape) and "New document" actions. Switching flushes any
  pending autosave first (`_flushSave()`), then loads the target with a
  *fresh undo history* (`initHistory()`) — undo must never carry edits
  across documents; deleting the active document clears the pending save
  timer so the debounce can't resurrect the removed key, and deleting the
  last document recreates an empty "Untitled". The legacy single-draft key
  (`markdown-editor-draft-v1`) migrates into a named document on first
  load and is removed. "Open Markdown file…" still replaces the *current*
  document (confirm-gated), and renames it to the file's basename when the
  name is still an untouched `Untitled`/`Untitled N`. The Clear button is
  scoped to the current document.
- **Document outline**: a collapsible list of the document's ATX headings
  (`#` through `######`), built by `buildOutline()` at the end of every
  `run()`. It regex-scans `input` line by line rather than the rendered
  preview, tracking fenced code blocks (`` ``` ``/`~~~`, matching fence
  character and length) so a `#` inside a shell snippet or comment is never
  mistaken for a heading. Each entry is indented by level (14px per level
  past H1) and clicking it jumps the editor to that line
  (`gotoOutlineItem()`, the same fixed pane metrics as `gotoMinimapItem()`
  and `revealFindMatch()`). The strip hides entirely when the document has
  no headings; its collapsed state (`outlineOpen`) persists via the same
  `markdown-editor-ui-v1` key as the toolbar and mini-map. Wrapped in the
  same try/catch-and-clear pattern as `buildMinimap()` — the outline is an
  extra and must never break the preview.
- **Diagram mini-map**: a collapsible thumbnail strip under the panes,
  built by `buildMinimap()` at the end of every `run()` — one thumbnail per
  Mermaid diagram and one per *table or enum* for DBML blocks. Clicking a
  thumbnail jumps the editor to the corresponding fence/`Table`/`Enum` block
  (`gotoMinimapItem()`, using the same fixed pane metrics as
  `revealFindMatch()`); hovering shows a zoomed popover, fixed-positioned
  from the thumbnail's rect so the strip's own `overflow-x` scroll
  container can't clip it (`pointer-events: none` so it never traps the
  hover). Mermaid thumbnails reuse the SVGs already rendered into the
  preview, matching the k-th mermaid/dbml fence in the source to the k-th
  rendered `.mermaid-diagram`/`.mermaid-error` element (both lists are in
  document order); DBML tables are re-rendered individually through the
  first-party `DbmlRenderer` — cheap, and the renderer drops refs to absent
  tables rather than erroring, so a single-node render is always clean
  (`parseDbml` accepts enum-only sources for exactly this reason).
  Table/enum blocks are located by a regex/brace-depth scan
  (`_dbmlNodeSnippets()`), not the full parser, so they still get
  thumbnails when something else in the block fails to parse. The strip
  hides entirely when the document has no diagrams; its collapsed state
  persists via the same `markdown-editor-ui-v1` key as the toolbar. The
  whole build is wrapped in a try/catch that empties the map on failure —
  it's an extra, and must never break the preview. Thumbnail/popover SVGs
  scale via `.minimap-thumb svg`/`.minimap-popover svg { width/height:
  100% }` in `input.css`: the SVGs keep their `viewBox`, so this
  letterboxes (`preserveAspectRatio` "meet") instead of rendering at
  natural size.
- **Editor keyboard handling**: `onKeydown()` on the textarea covers both
  formatting shortcuts (Ctrl/Cmd+B/I/K → `wrapSelection()`) and code editing
  basics — Tab/Shift+Tab call `indentSelection()`/`outdentSelection()`
  instead of moving focus out of the pane. With no selection, Tab inserts a
  2-space indent at the cursor — unless the caret is on a list line, in
  which case the whole line is indented (nesting the item); with a
  selection, both Tab and Shift+Tab operate per line across the full
  selected range (indenting/removing up to one 2-space unit or a literal
  tab per line) and preserve the selection's relative bounds afterward.
  This matters because the pane is a plain `<textarea>`, which browsers
  otherwise treat Tab as a focus-change key — without this override,
  indenting code fences or nested lists would be impossible from the
  keyboard. Escape in the textarea closes the find bar when it's open.
- **Smart list continuation** (`onEnterKey()`): plain Enter (no modifiers,
  collapsed cursor, not mid-IME-composition) on a bullet, numbered, task
  (`- [ ]`), or blockquote line carries the marker onto the new line —
  numbered items get the next number and the *following* same-indent items
  renumber themselves (`_renumberOrderedList()`, which skips
  deeper-indented sub-items and stops at a blank line or the end of the
  list); new task items always start unchecked. Enter on an *empty* item
  removes the marker instead — pressing Enter twice is the way out of a
  list. Two guards keep it honest: the caret must sit at or past the end
  of the marker (Enter inside the marker is a plain newline), and
  `_inFence(pos)` — a ```` ``` ````/`~~~` open/close scan of everything
  above the line — disables continuation inside fenced code, where
  `- item` is code, not a list. All mutations go through the same
  `commitHistory()`-before-and-after pattern as the toolbar helpers, so
  one Enter is one undo step.
- **Find in document**: Ctrl/Cmd+F opens a floating find bar (absolute
  top-right inside the pane wrapper) instead of the browser's page-wide
  find, which can't see into a scrolled textarea. The shortcut is captured
  at the **window** level (`onGlobalKeydown()`, a `@keydown.window` binding
  on the tool section) — a textarea-scoped binding loses to the browser
  find whenever focus is on a toolbar button or nowhere at all. Native find
  stays available in preview-only view (no write pane to search) and while
  the import modal is open; the find input stops propagation of its own
  Ctrl+F so the window handler doesn't re-open over it.
  Matching is case-insensitive plain-text (`updateFindMatches()`), with an
  "N of M" counter, Enter/Shift+Enter (or the arrow buttons) cycling, and
  Escape closing. Because the pane's metrics are fixed by the highlight
  overlay's own invariants (monospace, `leading-6` = 24px lines, `py-2
  pl-12` padding, `wrap="off"`), the current match's line/column maps
  straight to pixels: `revealFindMatch()` centers it via
  `scrollTop`/`scrollLeft` arithmetic and `updateFindMark()` positions an
  amber highlight div (between backdrop and textarea, repositioned from
  `onInputScroll()`) — no DOM measurement of the text, and no third
  mirrored copy of the document. The textarea's selection is also set to
  the match without stealing focus, so closing the bar (which refocuses the
  textarea) lands with the match visibly selected. Edits made while the bar
  is open refresh the count/mark only — re-anchoring the selection there
  would fight the user's caret mid-keystroke.
  The bar's second row is **replace**: Ctrl/Cmd+H opens the bar with the
  row expanded (a chevron toggles it manually). `replaceCurrent()` swaps
  the current match for the replacement text as typed (matching stays
  case-insensitive), then re-anchors from the caret with the same
  jump-from-caret logic `openFind()` uses — which also naturally skips any
  new occurrence the replacement itself introduced; `replaceAll()` rebuilds
  the string from the match list in one pass and reports the count via the
  toast. Both wrap the edit in `commitHistory()` so a replace-all is a
  single undo step, and both defer `setSelectionRange` to `$nextTick`,
  because `x-model`'s DOM write (which resets the caret) hasn't happened
  yet at call time.
  Since the bar floats absolutely instead of taking layout space, nothing
  in normal flex sizing stops a split-drag or window resize from shrinking
  the write pane out from under it; a `.split-pane-left.has-find` CSS rule
  sets `min-width: min(28rem, 100%)` (bound to `find.open` alongside the
  existing pane classes) so `min-width` — which beats `flex-basis` in flex
  sizing — enforces the floor on every layout pass with no JS measurement.
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
- **Fit width** (`zoomToFit()`) reads `scrollWidth` off `previewInner`
  and every `.mermaid-diagram`/`pre`/`table` inside it (the max across all
  of them, not just `previewInner`), then scales so that widest content
  exactly fills the viewport's padding-adjusted `clientWidth` (floored,
  not rounded, so the result never overshoots into a horizontal
  scrollbar); content taller than the pane scrolls vertically. An earlier
  both-axes version scaled to the smaller of the width/height ratios so
  everything was visible at once — on a tall diagram in a wide pane that
  left most of the pane empty, so it was replaced with fit-to-width,
  which always uses the full horizontal space. Three things make the
  measurement less obvious than it looks. First, it happens with
  `previewInner.style.zoom` temporarily forced to `1` — the reads are
  synchronous, so nothing paints in between. `scrollWidth` inside a
  zoomed subtree is reported in the subtree's own logical units
  (only `getBoundingClientRect()` crosses out to on-screen pixels), but
  `previewInner` is an auto-width block whose *layout* width resolves to
  `viewportWidth / zoom`: measured while zoomed out, its `scrollWidth`
  inflates to exactly "whatever fits at the current zoom", which pinned the
  computed fit at the current value so the button could never scale back
  up (e.g. after widening the pane by stacking the panels). Measuring at
  100% gives the one canonical layout. (An even earlier version instead divided
  the measurements by the current zoom, which undid the zoom in the wrong
  direction and made the button zoom *in* instead of shrinking to fit.)
  Second, `previewInner.scrollWidth` alone misses an oversized diagram/
  table/code block entirely: each of those sets its own `overflow-x`, which
  means it scrolls independently instead of pushing `previewInner`'s own
  `scrollWidth` outward — its true extent only shows up by measuring the
  element itself. Third, since normal text already reflows to the
  container's width, fitting is mostly about these independently-scrolling
  elements in practice.
- **Diagram sizing and zoom**: both Mermaid and `dbml.js` diagrams render
  with an explicit, absolute `width`/`height` on the `<svg>` (dbml.js always
  did; Mermaid's own output defaults to a responsive `width="100%"` plus a
  `max-width` inline style matching its natural size, so `renderMermaidDiagrams()`
  in `site.js` overwrites both attributes from the svg's `viewBox` right
  after render). Either responsive form looks identical at the default 100%
  zoom, but it clamps the diagram's rendered size to the pane width
  regardless of the zoom level — the zoom controls scale a diagram by its
  actual rendered box, so a diagram that's already clamped to the pane has
  no room left to visibly grow or shrink. The same reasoning is why
  `.md-preview .mermaid-diagram svg` carries no `max-width` rule in
  `input.css`: `.mermaid-diagram`'s own `overflow-x: auto` is what keeps an
  oversized, unzoomed diagram from blowing out the rest of the page. The
  svg does carry `display: block; margin: 0 auto`, though: a fitted
  diagram whose aspect is taller than the pane's fills the height with
  width left over, and centering makes that leftover read as symmetric
  margins instead of a one-sided gap — auto margins collapse to zero once
  the diagram overflows, so wide diagrams still scroll from x=0.
- **Hand tool** (`panMode`) reuses the same drag-tracking idiom as
  `paneResizer()`'s `startDrag()`/`startVDrag()` (mousedown/touchstart →
  document-level move/up listeners), just writing `scrollLeft`/`scrollTop`
  instead of a CSS custom property. Vertical panning always targets the
  outer viewport, but horizontal panning walks up from the mousedown target
  to the nearest ancestor that actually overflows horizontally (a wide
  table/`pre`/diagram with its own `overflow-x`) and drags *that* —
  markdown text reflows to fit the pane width, so the viewport itself
  almost never has horizontal overflow to move. After a real drag (>3px), a
  one-shot capture-phase click handler swallows the click so dragging
  across a link doesn't also navigate; `previewInner` gets `select-none`
  while the tool is active so drags don't start text selections.

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
- **The palette itself matches VS Code's built-in "Light 2026"/"Dark 2026"
  themes exactly**, not an arbitrary Tailwind gray/indigo scale. Named
  `--color-vsc-*` tokens (canvas, surface, border, fg, muted, accent,
  accent-hover, button, button-hover, code-bg, quote-bg) are declared in the
  `@theme` block of `site/assets/input.css`, each a light/dark hex pair
  copied from VS Code's `2026-light.json`/`2026-dark.json` theme files
  (`editor.background`, `textLink.foreground`, `textCodeBlock.background`,
  etc.), and used as ordinary Tailwind utilities (`bg-vsc-canvas
  dark:bg-vsc-canvas-dark`, `text-vsc-accent dark:text-vsc-accent-dark`, …)
  across every page plus the hand-rolled `.md-preview` rules. Syntax
  highlighting needed no change to match: VS Code's Dark 2026/Light 2026
  themes inherit their `tokenColors` from `dark_modern`/`light_modern`,
  which are byte-identical to the GitHub Dark/Light color scheme — and this
  site already ships exactly `github-dark.min.css`/`github.min.css` for
  highlight.js (see above), so the write pane and preview's code coloring
  already matched before this palette work started.

## Confirmation dialogs and the shortcuts cheat sheet

- **No `window.confirm()`/`alert()` anywhere in the editor.** Destructive
  actions — delete a document, clear the current draft, replace a document
  via "Open Markdown file" over unsaved content — go through
  `confirmDialog(message, opts)`, a small promise-based helper on the
  `toolWidget()` component (`site/editor/index.html`). It sets a shared
  `confirmState` object (`open`, `title`, `message`, `confirmLabel`,
  `danger`, `resolve`) and awaits the user's choice; a teleported modal
  (cloned from the existing shortcuts/import dialog markup — same overlay,
  transitions, and `x-trap` focus handling) resolves the promise true/false
  from its Cancel/Confirm buttons. Call sites just `await this.confirmDialog(...)`
  in place of the old `if (!confirm(...))` guard. `danger: true` (the
  default) renders a red confirm button for anything that discards content;
  pass `danger: false` for a neutral one if a future non-destructive
  confirmation needs this same plumbing.
- **Keyboard shortcuts cheat sheet**: `?` (outside a text field/textarea)
  opens a modal listing the editor's shortcuts (`shortcutsOpen`,
  `shortcutList` getter), also reachable from a toolbar button. `Ctrl/Cmd+S`
  is caught globally and shows a "already saved locally" toast instead of
  letting the browser pop its native save-page dialog — autosave already
  persists every edit to `localStorage`, so the shortcut has nothing left
  to do but reassure the user.

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
