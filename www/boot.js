/* Filet d'erreurs : chargé avant tout le reste pour attraper aussi les erreurs de démarrage.
   Les 20 dernières erreurs sont gardées dans « tr_errlog » (Paramètres → Rapport d'erreurs). */
(function () {
  var KEY = "tr_errlog", MAX = 20, lastNotice = 0;
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  window.report = function (err, ctx) {
    var e = { t: new Date().toISOString(), ctx: String(ctx || ""), msg: String((err && err.message) || err).slice(0, 300),
              stack: String((err && err.stack) || "").split("\n").slice(0, 4).join(" | ").slice(0, 600) };
    try { var a = read(); a.push(e); while (a.length > MAX) a.shift(); localStorage.setItem(KEY, JSON.stringify(a)); } catch (x) {}
    if (window.console) console.warn("[Trace & Roule]", e.ctx, err);
  };
  window.errorLog = read;
  window.clearErrorLog = function () { try { localStorage.removeItem(KEY); } catch (e) {} };
  function notice() {
    var n = Date.now(); if (n - lastNotice < 10000) return; lastNotice = n;
    if (typeof window.toast === "function") window.toast("Un petit problème est survenu, il a été noté (Paramètres)");
  }
  function bootFail(msg) {
    var show = function () {
      if (document.getElementById("bootFail")) return;
      var d = document.createElement("div"); d.id = "bootFail";
      d.style.cssText = "position:fixed;inset:0;z-index:99;background:#120f2b;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:30px;text-align:center;font:16px system-ui,sans-serif";
      d.innerHTML = "<b style='font-size:22px'>Le jeu n'a pas pu démarrer</b><span style='opacity:.75'>Ferme et relance l'appli. Si le problème continue, envoie ce message au développeur :</span>";
      var c = document.createElement("code"); c.style.cssText = "background:rgba(255,255,255,.1);padding:10px;border-radius:10px;font-size:12px;max-width:100%;word-break:break-word";
      c.textContent = String(msg).slice(0, 300); d.appendChild(c);
      var b = document.createElement("button"); b.textContent = "Relancer"; b.style.cssText = "font:inherit;font-weight:800;padding:12px 22px;border:0;border-radius:14px;background:#ffd166;color:#3a2400";
      b.onclick = function () { location.reload(); }; d.appendChild(b);
      document.body.appendChild(d);
    };
    if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
  }
  window.addEventListener("error", function (ev) {
    window.report(ev.error || ev.message, "erreur " + String(ev.filename || "").split("/").pop() + ":" + (ev.lineno || 0));
    if (!window.__booted) bootFail(ev.message); else notice();
  });
  window.addEventListener("unhandledrejection", function (ev) { window.report(ev.reason, "promesse non gérée"); notice(); });
})();
