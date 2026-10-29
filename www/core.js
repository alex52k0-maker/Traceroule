/* Trace & Roule : constantes, mondes, utilisateur, progression, stockage et sauvegarde cloud (Firebase). */
/* ---------- Constantes physique ---------- */
let simT = 0;
function hz(h, t) { const k = h[5] ? Math.sin(h[5] * t + (h[6] || 0)) : 0; return [h[0] + (h[3] || 0) * k, h[1] + (h[4] || 0) * k, h[2]]; }
const R = 10, G = 900, REST = 0.38, FRICTION = 0.0006, SUB = 8;
const STROKE = 5, WALL = 6;

/* ---------- Mondes (couleurs & ambiance) ---------- */
const WORLD_SIZE = 20;
const WORLDS = [
  { name: "Prairie", icon: "🌿", top: "#123a4a", bot: "#1f7a6b", wall: "#b4ecd6", ink: "#ffd166", glow: "#06d6a0", fx: "fireflies", c1: "#2ec4b6", c2: "#1b8a7a" },
  { name: "Océan",   icon: "🌊", top: "#0a1f4a", bot: "#0f62a3", wall: "#b0e0ff", ink: "#ffb84d", glow: "#4cc9f0", fx: "bubbles",   c1: "#4cc9f0", c2: "#1d6fa5" },
  { name: "Volcan",  icon: "🌋", top: "#2a0d1c", bot: "#94312b", wall: "#ffd0aa", ink: "#ffe066", glow: "#ff7b39", fx: "embers",    c1: "#ff8c42", c2: "#c1392b" },
  { name: "Galaxie", icon: "🌌", top: "#0b0426", bot: "#40217f", wall: "#d8c6ff", ink: "#5efce8", glow: "#b388ff", fx: "stars",     c1: "#9d7bff", c2: "#5b3fc9" },
  { name: "Désert",  icon: "🏜️", top: "#4a2a0d", bot: "#c17a2b", wall: "#ffe3b0", ink: "#fff3c2", glow: "#ffb020", fx: "embers",    c1: "#e0a94a", c2: "#a85c1f" },
  { name: "Glacier", icon: "❄️", top: "#0c2a3a", bot: "#2f8fae", wall: "#e8fbff", ink: "#ffe066", glow: "#8fe3ff", fx: "bubbles",   c1: "#7fd6f0", c2: "#2e7fa0" },
  { name: "Forêt",   icon: "🌲", top: "#0d2a16", bot: "#1f6b3a", wall: "#c8f0c8", ink: "#ffd166", glow: "#4fe08a", fx: "fireflies", c1: "#3fae6a", c2: "#1a6b3c" },
  { name: "Caverne", icon: "🕳️", top: "#1c1026", bot: "#4a2a5a", wall: "#d8b8ff", ink: "#ffb84d", glow: "#b388ff", fx: "embers",    c1: "#8a5fc9", c2: "#4a2a6a" },
  { name: "Tempête", icon: "⛈️", top: "#15202a", bot: "#3a5068", wall: "#cfe6ff", ink: "#ffe066", glow: "#8fe3ff", fx: "bubbles",   c1: "#5a7a98", c2: "#263a4a" },
  { name: "Cosmos",  icon: "🪐", top: "#06031a", bot: "#2a1050", wall: "#e0c6ff", ink: "#5efce8", glow: "#ff7b39", fx: "stars",     c1: "#c96fff", c2: "#5b1fb0" }
];
const worldOf = i => WORLDS[Math.min(WORLDS.length - 1, Math.floor(i / WORLD_SIZE))];

/* ---------- Utilisateur & progression ---------- */
let user = null;
const $ = id => document.getElementById(id);
/* Stockage local avec cache mémoire : on évite l'appel synchrone localStorage.getItem à chaque lecture.
   Chaque lecture renvoie une copie décodée, donc modifier l'objet obtenu ne change rien tant qu'on n'appelle pas set(). */
const store = {
  _raw: new Map(),
  get(k) {
    try {
      let r = this._raw.get(k);
      if (r === undefined) { r = localStorage.getItem(k); this._raw.set(k, r); }
      return r == null ? null : JSON.parse(r);
    } catch (e) { return null; }
  },
  set(k, v) {
    try { const r = JSON.stringify(v); this._raw.set(k, r); localStorage.setItem(k, r); }
    catch (e) { report(e, "stockage:écriture " + k); }
  },
  del(k) { this._raw.set(k, null); try { localStorage.removeItem(k); } catch (e) { report(e, "stockage:suppression " + k); } }
};
const progKey = () => "tr_prog_" + (user ? user.id : "guest");
function getProg() {
  const p = store.get(progKey()) || [];
  while (p.length < LEVELS.length) p.push(0);
  return p;
}
function setStars(i, s) {
  const p = getProg();
  const prev = Math.max(0, p[i]);
  let gained = 0;
  if (s > p[i]) {
    p[i] = s; store.set(progKey(), p);
    gained = (s - prev) * 10 + (prev === 0 ? 5 : 0);   // +10 par étoile gagnée, +5 bonus de première victoire
    if (gained > 0) Coins.add(gained, "niveau", true);
    Cloud.push();
    if (Profile.hasPseudo()) Profile.publish();
  }
  return gained;
}
function setSkipped(i) {
  const p = getProg();
  if (p[i] === 0) { p[i] = -1; store.set(progKey(), p); Cloud.push(); }
}

/* ---------- Sauvegarde dans le cloud (Firebase : Authentification + Firestore) ---------- */
const Cloud = {
  auth: null, status: "off", msg: "", timer: null, busy: Promise.resolve(),
  cfg() { const f = window.CFG && CFG.FIREBASE; return f && f.apiKey && f.projectId && !/^VOTRE/.test(f.apiKey) ? f : null; },
  enabled() { return !!this.cfg(); },
  async jpost(url, body) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
    return j;
  },
  /* Connexion : on échange le jeton Google contre une session Firebase */
  async login(idToken) {
    if (!this.enabled() || !user) return;
    if (!idToken) { this.setStatus("relog"); return; }
    try {
      const j = await this.jpost("https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=" + this.cfg().apiKey, {
        postBody: "id_token=" + encodeURIComponent(idToken) + "&providerId=google.com",
        requestUri: "http://localhost", returnIdpCredential: true, returnSecureToken: true });
      this.auth = { uid: j.localId, token: j.idToken, exp: Date.now() + (parseInt(j.expiresIn || "3600", 10) - 60) * 1000, refresh: j.refreshToken };
      store.set("tr_fb", { uid: j.localId, refresh: j.refreshToken, gid: user.id });
      await this.sync();
    } catch (e) { report(e, "cloud:connexion"); this.setStatus("err", e.message); }
  },
  /* Au lancement de l'appli : on reprend la session enregistrée */
  async resume() {
    if (!this.enabled() || !user) return;
    const s = store.get("tr_fb");
    if (!s || s.gid !== user.id) { this.setStatus("relog"); return; }
    this.auth = { uid: s.uid, token: null, exp: 0, refresh: s.refresh };
    await this.sync();
  },
  async token() {
    const a = this.auth; if (!a) throw new Error("no-auth");
    if (a.token && Date.now() < a.exp) return a.token;
    const r = await fetch("https://securetoken.googleapis.com/v1/token?key=" + this.cfg().apiKey, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(a.refresh) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { if (r.status >= 400 && r.status < 500) { store.del("tr_fb"); this.auth = null; throw new Error("session-expired"); } throw new Error("HTTP " + r.status); }
    a.token = j.id_token; a.refresh = j.refresh_token || a.refresh; a.uid = j.user_id || a.uid;
    a.exp = Date.now() + (parseInt(j.expires_in || "3600", 10) - 60) * 1000;
    store.set("tr_fb", { uid: a.uid, refresh: a.refresh, gid: user.id });
    return a.token;
  },
  url() { return "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(this.cfg().projectId) + "/databases/(default)/documents/users/" + encodeURIComponent(this.auth.uid); },
  base() { return "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(this.cfg().projectId) + "/databases/(default)/documents"; },
  /* ---- Accès Firestore génériques (classement, file d'attente, duels) ---- */
  fval(v) {
    if (v == null) return { nullValue: null };
    if (v instanceof Date) return { timestampValue: v.toISOString() };
    if (typeof v === "string") return { stringValue: v };
    if (typeof v === "boolean") return { booleanValue: v };
    if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(x => this.fval(x)) } };
    if (typeof v === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, this.fval(x)])) } };
    return { stringValue: String(v) };
  },
  jval(f) {
    if (!f) return null;
    if ("stringValue" in f) return f.stringValue;
    if ("integerValue" in f) return parseInt(f.integerValue, 10);
    if ("doubleValue" in f) return f.doubleValue;
    if ("booleanValue" in f) return f.booleanValue;
    if ("nullValue" in f) return null;
    if ("timestampValue" in f) return f.timestampValue;
    if ("arrayValue" in f) return (f.arrayValue.values || []).map(v => this.jval(v));
    if ("mapValue" in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, v]) => [k, this.jval(v)]));
    return null;
  },
  docFields(obj) { return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, this.fval(v)])); },
  docToObj(doc) { return Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, this.jval(v)])); },
  async getDoc(path) {
    const t = await this.token();
    const r = await fetch(this.base() + "/" + path, { headers: { Authorization: "Bearer " + t } });
    if (r.status === 404) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
    return this.docToObj(j);
  },
  /* set complet du document (remplace tout) ; existsPrecondition: true|false|undefined */
  async setDoc(path, obj, existsPrecondition) {
    const t = await this.token();
    let url = this.base() + "/" + path;
    const r = await fetch(url, {
      method: "PATCH", headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: this.docFields(obj), ...(existsPrecondition !== undefined ? { currentDocument: { exists: existsPrecondition } } : {}) })
    });
    if (r.status === 400 || r.status === 409) return false;  // précondition non remplie
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
    return true;
  },
  /* suppression conditionnelle : renvoie true si le document a bien été supprimé (et existait) */
  async delDoc(path, mustExist) {
    const t = await this.token();
    let url = this.base() + "/" + path;
    if (mustExist) url += "?currentDocument.exists=true";
    const r = await fetch(url, { method: "DELETE", headers: { Authorization: "Bearer " + t } });
    return r.ok;
  },
  /* mise à jour partielle (ne touche pas aux autres champs), dotPaths ex: ["times.abc123"] */
  async patchDoc(path, obj, dotPaths) {
    const t = await this.token();
    const mask = dotPaths.map(p => "updateMask.fieldPaths=" + encodeURIComponent(p)).join("&");
    const r = await fetch(this.base() + "/" + path + "?" + mask, {
      method: "PATCH", headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: this.docFields(obj) })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
    return this.docToObj(j);
  },

  /* requête triée simple sur une collection top-level */
  async query(collection, orderByField, limit, ascending) {
    const t = await this.token();
    const body = { structuredQuery: {
      from: [{ collectionId: collection }],
      orderBy: [{ field: { fieldPath: orderByField }, direction: ascending ? "ASCENDING" : "DESCENDING" }],
      limit: limit || 50
    } };
    const r = await fetch(this.base() + ":runQuery", {
      method: "POST", headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ([]));
    if (!r.ok) return [];
    return j.filter(x => x.document).map(x => ({ id: x.document.name.split("/").pop(), ...this.docToObj(x.document) }));
  },
  async load() {
    const t = await this.token();
    const r = await fetch(this.url(), { headers: { Authorization: "Bearer " + t } });
    if (r.status === 404) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || ("HTTP " + r.status));
    const f = j.fields || {};
    const get = k => f[k] && f[k].stringValue;
    const getI = k => f[k] && parseInt(f[k].integerValue || "0", 10);
    return {
      progress: get("progress") ? JSON.parse(get("progress")) : null,
      coinsEarned: getI("coinsEarned") || 0,
      coinsSpent: getI("coinsSpent") || 0,
      ownedSkins: get("ownedSkins") ? JSON.parse(get("ownedSkins")) : null,
      meta: get("meta") ? JSON.parse(get("meta")) : null
    };
  },
  async save(p, coinsEarned, coinsSpent, ownedSkins, meta) {
    const t = await this.token();
    const mask = ["progress", "name", "updated", "coinsEarned", "coinsSpent", "ownedSkins", "meta"].map(k => "updateMask.fieldPaths=" + k).join("&");
    const r = await fetch(this.url() + "?" + mask, {
      method: "PATCH", headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: {
        progress: { stringValue: JSON.stringify(p) }, name: { stringValue: user.name || "" }, updated: { integerValue: String(Date.now()) },
        coinsEarned: { integerValue: String(coinsEarned) }, coinsSpent: { integerValue: String(coinsSpent) },
        ownedSkins: { stringValue: JSON.stringify(ownedSkins) },
        meta: { stringValue: JSON.stringify(meta || Meta.blank()) }
      } }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error((j.error && j.error.message) || ("HTTP " + r.status)); }
  },
  /* Synchronisation : on fusionne local + cloud, puis on réécrit si besoin */
  sync() {
    this.busy = this.busy.then(async () => {
      if (!this.enabled() || !user || !this.auth) return;
      this.setStatus("sync");
      try {
        const remote = await this.load();
        const local = getProg(), before = JSON.stringify(local);
        const merged = mergeProg(local, remote && remote.progress || [], LEVELS.length);
        store.set(progKey(), merged);
        const ce = Math.max(Coins.earned(), (remote && remote.coinsEarned) || 0);
        const cs = Math.max(Coins.spent(), (remote && remote.coinsSpent) || 0);
        const os = Array.from(new Set([...Skins.coinOwned(), ...((remote && remote.ownedSkins) || [])])).filter(id => !PREMIUM_IDS.includes(id));
        Coins.setTotals(ce, cs); Skins.setOwned(os);
        const mm = Meta.merge(Meta.get(), remote && remote.meta); Meta.set(mm);
        const changed = !remote || before !== JSON.stringify(merged) || ce !== remote.coinsEarned || cs !== remote.coinsSpent || os.length !== (remote.ownedSkins || []).length
          || JSON.stringify(mm) !== JSON.stringify(Meta.merge(remote.meta, null));
        if (changed) await this.save(merged, ce, cs, os, mm);
        if (!$("home").classList.contains("hidden")) refreshHomeBits();
        this.setStatus("ok");
        if (before !== JSON.stringify(merged) && !$("menu").classList.contains("hidden")) buildMenu();
        refreshCoinUI();
        await Profile.restore();
      } catch (e) {
        if (e.message !== "session-expired") report(e, "cloud:synchronisation");
        this.setStatus(e.message === "session-expired" ? "relog" : "err", e.message);
      }
    });
    return this.busy;
  },
  push() { clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 600); },
  setStatus(s, msg) { this.status = s; this.msg = msg || ""; paintCloud(); },
  clear() { this.auth = null; store.del("tr_fb"); this.status = "off"; paintCloud(); }
};
