# Markdown Tools

**The definitive free, browser-based Markdown tool.** No ads, no signup,
no upload — everything you write, paste, or convert stays on your machine
and never touches a server.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

## What it does

One page, everything you need for Markdown:

- **Write, split, or preview** — a live editor with a synced side-by-side
  preview, or full-width writing/preview modes.
- **Import** from HTML, CSV, or JSON — paste or drop it in and get clean
  Markdown out (tables, lists, and formatting preserved).
- **Export** to Markdown, HTML, or PDF, or copy rich-formatted content
  straight onto your clipboard for pasting into Word or Google Docs.
- **Math and diagrams** — inline/block KaTeX math and Mermaid diagrams,
  auto-detected as you type.
- **Syntax-highlighted code blocks** in the live preview.

Every conversion runs on vetted, open-source JavaScript libraries loaded
from this site — nothing is sent anywhere.

## Try it

<!-- TODO once GitHub Pages is live: link the deployed URL here. -->

## Local development

Requires Python 3 and the
[Tailwind CSS standalone CLI](https://tailwindcss.com/blog/standalone-cli)
on your `PATH` — this repo has no `package.json`/Node.js dependency.

```bash
# Rebuild CSS after any class/markup change
tailwindcss -i site/assets/input.css -o site/assets/site.css --minify

# Build site/ -> dist/ (partials, tokens, sitemap.xml, robots.txt, validation)
python build.py

# Preview the built site
python -m http.server -d dist 8000
```

Then open `http://localhost:8000`.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how
the codebase is organized, how to build and test locally, and code-style
conventions.

## License

GPL-3.0 — see [LICENSE](LICENSE). Vendored third-party libraries under
`site/assets/vendor/` keep their own licenses (see each library's bundled
LICENSE/README where included, e.g. `site/assets/vendor/lucide/README.md`).
