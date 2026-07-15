---
name: markdown-browser-ops
description: >-
  Implement markdown operations that run 100% client-side in the browser — markdown↔HTML, markdown→PDF, markdown→Word/Google Docs (rich clipboard), strip/escape markdown, table generators (CSV/JSON→md), previews — with vetted library choices, XSS sanitization, lazy loading, and a reusable Alpine.js widget pattern. Use this skill whenever the user builds or edits any converter/generator/cleaner tool on the markdown-tools site, mentions marked/markdown-it/turndown/DOMPurify, asks "how do I convert X to Y in the browser", needs copy-to-clipboard or file-download behavior, or debugs a tool widget. Trigger for ANY tool-widget implementation on this project, even if the word markdown isn't used. Pair with pines-ui for UI components.
---

# Markdown Browser Ops

Every tool on this site runs entirely in the browser — no backend, no upload. This skill covers the conversion logic layer: which libraries, how to wire them into Alpine widgets, and the patterns (rich clipboard, print-to-PDF, lazy loading, sanitization) that make the tools actually good.

## Library choices (don't relitigate these per page)

| Task | Library | Load | Why this one |
|---|---|---|---|
| markdown → HTML | **marked** | deferred, shared | tiny, fastest, best training-data coverage; GFM on by default |
| HTML → markdown | **turndown** (+ turndown-plugin-gfm for tables) | lazy | the standard; plugin needed or tables silently become paragraphs |
| Sanitize HTML | **DOMPurify** | deferred, shared | non-negotiable, see security |
| markdown → PDF | **browser print engine** + print CSS | none | zero bytes, real text-layer PDFs; see conversions.md |
| markdown → .docx | **html-docx-js** (or docx for programmatic builds) | lazy | converts rendered HTML blob → Word file |
| .docx → markdown | **mammoth** (docx→HTML) then turndown | lazy | the only reliable client-side docx reader |
| CSV parse | **PapaParse** | lazy | handles quoting/edge cases a hand-rolled split never will |
| Syntax highlight in previews | **highlight.js** (common bundle) | lazy | only on pages that preview code blocks |

Vendor all libraries locally under `/assets/vendor/` (pin versions, copy the minified builds into the repo). No hotlinked CDNs in production: it's a page-speed, reliability, and honesty issue — the site promises "nothing leaves your browser".

**Load discipline** (keeps first paint fast): `marked` + `DOMPurify` + Alpine load `defer` in `<head>`. Everything else lazy-loads on first interaction via dynamic script injection — pattern in `references/tool-widget-pattern.html`.

## Security: sanitize every render

Markdown is an HTML superset — raw HTML passes straight through marked. Any preview rendered with `innerHTML`/`x-html` from user input is an XSS vector (mitigated by same-origin, but still exploitable via shared links/pasted payloads, and it's sloppy). The iron rule:

```js
el.innerHTML = DOMPurify.sanitize(marked.parse(userInput));
```

Never `marked.parse` → `innerHTML` directly. Plain-text outputs (`textContent`, textarea values, file downloads of .md/.txt) don't need sanitizing. HTML that will be *downloaded or copied as code* (not rendered) also stays unsanitized — the user asked for their HTML verbatim.

## The widget pattern

All tools share one Alpine skeleton: input pane → options → output pane → action buttons (copy / download / copy-for-Word). Read `references/tool-widget-pattern.html` and copy it — it already handles debounced live conversion, lazy library loading, error display, clipboard with toast feedback (pines-ui `toast`), and file downloads. Per-tool work is usually just swapping the `convert()` function and the options.

UI components (buttons, textareas, tabs, toasts, dropdowns) come from **pines-ui** — compose, don't hand-roll.

Widget UX rules that apply to every tool:

- Convert live on input (250ms debounce), no "Convert" button for text-in/text-out tools. File-based tools (docx upload) convert on file select.
- Prefill the input with a small realistic example so the tool demonstrates itself on page load — this also makes the page's purpose obvious to a first-time visitor.
- Errors render inline in the output pane, never as `alert()`.
- Every output offers both **Copy** and **Download**; conversions targeting Word/Docs also offer **rich copy** (see below).

## The three output channels

Understanding these is most of this skill. Full code in `references/conversions.md`.

1. **Plain clipboard / file download** — `navigator.clipboard.writeText()` and Blob + `<a download>`. For .md, .html, .txt, .csv outputs.
2. **Rich clipboard** — `ClipboardItem` with both `text/html` and `text/plain` flavors. This is the killer feature for the LLM-cleanup audience: "Copy for Word / Google Docs" puts *formatted* content (real headings, bold, lists, tables) on the clipboard, so pasting into Word/Docs/Gmail just works. Most competitor sites don't do this.
3. **Print-to-PDF** — render sanitized HTML into a hidden iframe with print CSS, call `iframe.contentWindow.print()`. Produces selectable-text PDFs with proper page breaks at zero library cost. Options like page size/margins map to `@page` CSS.

## Conversion recipes

Read `references/conversions.md` when implementing a specific tool. It contains working code for: md→HTML (with options), HTML→md, md→PDF (print CSS incl. page-break rules), md→docx, docx→md, rich-clipboard copy, strip-markdown, escape-markdown, CSV/JSON→markdown table, and the markdown table generator's alignment/padding logic.

## Testing a tool before calling it done

- Paste real LLM output (nested lists, fenced code with language tags, tables, bold-inside-links) — this is the primary audience's input shape.
- Paste a `<script>alert(1)</script>` and an `<img src=x onerror=...>` inside markdown — preview must render them inert.
- Empty input → empty output, no errors.
- 1 MB of input → still responsive (debounce working, no layout thrash).
- Rich copy → paste into Google Docs and Word online: headings are Heading styles, tables are real tables.
- PDF output: code blocks don't overflow the page edge; page breaks don't split a heading from its first paragraph.
