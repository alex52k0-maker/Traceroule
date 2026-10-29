/* Trace & Roule : logique pure, sans DOM ni stockage.
   Utilisée par le jeu (fonctions globales dans le navigateur) ET par les tests unitaires (Node : require("./logic.js")). */
(function (root) {
  "use strict";
  const PSEUDO_RE = /^[\p{L}\p{N} _.\-]{3,16}$/u;

  /* Échappement HTML : toute donnée externe doit passer par là avant innerHTML */
  const escHtml = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Pseudo reçu d'un autre joueur : lettres, chiffres, espace, _ . - (16 caractères max) */
  const cleanPseudo = p => (String(p == null ? "" : p).normalize("NFC").match(/[\p{L}\p{N} _.\-]/gu) || []).join("").trim().slice(0, 16) || "Joueur";

  /* Pseudo saisi par le joueur : même alphabet que la règle Firestore */
  function validatePseudo(v) {
    v = String(v || "").normalize("NFC").trim();
    return PSEUDO_RE.test(v) ? v : null;
  }

  /* Fusion de deux progressions : on garde le meilleur score de chaque niveau ; -1 = niveau passé */
  function mergeProg(a, b, minLen) {
    a = a || []; b = b || [];
    const n = Math.max(a.length, b.length, minLen || 0), out = [];
    for (let i = 0; i < n; i++) {
      const x = a[i] || 0, y = b[i] || 0;
      out.push(x > 0 || y > 0 ? Math.max(x, y) : (x === -1 || y === -1 ? -1 : 0));
    }
    return out;
  }

  /* Côte façon Elo, facteur K = 32 */
  function eloAfter(mine, opp, won) {
    const expected = 1 / (1 + Math.pow(10, (opp - mine) / 400));
    return Math.max(0, Math.round(mine + 32 * ((won ? 1 : 0) - expected)));
  }

  /* Données « méta » synchronisées : succès obtenus, série du jour, meilleure série, duels gagnés / joués */
  const metaBlank = () => ({ ach: [], dl: { d: -1, s: 0 }, bs: 0, dw: 0, dd: 0 });
  function metaMerge(a, b) {
    a = Object.assign(metaBlank(), a || {}); b = Object.assign(metaBlank(), b || {});
    const dl = b.dl.d > a.dl.d ? b.dl : a.dl.d > b.dl.d ? a.dl : { d: a.dl.d, s: Math.max(a.dl.s, b.dl.s) };
    return { ach: Array.from(new Set([...a.ach, ...b.ach])), dl, bs: Math.max(a.bs, b.bs), dw: Math.max(a.dw, b.dw), dd: Math.max(a.dd, b.dd) };
  }

  /* Récompense du jour : dl = dernier jour récupéré { d: numéro du jour, s: série }, today = numéro du jour */
  function dailyState(dl, today) {
    dl = dl || { d: -1, s: 0 };
    if (dl.d === today) return { ready: false, streak: dl.s, idx: (dl.s - 1) % 7 };
    const streak = dl.d === today - 1 ? dl.s + 1 : 1;
    return { ready: true, streak, idx: (streak - 1) % 7 };
  }

  const api = { PSEUDO_RE, escHtml, cleanPseudo, validatePseudo, mergeProg, eloAfter, metaBlank, metaMerge, dailyState };
  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
