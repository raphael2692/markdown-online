# Markdown Tools — Internal Wiki

Static site of browser-only Markdown utilities, monetized with ads, engineered
to rank on Google one long-tail query per page. This wiki is internal
documentation for whoever works on the repo — it is never deployed with the
public site.

## What exists right now

- **Two live tool pages**, both Tier-1 hubs with full page anatomy
  (meta/canonical/JSON-LD, tool widget, FAQ, prose) per the `seo-tool-pages`
  skill's template:
  - `site/markdown-to-html/index.html` (`/markdown-to-html/`) — Markdown →
    HTML converter: resizable split-pane widget with synced line-number
    gutters, a Raw/Rendered toggle, and Copy / Copy-for-Word / Download.
  - `site/markdown-editor/index.html` (`/markdown-editor/`) — online
    Markdown editor for "markdown editor online" / "markdown preview
    online": Write/Split/Preview toggle, a resizable split-pane widget with
    a line-number gutter, a formatting toolbar (headings, bold, italic,
    links, lists, quotes, code) with keyboard shortcuts,
    word/character/reading-time counts, localStorage autosave with restore
    and an explicit Clear action, and Copy / Copy-for-Word / Download .md /
    Download HTML / Print-to-PDF export.
- **Site shell**: homepage (`site/index.html`), `about/`, `privacy/`, `404.html`.
- **Shared assets**: `site/assets/site.css` (built Tailwind output),
  `site/assets/site.js` (rich-clipboard copy, file download, ad-slot
  placeholder init, and the `paneResizer()` mixin — see below),
  `site/assets/vendor/` (pinned Alpine.js, marked, DOMPurify — vendored
  locally, no CDN hotlinking in production).
- **Shared widget behavior**: both tool widgets mix in `paneResizer()`
  (defined once in `site/assets/site.js`) for the draggable horizontal
  split (`--split`, a %) and vertical pane height (`--pane-height`, px),
  plus the proportional scroll-mirroring between panes. A page's
  `toolWidget()` spreads it in — `{ ...paneResizer(), /* page state */ }` —
  and needs `x-ref="paneRow"` on the flex-row ancestor plus the
  `.split-pane-left` / `.pane-height` CSS classes (`site/assets/input.css`)
  on its panes. Add any new two-pane tool widget on top of this mixin
  rather than re-implementing drag-resize or scroll-sync per page.
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
- **Internal linking is thin** — with only two tool pages, "Related tools"
  mostly points back to the homepage (the editor links to the HTML
  converter). This fills in as more Tier-2/3 pages ship per the keyword map.
- **No GitHub repo URL yet** — `__GITHUB_URL__` is a placeholder in `build.py`.

## Where things live

See the keyword map for the page roadmap and what's built vs. planned.
