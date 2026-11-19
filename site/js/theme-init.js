/*
 * Runs in <head> BEFORE the page paints (loaded without defer on purpose):
 * applies the saved or system theme, so dark mode never flashes white.
 * Kept as a file instead of inline code so the Content-Security-Policy can
 * forbid all inline scripts.
 */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  try {
    var theme = localStorage.getItem('theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
  } catch (e) {
    root.setAttribute('data-theme', 'light');
  }
})();
