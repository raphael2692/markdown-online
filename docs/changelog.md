<!-- docs-sync: 1c36dc2 -->

# Changelog

## [Unreleased]

### Added
- Status bar reports word/char/token counts for the current selection alongside cursor position (`1c36dc2`)
- Document outline: a collapsible list of the document's headings above the diagram mini-map — indented by level, click a heading to jump the editor to it; skips headings inside fenced code blocks (`93550d2`)
- Smart list continuation: Enter carries bullet/numbered/task/blockquote markers onto the next line (ordered lists renumber themselves, task items start unchecked), Enter on an empty item exits the list, Tab nests the list item under the caret; disabled inside fenced code blocks (`4195d89`)
- Find & replace: the find bar gains a collapsible replace row (Ctrl/Cmd+H opens it directly) with replace-current and replace-all — case-insensitive matching, one undo step per action (`4195d89`)
- Multiple documents: a toolbar switcher creates, renames, switches, and deletes named documents, each autosaved to its own localStorage key; the previous single draft migrates automatically, and opening a `.md` file names an untouched "Untitled" document after it (`4195d89`)
- GitHub star counter in the header, inside the repository link — fetched once from GitHub's public API, cached in the browser for 6 hours, hidden if the request fails; disclosed on the privacy page (`895f1fe`)
- Collapsible formatting toolbar: a "Toolbar" chevron button in the top bar hides/shows the whole formatting row, and the choice persists across visits (`408ecba`)
- Diagram mini-map: a collapsible thumbnail strip under the editor panes with one thumbnail per Mermaid diagram and one per table for DBML schemas — click a thumbnail to jump the editor to its code block, hover for a zoomed-in popover preview (`408ecba`)
- Status bar at the bottom of the widget (VS Code-style): cursor line/column, live word/character/estimated-token counts, and encoding, plus the existing draft save/restore status (`408ecba`)
- Find in the editor: Ctrl/Cmd+F anywhere on the editor page (captured at window level so it wins over the browser's page find; native find remains in preview-only view and the import modal) opens a floating find bar — case-insensitive matching with an "N of M" counter, Enter/Shift+Enter cycling, Escape to close, and a highlight painted over the current match via the pane's fixed monospace metrics (no third mirrored copy of the document) (`b254105`)
- Scroll-sync toggle in split view: a "Sync on"/"Sync off" button next to the stack-panels toggle enables/disables the proportional scroll mirroring between the write and preview panes (`b254105`)
- LLM token estimate in the status counters, alongside words and characters, using the common ≈4-characters-per-token heuristic (`b254105`)
- Plain code-fence toolbar button: wraps the selection in `` ``` `` fences pushed onto their own lines, or inserts an empty fenced block with the cursor inside when nothing is selected (`b254105`)
- DBML fences now colorize column definitions distinctly — column name blue, type orange, keywords red — in the write pane's highlighting (`9b17c66`)

### Changed
- The About link was removed from the header nav — the About page remains reachable from the footer (`895f1fe`)
- Import, Copy Markdown, and Export are now one consistently-styled actions cluster on the right of the top bar (Copy Markdown loses its heavy fill — the three are equal-weight peers), and the document statistics moved out of the top bar into the new status bar (`408ecba`)
- Editor line-number gutter is now seamless — same background as the text area with a subtle divider line instead of a tinted panel — and the monospace stack prefers locally installed developer fonts (JetBrains Mono, Fira Code, SF Mono) before the platform defaults (`408ecba`)
- The preview's fit button is now fit-to-width: it scales the widest content to fill the pane's full width, with taller content scrolling vertically, instead of shrinking everything to be visible at once — which on a tall diagram in a wide pane left most of the pane empty (`823cb22`)
- DBML diagram palette desaturated to a more professional look: steel-blue table headers, muted-plum enum headers, and softened primary-key/relationship-line accents, in both light and dark themes (`9b17c66`)

### Fixed
- The write pane no longer shrinks the find/replace bar off the edge of a narrowed split pane — the pane now enforces a minimum width while the bar is open (`1c36dc2`)
- DBML enum values (bare identifiers inside an `Enum { ... }` block) are now syntax-colored in the write pane like column names, instead of rendering as plain text (`ebc5f59`)
- The diagram mini-map now shows DBML enums as thumbnails alongside tables — the snippet scanner matches `Enum` blocks and the renderer accepts enum-only sources (`ebc5f59`)
- Diagrams narrower than the preview pane now center horizontally instead of hugging the left edge, so the width left over after zoom-to-fit on a taller-than-pane diagram reads as symmetric margins rather than a one-sided gap; diagrams wider than the pane scroll from the left exactly as before (`60e387b`)
- Preview zoom-to-fit now measures the content at 100% zoom, so pressing it while zoomed out (or after resizing/stacking the panes) scales back up to fill the pane instead of sticking at the current zoom; the fitted value is floored so it never overshoots into a scrollbar. DBML diagrams with several disconnected table groups also pack those groups into height-capped vertical stacks instead of one long top-aligned strip, removing the dead space that made the fitted diagram needlessly small (`8a1c9aa`)
- DBML diagram columns are now top-aligned within a component instead of vertically centered, so tables originate from the same row; the preview's hand tool now pans the actual horizontally-overflowing element (a wide table/code block/diagram) instead of the viewport, which markdown text never overflows, and no longer follows a link when a drag ends on one (`11ed7d2`)
- Write-pane syntax highlighting: the editor's source pane now colors Markdown structure (headings, lists, quotes, tables, links, emphasis) and fenced-code interiors as you type, StackEdit-style, via a color-only backdrop div behind the (transparent-text) textarea — no new vendored editor library; fence interiors reuse the lazy-loaded highlight.js with per-fence memoization, and documents past 200k chars fall back to a plain textarea. Also registers first-party display-grade highlight.js grammars for DBML and Mermaid, so those fences colorize in the preview and exports-preview everywhere hljs runs (`4e0578a`)
- Tab/Shift+Tab now indent/outdent in the write pane instead of moving focus off the textarea — with no selection, Tab inserts a 2-space indent at the cursor; with a selection, both keys apply per line across the full selected range and keep the selection anchored afterward (`fc0a635`)
- "Open Markdown file…" option in the editor's Import dropdown: loads a
  `.md`/`.markdown`/`.txt` file from disk straight into the document via a
  native file picker. Unlike the HTML/CSV imports, which convert a foreign
  format and insert the result at the cursor, this replaces the whole
  buffer (confirming first if the current draft is non-empty) since a
  Markdown file needs no conversion (`e142a0c`)
- Zoom, pan, and fit-to-view in the rendered preview: a floating control pill with zoom in/out (10% steps, 25–400%), click-to-reset percentage, a fit-to-view button that scales content to fit the visible pane, and a hand-tool toggle to drag-pan instead of scrolling (`3f11610`)
- Native DBML support: a ` ```dbml ` fence auto-renders as a live entity-relationship diagram (auto-detected the same way Mermaid is), via a new first-party, lazy-loaded renderer (`site/assets/dbml.js`) rather than a translation into Mermaid's narrower `erDiagram` grammar — a hand-written parser for the practical DBML subset, force-directed auto-layout, and a hand-drawn SVG renderer with real crow's-foot connectors, enums, notes, and PK/FK/UK badges. Adds a "Database schema" entry to the editor's Diagram toolbar dropdown (`acf5050`)
- Dark mode: a header toggle on every page, persisted via `localStorage` (falling back to OS preference) and applied before first paint to avoid a flash of the wrong theme. The editor's generated content follows the theme too — Mermaid diagrams re-render under Mermaid's own dark theme and highlight.js code blocks swap to a vendored `github-dark` stylesheet — while Print/PDF export and the rich clipboard copy intentionally stay light-only (`5a41c38`)

### Fixed
- DBML diagram layout replaced with a deterministic, layered algorithm — the previous randomized force-directed layout frequently left tables overlapping or connectors crossing through boxes, especially on small schemas. Also fixes FK badges being attributed to the wrong side of a `<` ref (the one-side was mislabeled FK while the actual FK column went unmarked) (`1569d9a`)
- Preview zoom in/out and "zoom to fit" had no visible effect on Mermaid/DBML diagrams wider than the pane — a `max-width:100%` rule (and, for Mermaid, its own equivalent inline sizing) pinned every diagram's rendered size to the pane width regardless of zoom. Zoom to fit's measurement was also fixed — it read the wrong element and undid the zoom in the wrong direction, so clicking it could zoom in instead of shrinking to fit (`54022a9`)
- Preview zoom toolbar repositioned from bottom-left to bottom-center (was clipped/overlapping the pane's scrollbar when tried at bottom-right); word/character/reading-time counter in the top toolbar gained right margin so it no longer crowds the "Copy Markdown" button (`430d57f`)
- Header nav no longer shows an "Open Editor" link while already on the editor page (`5f5de07`)
- Header's GitHub link now uses the actual GitHub brand mark instead of a generic external-link arrow icon (`13fcb51`)
- Markdown input placeholder now mentions pasting as an alternative to typing, not just "Start writing Markdown…" (`5cb87fd`)

### Changed
- Rebranded the product from "Markdown Tools" to "Markdown Online" across every site-facing surface: `build.py`'s `SITE_NAME` (which drives About/Privacy/404/header/footer via the `__SITE_NAME__` token), the landing page's title/`og:title`/H1 and both JSON-LD `SoftwareApplication` names, `README.md`, and the internal wiki's title (`docs/index.md`, `mkdocs.yml`) (`d9eec37`)
- `build.py` now targets the real GitHub Pages project site (`SITE_URL`/`GITHUB_URL` for `raphael2692/markdown-online`) and rewrites root-relative `href`/`src`/`action` attributes with a `/markdown-online` base path at build time; `site.js`'s lazy-loaded vendor scripts derive the same prefix at runtime from their own script `src` (`32260df`)

### Removed
- "Line breaks as `<br>`", "Full HTML document", and "Smart typography" checkboxes on the editor — smart typography and GFM line breaks are now always applied instead of opt-in, and "Copy HTML"/"Download HTML" no longer offer a standalone full-document wrap (`wrapDocument()` removed); Print/Save as PDF remains the path to a standalone, styled document (`1627767`)

### Changed
- Removed the redundant "Math and diagrams render automatically…" hint bar from the editor toolbar, and moved the Clear button from the isolated footer status bar up next to Import, grouping it with the other document-lifecycle actions (`f671d6d`)
- Shared header/footer widened from `max-w-7xl` to `max-w-screen-2xl` to match the editor page's content width, so the navbar no longer looks narrower than the toolbar below it (`1627767`)

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
- Import from HTML and Import from CSV/JSON, right inside the unified editor: paste or upload content and the converted Markdown lands at the cursor instead of requiring a separate converter page (`05a6ad4`)
- "Copy HTML" action and a "Full HTML document" toggle shared by both HTML export paths (`05a6ad4`)
- `LICENSE` (GPL-3.0), `README.md`, and `CONTRIBUTING.md` for the newly open-sourced project (`05a6ad4`)
- GitHub Actions workflow (`.github/workflows/deploy.yml`) building and deploying `dist/` to GitHub Pages on every push to `main` (`05a6ad4`)
- `ensureTurndownLoaded()` in `site.js`, lazy-loading Turndown + turndown-plugin-gfm on first HTML import instead of unconditionally in `<head>` (`05a6ad4`)

### Changed
- Extracted the draggable split-pane / pane-height / scroll-mirroring logic into a shared `paneResizer()` mixin in `site.js`; both tool widgets now use it instead of each re-implementing it (`40007d2`)
- Default sample Markdown on `markdown-editor` and `markdown-to-html` now exercises nearly every rendered feature on first load — strikethrough, an inline image (embedded as a data URI, no network request), KaTeX inline/block math, and a Mermaid diagram, alongside the existing headings, lists, task list, table, blockquote, and code fence (`6b28765`)
- Extracted `flash()`, `copyRichClick()`, and `wrapDocument()` — previously duplicated identically on `markdown-editor` and `markdown-to-html` — into a shared `toolActionsMixin()` in `site.js` (`50b5c7f`)
- `markdown-editor` toolbar's single "H" button (always inserted `## `) replaced with a Paragraph/H1-H6 dropdown that reflects the current line's heading level as the cursor moves and swaps the leading `#`s cleanly instead of stacking a new prefix on each click (`24f5030`)
- Consolidated the four separate converter pages (`markdown-to-html`, `html-to-markdown`, `markdown-editor`, `csv-to-markdown-table`) into a single unified Markdown workspace at `/` — one tool with import/export modes, not four separate pages (`05a6ad4`)
- Project relicensed as GPL-3.0; hosting moves from Cloudflare Pages to GitHub Pages (`05a6ad4`)
- `about/` and `privacy/` rewritten to describe the open-source, ad-free project instead of the ad-monetized model; nav simplified to a single "About" link plus GitHub (`05a6ad4`)
- Internal wiki (`docs/index.md`) rewritten to describe the unified tool and drop SEO/monetization framing, while keeping the Markdown-extensions/DOMPurify/Word-clipboard engineering notes (`05a6ad4`)
- Editor toolbar UI/UX: Copy Markdown, Export (Copy HTML/Copy for Word/Download .md/Download HTML/Print to PDF) moved from a bottom action bar into the top toolbar, so they no longer require scrolling past the (resizable, up to 1400px tall) editor panes to reach; the "Stack panels" toggle moved next to the Write/Split/Preview control it governs instead of floating disconnected on the header's right edge; the formatting toolbar is now grouped into labeled Format/Insert/Embed clusters with tooltips that state whether a button wraps the current selection or inserts a block at the cursor (`5f8f23e`)
- The unified tool moves from `/` to `/editor/`; `site/index.html` becomes a landing page (pitch, feature docs, FAQ) linking into it via "Open Editor" nav links in the header and footer; `README.md`/`CONTRIBUTING.md`/`CLAUDE.md` updated to match (`359db39`)

### Removed
- All ad-slot markup, CSS, and the JS placeholder filler — no ad network was ever wired in, and the project no longer plans to add one (`05a6ad4`)
- `docs/keyword-map.md` and the `seo-tool-pages` skill (page-per-keyword strategy, launch checklist, JSON-LD/page templates) — no longer applicable now that there's one tool page, not many (`05a6ad4`)
- The four standalone converter pages, superseded by the unified workspace (`05a6ad4`)

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
- `html-to-markdown`, `markdown-to-html`, and `csv-to-markdown-table` textareas showed the same bold native UA focus outline `markdown-editor` was already fixed for (`59e47f6`) — they were missing `focus:outline-none`, and the outline was visibly clipped by the line-number gutter div on top; added `focus:outline-none` to all four pages' textareas and dropped the wrapper's `focus-within:border-neutral-500` entirely so focusing an input pane causes no visual change. Also fixed the line-number gutter drifting out of sync with wrapped text on the three pages that have one (`html-to-markdown`, `markdown-to-html`, `markdown-editor`) by adding `wrap="off"` so each logical line renders as exactly one row, matching the gutter's per-`\n` count (`778d917`)
- Every `<select>` on the site (paragraph style, code-block language, diagram type, bullet marker, code-block style, heading style, alignment) rendered as a plain, unthemed native dropdown — a native select's open option list is drawn by the OS and can't be styled to match the rest of the Pines UI on the page; replaced all of them with a `pinesSelect()` Alpine mixin in `site.js` driving a themeable button + listbox, on `markdown-editor`, `html-to-markdown`, and `csv-to-markdown-table` (`27421bf`)
- Toolbar and action buttons across the homepage and all four tool pages were plain text (or a lone emoji), inconsistent with the rest of the Pines UI; replaced with inlined Lucide SVG icons (source copies in `site/assets/vendor/lucide/`), themeable via `currentColor` and working with JavaScript disabled (`f12e506`)
- `markdown-editor`'s "Stack panels" toggle only appeared in Split view, so the word/character count next to it shifted position between view modes; reordered the toolbar so the toggle is consistently the last element, flush right, regardless of view (`f12e506`)
- `markdown-editor`'s Diagram dropdown showed a stray mark next to its chevron — the placeholder text still carried a leftover literal `▾` character from before the button had a real Lucide chevron-down icon (`04507d3`)
