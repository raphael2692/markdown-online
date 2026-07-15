# CLAUDE.md — Markdown Online Site

Static site of a single, unified browser-only Markdown tool (write, preview,
import, export) — free, open source (GPL-3.0), no ads, no tracking, no
signup. **The product is the tool itself.** Every change is judged by:
(1) does it make the tool more correct or more useful, (2) does it keep the
page fast and dependency-light, (3) does it preserve "nothing you paste or
type ever leaves your browser."

## Skills — when to use which

- **markdown-browser-ops** — ALWAYS for the tool widget itself: library
  choices, conversion recipes, clipboard/download/PDF patterns, the Alpine
  widget skeleton, sanitization. New import/export capability is a mode
  inside the existing widget, not a new page.
- **pines-ui** — UI components (buttons, textareas, toasts, accordions,
  tabs). One override: the page uses our built Tailwind CSS file, never the
  CDN Play script from pines' base templates.
- **mkdocs-wiki** — internal dev-notes wiki lives in `docs/` (MkDocs). After
  completing any task that changes the repo, run its maintain flow (wiki +
  changelog sync). The wiki is internal only — never deployed with the
  public site; `README.md`/`CONTRIBUTING.md` at the repo root are what
  GitHub visitors see.

A typical "add an import/export mode" task touches markdown-browser-ops for
the conversion logic, pines-ui for components, mkdocs-wiki at the end.

## Stack (fixed — don't relitigate)

- **Pure static.** No backend, no framework, no SPA. Plain HTML + Tailwind
  (standalone CLI build) + Alpine.js. All conversion logic runs
  client-side; "your text never leaves your browser" is a core promise —
  never add code that violates it (no analytics that ship page content, no
  remote conversion APIs).
- **No hotlinked CDNs in production.** All JS vendored under
  `site/assets/vendor/` with pinned versions.
- **Icons: Lucide**, inlined as static SVG — not the JS runtime.
  Source/reference copies live in `site/assets/vendor/lucide/` (see its
  README for the fetch-and-inline convention); pages inline the `<svg>`
  markup directly so icons stay themeable via `currentColor`/Tailwind
  classes and keep working with JavaScript disabled. Standard wrapper:
  `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" class="lucide h-4 w-4"`.
- **Hosting:** GitHub Pages, deployed automatically by
  `.github/workflows/deploy.yml` on every push to `main` (build CSS, run
  `build.py`, publish `dist/` via `actions/deploy-pages`). No manual upload
  step, no `gh-pages` branch.

## Repo layout

```
site/                  # source (this is what you edit)
  index.html           # landing page: pitch, feature docs, FAQ, links to /editor/
  editor/              # the tool: write/preview, import (HTML/CSV/JSON),
                        # export (MD/HTML/rich-clipboard/PDF) — one page, at /editor/
  about/  privacy/  404.html
  assets/
    site.css           # BUILT tailwind output (never hand-edit)
    input.css          # tailwind source
    site.js            # shared helpers: convertMarkdown/sanitizeHtml,
                        # copyRich, downloadFile, widget mixins
    vendor/            # pinned minified libs (alpine, marked, dompurify, …)
build.py               # copies site/→dist/, generates sitemap.xml, validates pages
dist/                  # build output (gitignored)
docs/ + mkdocs.yml     # internal dev-notes wiki (mkdocs-wiki skill) — not part of the public site
.github/workflows/     # GitHub Pages deploy
```

## Commands

```bash
# CSS (after any class changes)
tailwindcss -i site/assets/input.css -o site/assets/site.css --minify

# Build: copy to dist/, regenerate sitemap.xml, run page validations
python build.py

# Preview
python -m http.server -d dist 8000

# Internal wiki
mkdocs serve
```

If `build.py` doesn't yet do something described here, extend it rather
than doing the step manually.

## Definition of done — any change to the tool or site

1. Widget change tested per the markdown-browser-ops testing checklist
   (LLM-shaped input, XSS payloads inert, empty input, large input stays
   responsive, rich copy pastes correctly into Docs/Word, PDF output is
   sane).
2. `python build.py` runs clean (title/canonical/single-`<h1>` validation
   passes, no leftover tokens).
3. If the change adds, removes, or renames a feature, `README.md`'s feature
   list stays accurate — update it in the same change.
4. mkdocs-wiki maintain flow run before finishing; changelog synced; docs
   committed separately (`docs: sync wiki and changelog`).

## Conventions

- URLs: the public site is `/`, `/about/`, `/privacy/` — directory style,
  self-canonical with a trailing slash.
- Commits: conventional style (`feat(widget): add CSV import mode`,
  `fix(build): …`) — the changelog is derived from these.
- New tool capability is a mode/option inside the single widget on
  `site/editor/index.html`, not a new page.

## Honest constraints (keep expectations calibrated)

- This isn't a growth engine anymore — there's no keyword map or ad revenue
  driving a content cadence. Feature growth follows what maintainers and
  contributors actually want to build.
- GitHub Pages hosting is fully static: no server-side code, no database, no
  secrets consumed at request time. A feature that seems to need a backend
  (accounts, saved documents, server-side conversion) needs a hosting-model
  conversation first.
