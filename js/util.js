/* Holzrahmen — small helpers. Plain JS, no build step. Every file adds to window.APP. */
window.APP = window.APP || {};
(function (APP) {
  const U = (APP.U = {});
  U.uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  U.today = () => new Date().toISOString().slice(0, 10);
  U.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.safeName = s => String(s || "file").replace(/[\\/:*?"<>|]+/g, "-").trim().slice(0, 60) || "file";
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  APP.toast = function (msg) {
    const t = document.getElementById("toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(APP.toast.t); APP.toast.t = setTimeout(() => t.classList.remove("show"), 3500);
  };
})(window.APP);
