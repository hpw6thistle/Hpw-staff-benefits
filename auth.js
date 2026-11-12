(() => {
  const key = "hpw-maintenance-v1";
  const digest = "eb80061280b04e5ed597cd841e1de12d00cef053d1eab692145fd99c3b17e48c";
  function verified() {
    try { return sessionStorage.getItem(key) === "verified"; }
    catch { return false; }
  }
  if (document.body.hasAttribute("data-maintenance-page")) {
    if (verified()) document.body.hidden = false;
    else location.replace("index.html#maintenance");
    return;
  }

  const dialog = document.getElementById("maintenance-dialog");
  const form = document.getElementById("maintenance-form");
  const password = document.getElementById("maintenance-password");
  const status = document.getElementById("maintenance-status");
  const confirm = form.querySelector('[type="submit"]');
  const link = document.getElementById("maintenance-link");
  link.addEventListener("click", event => {
    if (verified()) return;
    event.preventDefault();
    dialog.showModal();
  });
  document.getElementById("maintenance-cancel").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    form.reset();
    status.textContent = "";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (confirm.disabled) return;
    confirm.disabled = true;
    try {
      const value = new TextEncoder().encode(password.value);
      const bytes = await crypto.subtle.digest("SHA-256", value);
      if (!dialog.open) return;
      const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== digest) {
        status.textContent = "密碼錯誤，請重新輸入。";
        password.select();
        return;
      }
      sessionStorage.setItem(key, "verified");
      location.assign(link.href);
    } catch {
      status.textContent = "目前無法驗證。請使用 HTTPS，並允許此網站使用分頁儲存空間。";
    } finally {
      confirm.disabled = false;
    }
  });

  if (location.hash === "#maintenance") {
    history.replaceState(null, "", "#home");
    if (verified()) location.replace(link.href);
    else dialog.showModal();
  }
})();
