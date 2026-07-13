# Conversion Recipes

Working code for each tool. Assumes vendored libs in `/assets/vendor/` and the lazy-loader from `tool-widget-pattern.html`.

## Contents
1. [md → HTML](#1-md--html)
2. [HTML → md](#2-html--md)
3. [Rich clipboard (Copy for Word/Docs)](#3-rich-clipboard)
4. [md → PDF via print](#4-md--pdf)
5. [md → .docx](#5-md--docx)
6. [.docx → md](#6-docx--md)
7. [Strip markdown](#7-strip-markdown)
8. [Escape markdown](#8-escape-markdown)
9. [CSV/JSON → markdown table](#9-csvjson--markdown-table)
10. [Markdown table generator/formatter](#10-table-formatter)
11. [File download helper](#11-file-download)

## 1. md → HTML

```js
// marked v12+: marked.parse() is sync by default
const html = marked.parse(input, {
  gfm: true,        // tables, strikethrough, task lists, autolinks
  breaks: opts.breaks ?? false,  // expose as a toggle: "single newline = <br>"
});
// RENDERING it? Always sanitize:
preview.innerHTML = DOMPurify.sanitize(html);
// OUTPUTTING it as code (textarea/download)? Use `html` verbatim, unsanitized.
```

Option toggles worth exposing on the md→HTML page: `breaks`, "full document" (wrap in `<!DOCTYPE html>…` with minimal CSS), "inline styles" for email use.

## 2. HTML → md

```js
const td = new TurndownService({
  headingStyle: 'atx',          // # not underlines
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndownPluginGfm.gfm(td);      // REQUIRED for tables/strikethrough/task lists
const md = td.turndown(inputHtml);
```

Gotcha: without the gfm plugin, `<table>` degrades to run-on text with no error. Always load both files together.

## 3. Rich clipboard

The "Copy for Word / Google Docs" button. Writes both flavors; Word/Docs/Gmail pick `text/html`, terminals pick `text/plain`.

```js
async function copyRich(md) {
  const html = DOMPurify.sanitize(marked.parse(md, { gfm: true }));
  // Inline minimal styling — Word ignores classes but respects inline CSS + semantic tags
  const wrapped = `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">${html}</div>`;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html':  new Blob([wrapped], { type: 'text/html' }),
      'text/plain': new Blob([md],      { type: 'text/plain' }),
    })]);
    return true;
  } catch (e) {
    await navigator.clipboard.writeText(md);   // Safari/permission fallback
    return false; // caller shows "copied as plain text" toast
  }
}
```

Notes: must be called from a user gesture (click handler). Tables paste as real tables into Docs/Word; task-list checkboxes don't survive — convert `[x]`/`[ ]` to ☑/☐ chars first if the page targets checklists.

## 4. md → PDF

Zero-dependency, real text layer, honest page breaks. Render into a hidden iframe and print it — printing the iframe avoids destroying the page's own print styles and state.

```js
function mdToPdf(md, o = { size: 'A4', margin: '2cm' }) {
  const html = DOMPurify.sanitize(marked.parse(md, { gfm: true }));
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: ${o.size}; margin: ${o.margin}; }
    body { font: 11pt/1.55 Georgia, 'Times New Roman', serif; color:#1a1a1a; max-width:100%; }
    h1,h2,h3 { font-family: Helvetica, Arial, sans-serif; line-height:1.25;
               break-after: avoid; }          /* never orphan a heading */
    pre { background:#f6f6f6; padding:.75em; font:9pt/1.4 ui-monospace,monospace;
          white-space: pre-wrap; word-wrap: break-word;  /* no page-edge overflow */
          break-inside: avoid; }
    code { font-family: ui-monospace, monospace; font-size: .9em; }
    table { border-collapse: collapse; width:100%; break-inside: avoid; }
    th,td { border:1px solid #999; padding:.35em .6em; text-align:left; }
    blockquote { border-left:3px solid #ccc; margin-left:0; padding-left:1em; color:#555; }
    img { max-width:100%; }
    a { color:#1a1a1a; }  /* print-friendly links */
  </style></head><body>${html}</body></html>`;

  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(f);
  f.srcdoc = doc;
  f.onload = () => {
    f.contentWindow.focus();
    f.contentWindow.print();
    setTimeout(() => f.remove(), 60000); // Chrome needs the frame alive while dialog is open
  };
}
```

Expose as options: page size (A4/Letter), margins, "include page numbers" is NOT possible via print CSS in Chrome — don't promise it; mention the browser's print dialog handles headers/footers.

## 5. md → .docx

html-docx-js converts an HTML string into a Word-compatible blob:

```js
// lazy-load /assets/vendor/html-docx.min.js first
const html = DOMPurify.sanitize(marked.parse(md, { gfm: true }));
const blob = htmlDocx.asBlob(
  `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`
);
download(blob, 'document.docx');
```

Fidelity note: heading tags map to Word Heading styles; complex nesting may flatten. For pages promising higher fidelity, the honest answer on-page is: use "Copy for Word" (recipe 3) and paste — Word's HTML paste engine beats any JS docx writer.

## 6. .docx → md

```js
// lazy-load mammoth.browser.min.js + turndown (+gfm plugin)
const buf = await file.arrayBuffer();
const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
const md = td.turndown(html);   // td configured as in recipe 2
```

Read the file from `<input type="file" accept=".docx">` or drag-drop. Mammoth intentionally ignores visual-only styling (colors, fonts) — say so on the page; it's a feature for md output.

## 7. Strip markdown

Target audience: "remove asterisks from AI text". Most robust approach = parse to HTML, then take textContent — regex-stripping breaks on nested constructs.

```js
function stripMarkdown(md, o = { keepListMarkers: true }) {
  const html = marked.parse(md, { gfm: true });
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(html);
  // preserve list structure as plain text
  div.querySelectorAll('li').forEach(li => {
    li.prepend(document.createTextNode(o.keepListMarkers ? '• ' : ''));
  });
  div.querySelectorAll('p,li,h1,h2,h3,h4,pre,tr,blockquote')
     .forEach(el => el.append(document.createTextNode('\n')));
  return div.textContent.replace(/\n{3,}/g, '\n\n').trim();
}
```

Options: keep/drop list bullets, keep/drop link URLs (`a` → `text (url)` vs `text`).

## 8. Escape markdown

For "make literal text safe inside markdown" (bot devs, prompt authors):

```js
const escapeMd = (s) => s.replace(/([\\`*_{}\[\]()#+\-.!|>~])/g, '\\$1');
```

Offer a second mode "escape for inline only" that skips `#`, `-`, `+`, `.` at non-line-start — full escaping is ugly when only emphasis chars matter. Explain the difference on-page (that's the unique-content payload for this page).

## 9. CSV/JSON → markdown table

```js
// CSV: lazy-load PapaParse
const { data } = Papa.parse(csvText.trim(), { skipEmptyLines: true });
const md = rowsToMdTable(data[0], data.slice(1));

// JSON: accept array-of-objects (union of keys = columns)
const arr = JSON.parse(jsonText);
const cols = [...new Set(arr.flatMap(Object.keys))];
const rows = arr.map(o => cols.map(c => o[c] ?? ''));
const md2 = rowsToMdTable(cols, rows);

function rowsToMdTable(header, rows) {
  const esc = v => String(v).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const widths = header.map((h, i) =>
    Math.max(esc(h).length, ...rows.map(r => esc(r[i] ?? '').length), 3));
  const line = cells => '| ' + cells.map((c, i) => esc(c ?? '').padEnd(widths[i])).join(' | ') + ' |';
  return [
    line(header),
    '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |',
    ...rows.map(line),
  ].join('\n');
}
```

The `padEnd` alignment is a differentiator — most generators emit ragged tables. Escape `|` and newlines or user data silently corrupts the table.

## 10. Table formatter

"Prettify/align an existing markdown table": split on `|` respecting escaped `\|`, trim cells, detect alignment row (`:---`, `:--:`, `---:`), recompute widths, re-emit with `rowsToMdTable`-style padding while preserving the alignment colons. Also the base for the interactive generator page (editable grid of inputs → live md output).

## 11. File download

```js
function download(blobOrText, filename, mime = 'text/plain;charset=utf-8') {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
```

Mimes: `.md` → `text/markdown`, `.html` → `text/html`, `.docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
