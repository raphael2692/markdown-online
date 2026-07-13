<!-- docs-sync: fc2d000 -->

# Changelog

## [Unreleased]

### Added
- Static-site build pipeline: `site/` → `build.py` → `dist/`, with shared header/footer partials, site-wide token substitution, sitemap.xml/robots.txt generation, and per-page validation (`342649d`)
- Vendored Alpine.js, marked, and DOMPurify — pinned versions, no CDN hotlinking (`342649d`)
- Homepage, `/about/`, `/privacy/`, and `404.html` (`342649d`)
- Markdown to HTML converter (`/markdown-to-html/`): full SEO anatomy (meta, canonical, JSON-LD `SoftwareApplication` + `FAQPage`), resizable split-pane widget with synced line-number gutters, proportional scroll sync between panes, a Raw/Rendered HTML toggle, and Copy / Copy-for-Word / Download actions (`342649d`)
- Internal MkDocs wiki and `docs/keyword-map.md`, seeded from the `seo-tool-pages` skill (`342649d`)
- Markdown editor (`/markdown-editor/`): full SEO anatomy targeting "markdown editor online" / "markdown preview online", a Write/Split/Preview toggle, a formatting toolbar with keyboard shortcuts, word/character/reading-time counts, localStorage autosave with restore-on-load and an explicit Clear action, and Copy / Copy-for-Word / Download .md / Download HTML / Print-to-PDF export (`fc2d000`)
