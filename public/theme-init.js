// Pre-paint theme (external file so the CSP can forbid inline scripts): avoids a
// light flash before the app resolves the tenant's theme preference.
(function () {
  try {
    var t = localStorage.getItem("ad2:theme");
    if (t !== "light" && t !== "dark")
      t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = t;
  } catch (e) {
    /* storage blocked: CSS defaults to light */
  }
})();
