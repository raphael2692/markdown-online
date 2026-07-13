function downloadFile(content, filename, mime) {
  mime = mime || 'text/plain;charset=utf-8';
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
window.downloadFile = downloadFile;

async function copyRich(markdown) {
  const html = DOMPurify.sanitize(marked.parse(markdown, { gfm: true }));
  const wrapped = `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">${html}</div>`;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([wrapped], { type: 'text/html' }),
      'text/plain': new Blob([markdown], { type: 'text/plain' }),
    })]);
    return true;
  } catch (e) {
    await navigator.clipboard.writeText(markdown);
    return false;
  }
}
window.copyRich = copyRich;

// Reserved ad slots show a placeholder label until an ad network is wired in —
// see seo-tool-pages skill: ads wait until the site has ~10 real pages.
document.querySelectorAll('.ad-slot').forEach((el) => {
  el.textContent = 'Advertisement';
});
