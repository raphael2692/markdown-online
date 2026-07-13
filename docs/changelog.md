<!-- docs-sync: 87f7e10 -->

# Changelog

## [Unreleased]

### Added
- Static-site build pipeline: `site/` → `build.py` → `dist/`, with shared header/footer partials, site-wide token substitution, sitemap.xml/robots.txt generation, and per-page validation (`342649d`)
- Vendored Alpine.js, marked, and DOMPurify — pinned versions, no CDN hotlinking (`342649d`)
- Homepage, `/about/`, `/privacy/`, and `404.html` (`342649d`)
- Markdown to HTML converter (`/markdown-to-html/`): full SEO anatomy (meta, canonical, JSON-LD `SoftwareApplication` + `FAQPage`), resizable split-pane widget with synced line-number gutters, proportional scroll sync between panes, a Raw/Rendered HTML toggle, and Copy / Copy-for-Word / Download actions (`342649d`)
- Internal MkDocs wiki and `docs/keyword-map.md`, seeded from the `seo-tool-pages` skill (`342649d`)
- Markdown editor (`/markdown-editor/`): full SEO anatomy targeting "markdown editor online" / "markdown preview online", a Write/Split/Preview toggle, a resizable split-pane widget with a line-number gutter, a formatting toolbar with keyboard shortcuts, word/character/reading-time counts, localStorage autosave with restore-on-load and an explicit Clear action, and Copy / Copy-for-Word / Download .md / Download HTML / Print-to-PDF export (`fc2d000`, `40007d2`)
- Three opt-in Markdown extensions on both `markdown-to-html` and `markdown-editor`, sharing one `convertMarkdown()` pipeline in `site.js`: smart typography (curly quotes/dashes), KaTeX-rendered `$inline$`/`$$block$$` math, and Mermaid diagram fences — all lazy-loaded only when enabled and applied consistently across preview, raw/copy/download, rich clipboard, and print-to-PDF (`87f7e10`)
- Vendored KaTeX 0.17.0 and Mermaid 11.16.0 — pinned versions, no CDN hotlinking (`87f7e10`)

### Changed
- Extracted the draggable split-pane / pane-height / scroll-mirroring logic into a shared `paneResizer()` mixin in `site.js`; both tool widgets now use it instead of each re-implementing it (`40007d2`)

### Fixed
- Both tool widgets failed to render (panes stuck collapsed, no toolbar) because `site.js` — which defines `paneResizer()`, called at `x-data` construction time — loaded after Alpine's core script, which boots synchronously as soon as it runs; reordered the `<script defer>` tags so `site.js` executes first (`da4e649`)
