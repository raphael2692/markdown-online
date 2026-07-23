---
name: markwon-online-formatter
description: >-
  ALWAYS use this skill whenever writing, generating, editing, or reviewing
  any Markdown content destined for Markdown Online
  (https://raphael2692.github.io/markdown-online/, repo:
  github.com/raphael2692/markdown-online), the free browser-only Markdown
  editor at /editor/. Applies to a full document, a short snippet, or seed
  content — trigger proactively even if the user doesn't name the tool or
  this skill explicitly; any time the deliverable is Markdown for this
  editor, these rules apply by default. Covers: front matter for
  title/subtitle (not a heading, not the old HTML-comment trick), never
  hand-numbering headings (numbering is a preview toggle), heading
  hierarchy for the outline/minimap, soft line breaks becoming visible
  line breaks, which fenced-code languages auto-trigger rich rendering
  (mermaid, dbml, math), smartypants auto-typography, and GFM support
  (tables, task lists, strikethrough — no footnotes). Treat as globally
  active for this project: consult by default, not just on request.
---
 
# Writing Markdown for Markdown Online
 
[Markdown Online](https://raphael2692.github.io/markdown-online/) is a free, open-source,
browser-only Markdown editor — write, preview, import, and export, with nothing you type
ever leaving your machine. The live editor is at
[`/editor/`](https://raphael2692.github.io/markdown-online/editor/); the source lives at
[github.com/raphael2692/markdown-online](https://github.com/raphael2692/markdown-online)
(`site/editor/index.html`, logic in `site/assets/site.js`).
 
Its preview pipeline renders Markdown with `marked` (GFM) → smartypants → auto-detected
Mermaid/dbml/KaTeX → DOMPurify. Several of its features are display-time transforms, not
things you should pre-bake into the Markdown source. Getting this wrong produces
double-numbered headings, broken diagrams, or paragraphs that wrap oddly.
 
This skill applies by default to any Markdown produced for Markdown Online —
don't wait for the user to say "for the editor" or name the skill explicitly.
 
## The rule that matters most: never number headings yourself
 
Section numbering (`## Intro` → `1 Intro`, `### Setup` → `1.1 Setup`, …) is a
**preview-only toggle** (`opts.numberHeadings`, off by default) applied live
to `##` and deeper — the `#` document title is never numbered. It is not
written into the Markdown source, ever.
 
- Do **not** write `## 1. Introduction`, `### 2.1 Setup`, `## Section 3`, etc.
- Just write `## Introduction`, `### Setup` — clean heading text, no ordinal.
- If the toggle is later switched on, a heading you numbered yourself becomes
  `1 1. Introduction` (doubled) or drifts out of sync the moment sections are
  reordered or inserted. The tool already renumbers correctly on every edit;
  manual numbers can only make that worse.
- This applies to heading text specifically — ordinary numbered lists
  (`1. First step`) are unaffected and fine to use.
## Document title & subtitle: front matter, not a heading
 
Give the document a name via a front matter block at the very top of the
file, Jekyll/Hugo-style:
 
```
---
title: My Document Name
subtitle: Optional one-line subtitle
---
```
 
- This is the site's own lightweight front matter support, not real YAML —
  only flat `key: value` scalars are parsed (quotes around a value are
  stripped). Don't nest maps or lists inside the block; they won't parse
  the way you'd expect.
- `title`/`subtitle` render as a styled header ahead of the body in every
  preview, but they are **not** part of the `#`…`######` heading hierarchy —
  the outline/minimap never lists them and the numbering toggle never
  touches them.
- In the Word export (Download .docx / Copy for Word) they become Word's
  real built-in **Title**/**Subtitle** paragraph styles — distinct from
  whatever the body's first `#` heading maps to (**Heading 1**), so a
  document can have both without them competing for the same Word style.
- Superseded convention: don't reach for the old `<!-- Title: ... -->` HTML
  comment trick for new content — front matter is the supported way to name
  a document now. (It still works exactly as before on existing content:
  sanitized away, no title role — just don't add new instances of it.)
- Visible content still starts at `#` for the first real section heading —
  front matter's `title` already covers the "document name" role, so the
  first section owns heading level 1. Don't leave a gap by starting at `##`.
- The editor's own document name (the tab/sidebar title in the app) is a
  separate thing from front matter `title` — don't conflate them.
## Heading hierarchy
 
- Visible headings start at `#`; go `##`, `###`, `####`, … in strict nesting
  order from there (don't skip levels just for visual size). The outline
  panel and minimap key off this hierarchy.
- Fixing a level after the fact (promoting/demoting a section you already
  wrote) is a live-editor action, not something to redo by hand-editing
  every `#` in the block: select the lines and use the toolbar's heading-
  shift buttons or Alt+Shift+Right/Alt+Shift+Left. Worth knowing about when
  advising a user who's restructuring a document in the editor, even though
  it doesn't change how you should author new Markdown.
- The numbering toggle (next section) numbers `##` and deeper, not `#` — a
  behavior of the tool itself, not something this skill controls. Practical
  effect: top-level `#` sections stay unnumbered even with the toggle on;
  only their `##` subsections would get numbers. If a document's top-level
  sections must participate in numbering, that's a reason to reconsider using
  `##` for them instead — flag it rather than silently living with it.
## Paragraphs: don't hard-wrap prose
 
`gfmBreaks` (soft line breaks → `<br>`) is **on by default**. A single `\n`
inside what you intend as one paragraph renders as a visible line break, not
a continuation. So:
 
- Write each paragraph as **one continuous line** in the source, however
  long. Don't hand-wrap at ~80 columns the way plain-text prose often is.
- Use a **blank line** to start a new paragraph.
- Only use a mid-paragraph single newline when you deliberately want a line
  break in the rendered output (e.g. a short address, a line of verse).
## Typography: write plain ASCII, let the tool style it
 
`smartypants` runs automatically on the rendered HTML (on by default). Straight
quotes, `--`, `---`, and `...` are converted to curly quotes, en/em dashes,
and an ellipsis at render time.
 
- Type plain `"straight quotes"`, `'apostrophes'`, `--`/`---`, and `...` in
  the Markdown source.
- Don't hand-type curly quotes (`" " ' '`) or `–`/`—`/`…` — they'll either
  pass through unstyled-but-fine or double up visually with copy-pasted
  content; plain ASCII is the one input the pipeline is built to transform.
## Rich features auto-enable from syntax — just use the syntax
 
Math, Mermaid, and dbml are **not** manual checkboxes the content needs to
ask for — they turn on the instant their syntax appears in the document:
 
| Feature | Syntax | Detection regex (from `site.js`) |
|---|---|---|
| Inline math (KaTeX) | `` $x^2 + y^2 = z^2$ `` | first/last char inside `$…$` must be non-space, and no `$` inside |
| Block math (KaTeX) | `` $$\int_0^1 f(x)\,dx$$ `` | `$$…$$`, no `$` inside |
| Diagram | ```` ```mermaid ```` fenced block | literal `` ```mermaid `` fence, lowercase |
| DB schema diagram | ```` ```dbml ```` fenced block | literal `` ```dbml `` fence, lowercase |
 
Gotchas:
- `$ x^2 $` (space right after the opening `$`) will **not** match — write
  `$x^2$` with no inner padding.
- The fence language tag must be exactly `mermaid` or `dbml`, lowercase, no
  extra words on the info string.
- Once triggered, a feature stays enabled for the rest of the session even if
  you later delete the triggering syntax — no need to "turn it back off."
## GFM support — use it, but know the boundary
 
Supported natively (use real syntax, don't fake with raw HTML):
- Tables (`| a | b |` / `|---|---|`)
- Task lists (`- [ ] todo`, `- [x] done`)
- Strikethrough (`~~text~~`)
- Fenced code blocks with a language tag (`` ```js ``, `` ```python ``, …) —
  syntax-highlighted automatically in preview via highlight.js; always
  include the language, don't leave the fence bare.
**Not supported** — don't emit this syntax expecting it to render specially:
- Footnotes (`[^1]` / `[^1]: text`) — marked's core GFM mode here doesn't
  implement them; they'll render as literal bracketed text.
- Definition lists.
## Raw HTML is sanitized, not trusted
 
Markdown is an HTML superset here; any raw HTML you embed passes through
`marked` and then DOMPurify. Scripts, inline event handlers (`onclick=`, …),
and `<style>` tags will be stripped at render time — don't rely on them to
produce an effect. If a feature needs interactivity, that's a viewer feature
request, not something to smuggle in via HTML.
 
## Quick self-check before handing content over
 
1. Title/subtitle live in a `---` front matter block, never a heading; visible
   headings start at `#`. No ordinals typed into any heading text.
2. Each paragraph is a single unbroken line in the source; blank lines
   separate paragraphs.
3. Straight quotes/hyphens/ellipses only — no hand-typed curly punctuation.
4. Every code fence has a language tag; math/diagram fences use the exact
   syntax above with no inner padding on `$…$`.
5. No footnotes or definition lists if the content needs to render, not just
   read as source.