# Markdown Tools — Internal Wiki

Static site of browser-only Markdown utilities, monetized with ads, engineered
to rank on Google one long-tail query per page. This wiki is internal
documentation for whoever works on the repo — it is never deployed with the
public site.

## What exists right now

- **One live tool page**: `site/markdown-to-html/index.html` (served at
  `/markdown-to-html/`) — the Tier-1 hub page for the Markdown → HTML
  converter. Full page anatomy (meta/canonical/JSON-LD, tool widget, FAQ,
  prose), per the `seo-tool-pages` skill's template.
- **Site shell**: homepage (`site/index.html`), `about/`, `privacy/`, `404.html`.
- **Shared assets**: `site/assets/site.css` (built Tailwind output),
  `site/assets/site.js` (rich-clipboard copy, file download, ad-slot
  placeholder init), `site/assets/vendor/` (pinned Alpine.js, marked,
  DOMPurify — vendored locally, no CDN hotlinking in production).
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
- **Internal linking is thin** — there's only one tool page, so "Related
  tools" on it just points back to the homepage. This fills in as more Tier-2/3
  pages ship per the keyword map.
- **No GitHub repo URL yet** — `__GITHUB_URL__` is a placeholder in `build.py`.

## Where things live

See the keyword map for the page roadmap and what's built vs. planned.
