// Dark mode toggle, shared by every page via the header partial's
// #theme-toggle button. The initial light/dark class itself is set earlier,
// synchronously, by partials/theme-init.html (inline in <head>, before this
// deferred script even loads) so there's no flash of the wrong theme.
//
// Pages that render generated content whose colors need to track the theme
// (currently: the editor's Mermaid diagrams and highlight.js code coloring)
// listen for the 'themechange' event this dispatches on `document` — see
// site.js's syncMermaidTheme()/syncHljsTheme() and the toolWidget() listener.
function isDarkTheme() {
  return document.documentElement.classList.contains('dark');
}
window.isDarkTheme = isDarkTheme;

function setTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
}

document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var next = isDarkTheme() ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    setTheme(next);
  });
});

// Live-follow the OS theme for as long as the user hasn't made an explicit
// choice via the toggle above (localStorage empty).
if (window.matchMedia) {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem('theme')) setTheme(e.matches ? 'dark' : 'light');
  });
}
