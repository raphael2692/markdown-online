# Markdown Online

**The definitive free, browser-based Markdown tool.** No ads, no signup,
no upload — everything you write, paste, or convert stays on your machine
and never touches a server.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

## What it does

One tool, everything you need for Markdown — the editor lives at `/editor/`:

- **Write, split, or preview** — a live editor with a synced side-by-side
  preview (scroll sync can be toggled off), or full-width writing/preview
  modes. Ctrl/Cmd+F opens an in-editor find bar with match highlighting —
  and Ctrl/Cmd+H adds replace-one / replace-all — the formatting toolbar
  collapses out of the way when you just want to write, and a slim status
  bar shows cursor line/column plus live word, character, and estimated
  LLM token counts.
- **Smart lists** — pressing Enter continues bullet, numbered, task-list,
  and blockquote lines (numbered items renumber themselves); Enter on an
  empty item ends the list, and Tab/Shift+Tab nest or un-nest an item.
- **Multiple documents** — create, rename, switch between, and delete named
  documents from the toolbar; each autosaves to your browser's local
  storage, so nothing ever leaves your machine.
- **Zoom, pan, and fit-to-view** in the rendered preview — zoom in/out or
  reset to 100%, a hand tool to drag-pan instead of scroll, and a
  zoom-to-fit button for oversized tables or diagrams.
- **Open a Markdown file** straight from your device, or **import** from
  HTML, CSV, or JSON — paste or drop it in and get clean Markdown out
  (tables, lists, and formatting preserved).
- **Export** to Markdown, HTML, or PDF, or copy rich-formatted content
  straight onto your clipboard for pasting into Word or Google Docs.
- **Math and diagrams** — inline/block KaTeX math and Mermaid diagrams,
  auto-detected as you type.
- **Database schema diagrams** — write real DBML in a fenced code block and
  get an auto-rendered, auto-laid-out entity-relationship diagram (tables,
  columns, keys, enums, and crow's-foot relationships), no dbdiagram.io
  round-trip needed.
- **Diagram mini-map** — a collapsible thumbnail strip of every diagram in
  the document (one per table and enum for DBML schemas): click a thumbnail
  to jump the editor to its code block, hover for a zoomed-in preview.
- **Syntax highlighting everywhere** — code blocks are colored in the live
  preview *and* in the write pane itself (Markdown structure plus fenced
  code in ~35 languages, including first-party Mermaid and DBML grammars).

Every conversion runs on vetted, open-source JavaScript libraries loaded
from this site — nothing is sent anywhere.

## Try it

**https://raphael2692.github.io/markdown-online/**

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
