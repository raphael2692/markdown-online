# Markdown Online

**Markdown is the glue language of AI.** Every prompt, every LLM response,
every doc handed between tools passes through it — and the daily reality is
still copy-pasting it from place to place. The tools to handle that are
scattered across ad-bloated online converters or locked inside heavy desktop
apps like Obsidian or VS Code. This puts writing, previewing, importing, and
exporting Markdown in one free, open-source, browser-only page — no ads, no
signup, no upload, nothing you write or paste ever leaves your machine.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

## What it does

One tool, everything you need for Markdown — the editor lives at `/editor/`:

- **Write, split, or preview** — a live editor with a synced side-by-side
  preview (scroll sync can be toggled off), or full-width writing/preview
  modes. Ctrl/Cmd+F opens an in-editor find bar with match highlighting —
  and Ctrl/Cmd+H adds replace-one / replace-all — the formatting toolbar
  collapses out of the way when you just want to write, and a slim status
  bar shows cursor line/column plus live word, character, and estimated
  LLM token counts. Press `?` any time for a keyboard-shortcuts cheat sheet
  (Ctrl/Cmd+S is caught too, with a reassuring "already saved locally" toast
  instead of the browser's save dialog).
- **Command palette** (Ctrl/Cmd+Shift+P, or the toolbar's Commands button) —
  fuzzy-search every view toggle, formatting action, document, and
  import/export command without leaving the keyboard.
- **Paste a URL over selected text** and it wraps the selection as a link
  (`[selection](url)`) instead of overwriting it.
- **Numbered sections** — a toolbar toggle next to the paragraph-style
  picker numbers `##` and deeper as sections (1, 1.1, 1.2 …); the `#`
  title itself is never numbered, since Markdown has no separate title
  style and `#` conventionally fills that role. Display-only, never
  written into the Markdown source. The paragraph-style picker itself
  previews each heading level at its actual size and weight, like Word's
  style gallery.
- **Shift heading level** — bump the heading(s) touched by your selection
  up or down a level from the toolbar or Alt+Shift+Right/Alt+Shift+Left
  (shifting a top-level `#` back drops it to plain text).
- **Front matter** — a `---` metadata block at the top of the document
  (Jekyll/Hugo style); its `title`/`subtitle` keys render as a title block
  above the document in every preview and, in the Word export, become
  Word's real built-in Title/Subtitle styles rather than plain paragraphs.
  A toolbar button inserts a starter block and disables itself once one is
  already present.
- **Smart lists** — pressing Enter continues bullet, numbered, task-list,
  and blockquote lines (numbered items renumber themselves); Enter on an
  empty item ends the list, and Tab/Shift+Tab nest or un-nest an item.
- **Document outline** — a resizable left sidebar listing every heading in
  the document; click an entry to jump the editor there. Toggle it from the
  toolbar or Ctrl/Cmd+Shift+O.
- **Multiple documents** — create, rename, switch between, and delete named
  documents from the toolbar; each autosaves to your browser's local
  storage, so nothing ever leaves your machine.
- **Zoom, pan, and fit-to-view** in the rendered preview — zoom in/out or
  reset to 100%, a hand tool to drag-pan instead of scroll, and a
  zoom-to-fit button for oversized tables or diagrams.
- **Open a Markdown file** straight from your device, or **import** from
  HTML, CSV, or JSON — paste or drop it in and get clean Markdown out
  (tables, lists, and formatting preserved).
- **Export** to Markdown, HTML, or PDF, plus two Word paths: **Download
  Word (.docx)** builds a real OOXML file with true, editable Word styles
  (Normal, Heading 1–6, Quote, Code Block) — restyle one in Word's Styles
  pane and every paragraph using it updates — or **Copy for Word / Docs**
  puts a quick formatted paste on your clipboard for Word or Google Docs.
  **Copy as escaped string** puts the document on your clipboard as a
  JSON string literal (minimally escaped) — ready to paste as a value
  inside a system prompt, config file, or API payload.
- **Share via link** — pack the current document into a URL you can send
  anyone; opening it loads the document straight into their editor. The
  document lives entirely in the link itself (compressed into the URL's
  fragment), so nothing is uploaded or stored — an optional "Shorten link"
  action can additionally hand that URL to da.gd for a short link, the one
  explicit, opt-in exception to "nothing leaves your browser."
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
from this site — nothing is sent anywhere, except the one action that says
so up front (shortening a share link via da.gd).

## Why this exists

Built primarily for one person's own daily Markdown shuffling, then released
free and open source because the underlying itch — too many single-purpose
converters, none of them under one roof — isn't unique to one person. The
project is actively developed; stars and pull requests are what push it
forward.

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
