# Contributing

Thanks for considering a contribution. This is a small, fully static,
client-side Markdown tool — there's no backend, no build server, and no
account system, which keeps the contribution loop short.

## Local setup

Requires Python 3 and the
[Tailwind CSS standalone CLI](https://tailwindcss.com/blog/standalone-cli)
binary on your `PATH` (no Node.js/npm — this repo has no `package.json`).

```bash
# after any class/markup change:
tailwindcss -i site/assets/input.css -o site/assets/site.css --minify

# build site/ -> dist/ and validate every page:
python build.py

# preview:
python -m http.server -d dist 8000
```

`site/` is the source you edit; `dist/` is generated output (gitignored) —
never hand-edit anything under `dist/`, and never hand-edit
`site/assets/site.css` (it's Tailwind's build output — edit
`site/assets/input.css` or the class names in the HTML instead).

## Where things live

- `site/editor/index.html` — the tool itself (editor/import/export in one
  page, at `/editor/`).
- `site/index.html` — the landing page: pitch, feature docs, FAQ, and a
  link into the editor.
- `site/assets/site.js` — the shared conversion pipeline
  (`convertMarkdown()`, `sanitizeHtml()`), clipboard/download helpers, and
  the Alpine mixins (`paneResizer()`, `toolActionsMixin()`) the widget is
  built from.
- `site/assets/vendor/` — pinned, locally vendored third-party libraries
  (Alpine, marked, DOMPurify, KaTeX, Mermaid, highlight.js, turndown,
  PapaParse, Lucide icon sources). No CDN hotlinking, ever.
- `build.py` — the whole build: expands `site/partials/*.html` into every
  page, substitutes `__SITE_URL__`/`__SITE_NAME__`/`__GITHUB_URL__`/
  `__YEAR__` tokens, generates `sitemap.xml`/`robots.txt`, and validates
  every built page (title, canonical, single `<h1>`, no leftover tokens).
- `docs/` + `mkdocs.yml` — an internal wiki (not deployed publicly) with
  deeper engineering notes: the Markdown-extensions pipeline (smart
  typography/KaTeX/Mermaid), DOMPurify/foreignObject/Word-clipboard
  quirks, and the shared widget mixins. Read it before touching the
  conversion pipeline or the widget.

## Claude Code skills (`.claude/skills/`)

This repo carries a few project-local Claude Code skills that double as
plain engineering documentation, useful whether or not you're using
Claude Code:

- **markdown-browser-ops** — library choices, sanitization rules, the
  widget pattern, and conversion recipes for every operation the tool
  supports. Start here for any change inside the tool widget.
- **pines-ui** — the Alpine.js + Tailwind component patterns (buttons,
  dropdowns, toasts, tabs, etc.) used across the site.
- **mkdocs-wiki** — how the `docs/` wiki and changelog are maintained and
  kept in sync with git history.

## Code style

- Plain HTML + Tailwind utility classes + Alpine.js. No build-time
  framework, no bundler, no TypeScript.
- New widget behavior is a mode/option inside the existing tool widget,
  not a new page.
- Sanitize before any `innerHTML`/`x-html` render — see
  `.claude/skills/markdown-browser-ops/SKILL.md` for the exact rule.
- Vendor new third-party libraries under `site/assets/vendor/` with a
  pinned version; never hotlink a CDN in production.
- Commit messages: conventional style (`feat(widget): …`, `fix(build): …`,
  `docs: …`).

## Before opening a PR

- `python build.py` runs clean (no validation errors).
- New/changed widget behavior tested per the checklist in
  `.claude/skills/markdown-browser-ops/SKILL.md` ("Testing a tool before
  calling it done").
- If your change adds or removes a feature, update README.md's feature
  list to match.
