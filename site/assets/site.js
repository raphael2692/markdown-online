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

// Shared resizable split-pane behavior for two-pane tool widgets: a
// draggable vertical divider (sets --split, a %) and a draggable bottom
// bar (sets --pane-height, in px). Mix into an Alpine component with:
//   function toolWidget() { return { ...paneResizer(), /* page state */ }; }
// Requires the component to have x-ref="paneRow" on the flex row ancestor,
// with :style="`--split: ${split}%; --pane-height: ${paneHeight}px`", and
// the CSS classes .split-pane-left / .pane-height (site.css) on the panes.
function paneResizer(opts) {
  opts = opts || {};
  const minSplit = opts.minSplit || 20, maxSplit = opts.maxSplit || 80;
  const minHeight = opts.minHeight || 150, maxHeight = opts.maxHeight || 600;
  return {
    split: opts.split || 50,
    dragging: false,
    paneHeight: opts.paneHeight || 288,
    draggingV: false,
    syncingScroll: false,

    // Mirrors scroll *proportionally* (scrollTop / scrollable range) rather
    // than 1:1, since the two panes rarely have the same content length.
    // The syncingScroll guard breaks the feedback loop: mirroring sets the
    // other pane's scrollTop, which fires its own scroll event, which would
    // otherwise mirror straight back.
    mirrorScroll(source, target) {
      if (!target || this.syncingScroll) return;
      this.syncingScroll = true;
      const sMax = source.scrollHeight - source.clientHeight;
      const tMax = target.scrollHeight - target.clientHeight;
      target.scrollTop = sMax > 0 ? (source.scrollTop / sMax) * tMax : 0;
      requestAnimationFrame(() => { this.syncingScroll = false; });
    },

    startDrag(e) {
      e.preventDefault();
      this.dragging = true;
      const row = this.$refs.paneRow;

      const onMove = (ev) => {
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const rect = row.getBoundingClientRect();
        const pct = ((clientX - rect.left) / rect.width) * 100;
        this.split = Math.min(maxSplit, Math.max(minSplit, pct));
      };
      const onUp = () => {
        this.dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    },

    startVDrag(e) {
      e.preventDefault();
      this.draggingV = true;
      const startY = e.touches ? e.touches[0].clientY : e.clientY;
      const startHeight = this.paneHeight;

      const onMove = (ev) => {
        const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
        this.paneHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + (clientY - startY)));
      };
      const onUp = () => {
        this.draggingV = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    },
  };
}
window.paneResizer = paneResizer;

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
