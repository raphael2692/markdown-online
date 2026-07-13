<!-- docs-sync: pending-first-commit -->

# Changelog

No commits yet — this repo was just initialized. The marker above gets
replaced with the actual short SHA once the first commit lands; from then on,
the `mkdocs-wiki` maintain flow reads it to process only what's new.

## [Unreleased]

### Added
- Initial site scaffold: `build.py` (partial includes, token substitution,
  sitemap/robots generation, per-page validation), Tailwind input/output CSS,
  shared `site.js` helpers (rich clipboard copy, file download), vendored
  Alpine.js + marked + DOMPurify.
- Homepage, `about/`, `privacy/`, `404.html`.
- First tool page: Markdown to HTML converter (`/markdown-to-html/`) — full
  SEO anatomy (meta, canonical, JSON-LD `SoftwareApplication` + `FAQPage`),
  live Alpine widget: Markdown on the left, HTML output on the right with a
  Raw / Rendered switch (rendered view sanitized via DOMPurify), plus Copy
  HTML / Copy-for-Word / Download HTML.
- Site-wide layout widened from `max-w-3xl` to `max-w-5xl`.
- Internal wiki (this site) and `docs/keyword-map.md` seeded from the
  `seo-tool-pages` skill.
