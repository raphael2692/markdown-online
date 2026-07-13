# CLAUDE.md — Markdown Tools Site

Static site of browser-only markdown utilities (converters, generators, cleaners), one page per search query, monetized with ads. **The product is Google rankings** — traffic → ad impressions is the entire business model. Every change is judged by: (1) does it help a page rank, (2) does it keep pages fast, (3) does it avoid thin-content risk.

## Skills — when to use which

- **seo-tool-pages** — ALWAYS when creating or editing any public page: page anatomy, meta/canonical, JSON-LD schema, keyword map, internal linking, sitemap, ads, launch steps. Adding a tool page starts here.
- **markdown-browser-ops** — ALWAYS for the tool widget itself: library choices, conversion recipes, clipboard/download/PDF patterns, the Alpine widget skeleton, sanitization.
- **pines-ui** — UI components (buttons, textareas, toasts, accordions, tabs). One override: production pages use our built Tailwind CSS file, never the CDN Play script from pines' base templates.
- **mkdocs-wiki** — internal docs live in `docs/` (MkDocs). After completing any task that changes the repo, run its maintain flow (wiki + changelog sync). The wiki is internal only — never deployed with the public site.

A typical "add the X converter page" task touches all four: seo-tool-pages for the page, markdown-browser-ops for the widget, pines-ui for components, mkdocs-wiki at the end.

## Stack (fixed — don't relitigate)

- **Pure static.** No backend, no framework, no SPA. Plain HTML + Tailwind (standalone CLI build) + Alpine.js. All conversion logic runs client-side; "your text never leaves your browser" is a core promise stated on every page — never add code that violates it (no analytics that ship page content, no remote conversion APIs).
- **No hotlinked CDNs in production.** All JS vendored under `site/assets/vendor/` with pinned versions.
- **Hosting:** Cloudflare Pages, deploy from `dist/`.

## Repo layout

```
site/                  # source (this is what you edit)
  index.html           # homepage: all tools grouped by hub
  <slug>/index.html    # one directory per tool page (clean URLs)
  about/  privacy/  404.html
  assets/
    site.css           # BUILT tailwind output (never hand-edit)
    input.css          # tailwind source
    site.js            # shared helpers: copyRich, downloadFile, ad-slot init
    vendor/            # pinned minified libs (alpine, marked, dompurify, …)
build.py               # copies site/→dist/, generates sitemap.xml, validates pages
dist/                  # build output (gitignored)
docs/ + mkdocs.yml     # internal wiki (mkdocs-wiki skill), incl. keyword-map.md
```

## Commands

```bash
# CSS (after any class changes / new pages)
tailwindcss -i site/assets/input.css -o site/assets/site.css --minify

# Build: copy to dist/, regenerate sitemap.xml, run page validations
python build.py

# Preview
python -m http.server -d dist 8000

# Internal wiki
mkdocs serve
```

If `build.py` doesn't yet do something described here (sitemap from page list, validation checks), extend it rather than doing the step manually.

## Definition of done — any new/edited public page

1. Passes the per-page checklist in seo-tool-pages `references/launch-checklist.md` (unique title/description, canonical, one H1, JSON-LD valid and matching visible content, 250-500 words unique prose, internal links both directions, fixed-height ad slots).
2. Page content is complete in static HTML — readable as an article with JS disabled; widget enhances it.
3. Widget tested per markdown-browser-ops testing list (LLM-shaped input, XSS payloads inert, empty input, rich copy pastes correctly into Docs/Word).
4. Row updated in `docs/keyword-map.md` (status → built/live).
5. `python build.py` clean; sitemap includes the page.
6. mkdocs-wiki maintain flow run; changelog synced; docs committed separately (`docs: sync wiki and changelog`).

## Conventions

- URLs: lowercase-hyphenated slug = primary keyword, directory style `/slug/`, self-canonical with trailing slash.
- Commits: conventional style (`feat(page): add csv-to-markdown-table`, `fix(widget): …`) — the changelog is derived from these.
- Prose is written for humans; if two pages' prose looks templated, rewrite one. When unsure whether a page idea is distinct enough, check the keyword map's "one intent per page" rule before building.
- Never place ads above the H1 or inside the tool widget; ad slots always have `min-height` reserved.

## Honest constraints (keep the user's expectations calibrated)

Head terms ("markdown to pdf") won't rank for months if ever — build Tier 2/3 long-tail pages first per the keyword map. Dev audiences block ads (~30-50%); revenue comes from page volume compounding, not any single page. Backlinks (HN/PH/Reddit launches, open-sourcing) move rankings more than on-page tweaks — see launch-checklist.md Phase 3.