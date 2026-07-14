<!-- docs-sync: b565092 -->

# Changelog

## [Unreleased]

### Added
- CSV to Markdown table converter (`/csv-to-markdown-table/`): Tier 2 page targeting "csv to markdown table" / "excel to markdown table", CSV/JSON tab toggle over a single input pane, alignment dropdown (left/center/right, written as colon syntax) and a first-row-is-header checkbox for CSV, Raw/Rendered toggle, Copy Markdown / Download .md / Copy-for-Word-Docs actions; added to the homepage (`b565092`)
- Vendored PapaParse 5.4.1 for client-side CSV parsing, lazy-loaded on first conversion via `ensurePapaParseLoaded()` — pinned version, no CDN hotlinking (`b565092`)
- Shared `rowsToMdTable()` helper in `site.js`: padded, alignment-aware Markdown table generation from a header + rows, reusable by future table-source pages (`b565092`)
- HTML to Markdown converter (`/html-to-markdown/`): Tier 2 page targeting "html to markdown" / "convert html to md", split-pane widget with a Raw/Rendered toggle and bullet-marker / code-block-style / heading-style options, Copy Markdown and Download .md actions; links both directions with `markdown-to-html`, added to the homepage and header nav (`cf9bbf6`)
- Vendored turndown 7.2.0 and turndown-plugin-gfm 1.0.2 — pinned versions, no CDN hotlinking (`cf9bbf6`)
- Static-site build pipeline: `site/` → `build.py` → `dist/`, with shared header/footer partials, site-wide token substitution, sitemap.xml/robots.txt generation, and per-page validation (`342649d`)
- Vendored Alpine.js, marked, and DOMPurify — pinned versions, no CDN hotlinking (`342649d`)
- Homepage, `/about/`, `/privacy/`, and `404.html` (`342649d`)
- Markdown to HTML converter (`/markdown-to-html/`): full SEO anatomy (meta, canonical, JSON-LD `SoftwareApplication` + `FAQPage`), resizable split-pane widget with synced line-number gutters, proportional scroll sync between panes, a Raw/Rendered HTML toggle, and Copy / Copy-for-Word / Download actions (`342649d`)
- Internal MkDocs wiki and `docs/keyword-map.md`, seeded from the `seo-tool-pages` skill (`342649d`)
- Markdown editor (`/markdown-editor/`): full SEO anatomy targeting "markdown editor online" / "markdown preview online", a Write/Split/Preview toggle, a resizable split-pane widget with a line-number gutter, a formatting toolbar with keyboard shortcuts, word/character/reading-time counts, localStorage autosave with restore-on-load and an explicit Clear action, and Copy / Copy-for-Word / Download .md / Download HTML / Print-to-PDF export (`fc2d000`, `40007d2`)
- Three opt-in Markdown extensions on both `markdown-to-html` and `markdown-editor`, sharing one `convertMarkdown()` pipeline in `site.js`: smart typography (curly quotes/dashes), KaTeX-rendered `$inline$`/`$$block$$` math, and Mermaid diagram fences — all lazy-loaded only when enabled and applied consistently across preview, raw/copy/download, rich clipboard, and print-to-PDF (`87f7e10`)
- Vendored KaTeX 0.17.0 and Mermaid 11.16.0 — pinned versions, no CDN hotlinking (`87f7e10`)
- GitHub-style syntax highlighting for fenced code blocks (Python and ~35 other common languages) in the live preview on `markdown-to-html` and `markdown-editor`, via vendored highlight.js 11.11.1 — lazy-loaded and preview-only, so Raw HTML, Copy, Download, and Print-to-PDF keep marked's plain `language-*` class untouched (`120944c`)
- Auto-detection of math/diagram syntax on `markdown-editor` (no manual toggle needed) and a widened widget layout (`90a5f08`)
- Toolbar buttons for inline code, strikethrough, image, task list, table, and horizontal rule on `markdown-editor`, closing the gap against the rest of GFM that `marked` already rendered but had no one-click insert for (`4e1cafd`)
- "Stack panels" / "side by side" toggle for both tool widgets' two-pane layout, via a `stacked` flag added to the shared `paneResizer()` mixin and an `.is-stacked` CSS override — lets the output pane sit below the input instead of beside it, overriding the responsive default regardless of viewport width (`e79e98e`)

### Changed
- Extracted the draggable split-pane / pane-height / scroll-mirroring logic into a shared `paneResizer()` mixin in `site.js`; both tool widgets now use it instead of each re-implementing it (`40007d2`)
- Default sample Markdown on `markdown-editor` and `markdown-to-html` now exercises nearly every rendered feature on first load — strikethrough, an inline image (embedded as a data URI, no network request), KaTeX inline/block math, and a Mermaid diagram, alongside the existing headings, lists, task list, table, blockquote, and code fence (`6b28765`)
- Extracted `flash()`, `copyRichClick()`, and `wrapDocument()` — previously duplicated identically on `markdown-editor` and `markdown-to-html` — into a shared `toolActionsMixin()` in `site.js` (`50b5c7f`)
- `markdown-editor` toolbar's single "H" button (always inserted `## `) replaced with a Paragraph/H1-H6 dropdown that reflects the current line's heading level as the cursor moves and swaps the leading `#`s cleanly instead of stacking a new prefix on each click (`24f5030`)

### Fixed
- Both tool widgets failed to render (panes stuck collapsed, no toolbar) because `site.js` — which defines `paneResizer()`, called at `x-data` construction time — loaded after Alpine's core script, which boots synchronously as soon as it runs; reordered the `<script defer>` tags so `site.js` executes first (`da4e649`)
- `markdown-editor` toolbar's Task button carried a lone emoji icon inconsistent with every other plain-text button, and task-list items rendered a disc bullet alongside the checkbox; toolbar label made plain text and `.md-preview li:has(> input[type="checkbox"])` now suppresses the marker (`0ff72fd`)
- Default sample Markdown/HTML on both tool widgets dropped a placeholder `![Sample screenshot](data:image/svg+xml,...)` line that added visual noise without demonstrating anything the KaTeX/Mermaid samples didn't already cover (`417a180`)
- Both tool widgets' right-hand preview pane could be pushed outside its container by wide content (long unbroken tokens, wide tables) because the flex panes lacked `min-width: 0`; added `min-w-0` to both panes, `overflow-wrap: anywhere` on `.md-preview`, and made preview tables scroll internally instead of forcing the layout wider (`710b606`)
- "Copy for Word / Docs" pasted Mermaid diagrams as nothing at all — Word's clipboard-HTML importer silently drops inline `<svg>`; `copyRich()` now rasterizes each diagram to a PNG `<img>` instead (`1f69995`)
- `markdown-editor`'s textarea showed the browser's default UA focus outline as a bold black border, redundant with the wrapper's existing focus-within border (`59e47f6`)
- Mermaid diagram labels rendered blank everywhere (preview, copy, download), not just in Word — DOMPurify hardcodes emptying `<foreignObject>` content nested in `<svg>` (an XSS defense with no opt-out), which is how Mermaid renders label text; added `sanitizePreservingForeignObjectLabels()`, used by both `renderMermaidDiagrams()` and the shared `sanitizeHtml()` (`1f69995`)
- The new Word-copy PNG export silently fell back to a plain-text copy on any diagram with real label text — drawing an SVG containing `<foreignObject>` onto a `<canvas>` taints it, blocking `toDataURL()`; `flattenForeignObjectLabels()` now flattens labels to plain SVG `<text>` for that export path only (`1f69995`)
- `~~strikethrough~~` pasted into Word as a tracked-change deletion/comment instead of struck-through text — Word's importer maps marked's `<del>` tag to its own revision markup; the Word clipboard path now swaps it for `<s>` via `neutralizeTrackedChangeTags()`, while raw/download HTML keeps `<del>` (`1f69995`)
