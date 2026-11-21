(() => {
  "use strict";
  const key = "hpw-theme";
  const root = document.documentElement;
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  let saved = null;
  try { saved = localStorage.getItem(key); } catch { /* 儲存空間停用時仍可切換。 */ }
  let preference = saved === "dark" || saved === "light" ? saved : "system";
  const effective = () => preference === "system" ? (system.matches ? "dark" : "light") : preference;
  function apply() {
    const dark = effective() === "dark";
    root.dataset.theme = dark ? "dark" : "light";
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.textContent = dark ? "淺色模式" : "深色模式";
      toggle.setAttribute("aria-label", dark ? "切換為淺色模式" : "切換為深色模式");
      toggle.setAttribute("aria-pressed", String(dark));
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#17191C" : "#F5F2EE";
  }
  apply();
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("theme-toggle");
    if (toggle) toggle.addEventListener("click", () => {
      preference = effective() === "dark" ? "light" : "dark";
      try { localStorage.setItem(key, preference); } catch { /* 忽略儲存失敗。 */ }
      apply();
    });
    apply();
  });
  if (system.addEventListener) system.addEventListener("change", () => { if (preference === "system") apply(); });
})();
