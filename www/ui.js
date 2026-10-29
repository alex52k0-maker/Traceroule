/* Trace & Roule : menu animé, boutique, sons, connexion Google, publicités, navigation, scène d'accueil. */
/* ---------- Menu animé : logo, fond de gribouillis, transition d'encre, ondes ---------- */
(function buildBrand() {
  const mk = (el, word) => { el.innerHTML = [...word].map((c, i) => '<i style="--i:' + i + '">' + c + '</i>').join(""); };
  mk(document.querySelector("#brand .bt"), "Trace"); mk(document.querySelector("#brand .br"), "Roule");
})();
let homeIntroDone = false;

const HomeBg = {
  raf: 0, items: null, w: 0, h: 0,
  init() {
    const c = $("homeBg"), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return null;
    if (w !== this.w || h !== this.h) { c.width = w * dpr; c.height = h * dpr; this.w = w; this.h = h; c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); this.items = null; }
    if (!this.items) {
      const kinds = ["star", "loop", "squiggle", "ring", "dot", "spark"], cols = ["#ffd166", "#ff6fa0", "#5efce8", "#b388ff", "#ffffff"];
      this.items = Array.from({ length: 22 }, (_, i) => ({
        k: kinds[i % kinds.length], x: Math.random() * w, y: Math.random() * h, s: 7 + Math.random() * 13,
        v: 6 + Math.random() * 14, r: Math.random() * 6.3, vr: (Math.random() - .5) * .5, c: cols[i % cols.length], a: .1 + Math.random() * .16, p: Math.random() * 6.3
      }));
    }
    return c.getContext("2d");
  },
  start() { this.stop(); const loop = t => { this.draw(t / 1000); if (!reducedMotion) this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); },
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; },
  draw(t) {
    const g = this.init(); if (!g) return;
    const dt = this.last ? Math.min(.05, t - this.last) : 0; this.last = t;
    g.clearRect(0, 0, this.w, this.h);
    g.lineCap = "round"; g.lineJoin = "round";
    for (const d of this.items) {
      d.y -= d.v * dt; d.r += d.vr * dt; d.x += Math.sin(t * .4 + d.p) * 4 * dt;
      if (d.y < -30) { d.y = this.h + 30; d.x = Math.random() * this.w; }
      g.save(); g.translate(d.x, d.y); g.rotate(d.r);
      g.globalAlpha = d.a * (.75 + .25 * Math.sin(t * 1.3 + d.p));
      g.strokeStyle = d.c; g.fillStyle = d.c; g.lineWidth = 2.2;
      const z = d.s; g.beginPath();
      if (d.k === "star") { for (let j = 0; j < 10; j++) { const rr = j % 2 ? z * .42 : z, an = j * Math.PI / 5 - Math.PI / 2; j ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.closePath(); g.stroke(); }
      else if (d.k === "loop") { for (let j = 0; j <= 40; j++) { const an = j / 40 * Math.PI * 3.2, rr = z * .2 + j / 40 * z * .8; j ? g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : g.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } g.stroke(); }
      else if (d.k === "squiggle") { g.moveTo(-z, 0); for (let j = 1; j <= 4; j++) g.quadraticCurveTo(-z + (j - .5) * z / 2, (j % 2 ? -1 : 1) * z * .5, -z + j * z / 2, 0); g.stroke(); }
      else if (d.k === "ring") { g.arc(0, 0, z * .6, 0, 7); g.stroke(); }
      else if (d.k === "spark") { for (let j = 0; j < 4; j++) { g.moveTo(0, 0); const an = j * Math.PI / 2; g.lineTo(Math.cos(an) * z * .7, Math.sin(an) * z * .7); } g.stroke(); }
      else { g.arc(0, 0, z * .22, 0, 7); g.fill(); }
      g.restore();
    }
    g.globalAlpha = 1;
  }
};

/* transition « tache d'encre » : la couleur de la carte s'étend depuis le doigt */
function inkGo(e, color, fn) {
  if (reducedMotion) { fn(); return; }
  const el = e && e.currentTarget, rc = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const x = e && e.clientX ? e.clientX : rc.left + rc.width / 2, y = e && e.clientY ? e.clientY : rc.top + rc.height / 2;
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
  const ov = document.createElement("div"); ov.className = "inkT"; ov.style.background = color;
  document.body.appendChild(ov);
  $("home").classList.add("leaving");
  const a = ov.animate([{ clipPath: "circle(0px at " + x + "px " + y + "px)" }, { clipPath: "circle(" + R + "px at " + x + "px " + y + "px)" }],
    { duration: 420, easing: "cubic-bezier(.55,0,.35,1)", fill: "forwards" });
  a.onfinish = () => {
    $("home").classList.remove("leaving");
    fn();
    ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: "ease-out", fill: "forwards" }).onfinish = () => ov.remove();
  };
}
/* onde sous le doigt */
document.addEventListener("pointerdown", e => {
  if (reducedMotion) return;
  const b = e.target.closest(".navcard, .navWide, .heroPlay, .loginBanner, .dailyBtn"); if (!b) return;
  const rc = b.getBoundingClientRect(), d = Math.max(rc.width, rc.height) * 2.2;
  const r = document.createElement("span"); r.className = "ripple";
  r.style.cssText = "left:" + (e.clientX - rc.left) + "px;top:" + (e.clientY - rc.top) + "px;width:" + d + "px;height:" + d + "px";
  b.appendChild(r); setTimeout(() => r.remove(), 600);
}, { passive: true });
/* compteur de pièces qui défile */
let coinShown = null, coinRaf = 0;
function tweenCoins(el, to) {
  const from = coinShown == null ? to : coinShown;
  cancelAnimationFrame(coinRaf);
  if (from === to || reducedMotion) { coinShown = to; el.textContent = "🪙 " + to; return; }
  const t0 = performance.now(), dur = Math.min(900, 250 + Math.abs(to - from) * 6);
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); coinShown = Math.round(from + (to - from) * e); el.textContent = "🪙 " + coinShown; if (k < 1) coinRaf = requestAnimationFrame(step); };
  coinRaf = requestAnimationFrame(step);
}

/* ---------- Boutique ---------- */
let shopTab = "coins";
function openShop() {
  refreshCoinUI(); renderShop(); show("shop");
}
function skinPreview(ctx, sk, size) {
  const t = performance.now() / 1000;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  if (sk.acc) { const r = size * .26; ctx.translate(size / 2, size * .64 + Math.sin(t * 2) * size * .015); paintSkin(ctx, r, sk, t); paintEyes(ctx, r, 0, 0); paintAccessory(ctx, r, sk, t); }
  else { const r = size * .38; ctx.translate(size / 2, size / 2); paintSkin(ctx, r, sk, t); paintEyes(ctx, r, 0, 0); }
  ctx.restore();
}
let shopAnim = [], shopRaf = 0;
function shopLoop() {
  if ($("shop").classList.contains("hidden")) { shopRaf = 0; return; }
  for (const [cv, sk, fn] of shopAnim) fn ? fn() : skinPreview(cv.getContext("2d"), sk, cv.width);
  shopRaf = requestAnimationFrame(shopLoop);
}
function renderShop() {
  shopAnim = [];
  $("tabCoins").classList.toggle("on", shopTab === "coins");
  $("tabPremium").classList.toggle("on", shopTab === "premium");
  const grid = $("shopGrid"); grid.innerHTML = "";
  if (shopTab === "coins") {   // aperçu des exclusifs en haut de l'onglet pièces
    const tz = document.createElement("button"); tz.className = "premTeaser";
    const cv = document.createElement("canvas"); cv.width = 270; cv.height = 90;
    tz.appendChild(cv);
    tz.insertAdjacentHTML("beforeend", "<span><b>8 skins exclusifs</b><small>Chapeaux, couronne, casque et plus</small></span><i>Voir</i>");
    tz.onclick = () => { shopTab = "premium"; Snd.pop(); renderShop(); };
    grid.appendChild(tz);
    const prem = ["galaxy", "unicorn", "astro"].map(id => SKINS.find(x => x.id === id));
    const drawTz = () => { const g = cv.getContext("2d"); g.clearRect(0, 0, 270, 90); prem.forEach((sk, i) => { g.save(); g.translate(i * 90, 0); skinPreviewAt(g, sk, 90); g.restore(); }); };
    drawTz(); shopAnim.push([cv, null, drawTz]);
  }
  const list = SKINS.filter(s => s.id !== "classic" && (shopTab === "premium" ? s.premium : !s.premium));
  for (const sk of list) {
    const owned = Skins.has(sk.id), equipped = Skins.selected() === sk.id;
    const card = document.createElement("div");
    card.className = "skin-card" + (owned ? " owned" : "") + (equipped ? " equipped" : "") + (sk.premium ? " prem" : "");
    const size = sk.premium ? 150 : 96;
    const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
    card.appendChild(cv);
    const info = sk.premium ? document.createElement("div") : card;
    if (sk.premium) { info.className = "premInfo"; card.appendChild(info); card.insertAdjacentHTML("afterbegin", '<span class="ribbon">Exclusif</span>'); }
    const b = document.createElement("b"); b.textContent = sk.name; info.appendChild(b);
    if (sk.tag) { const tg = document.createElement("small"); tg.className = "pattag"; tg.textContent = sk.tag; info.appendChild(tg); }
    if (sk.perks) { const ul = document.createElement("ul"); ul.className = "perks"; ul.innerHTML = sk.perks.map(p => "<li>" + p + "</li>").join(""); info.appendChild(ul); }
    if (sk.pat === "stars" || sk.pat === "facets" || sk.acc) shopAnim.push([cv, sk]);
    const btn = document.createElement("button");
    if (equipped) { btn.textContent = "Équipé"; btn.disabled = true; }
    else if (owned) { btn.textContent = "Équiper"; btn.className = "primary"; btn.onclick = () => { Skins.select(sk.id); Snd.pop(); renderShop(); drawHomePreview(); }; }
    else if (sk.premium) { btn.innerHTML = "Acheter " + sk.priceLabel; btn.onclick = () => Skins.buy(sk); }
    else { btn.innerHTML = "🪙 " + sk.price; btn.onclick = () => { Skins.buy(sk); renderShop(); }; }
    info.appendChild(btn);
    grid.appendChild(card);
    skinPreview(cv.getContext("2d"), sk, size);
  }
  if (!shopRaf && shopAnim.length && !reducedMotion) shopRaf = requestAnimationFrame(shopLoop);
}
function skinPreviewAt(g, sk, size) {
  const t = performance.now() / 1000, r = size * .26;
  g.save(); g.translate(0, size * .64 + Math.sin(t * 2 + (sk.id === "diamond" ? 1.5 : 0)) * size * .015);
  paintSkin(g, r, sk, t); paintEyes(g, r, 0, 0); paintAccessory(g, r, sk, t); g.restore();
}
$("tabCoins").onclick = () => { shopTab = "coins"; Snd.pop(); renderShop(); };
$("tabPremium").onclick = () => { shopTab = "premium"; Snd.pop(); renderShop(); };

/* ---------- Sons & vibrations ---------- */
const Snd = {
  on: store.get("tr_snd") !== false, ac: null, last: 0,
  unlock() {
    if (!this.on) return;
    try {
      if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ac.state === "suspended") this.ac.resume();
    } catch (e) {}
  },
  tone(f, d, type, v, slide, delay) {
    if (!this.on || !this.ac) return;
    const a = this.ac, t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(v || .07, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .03);
  },
  pop()    { this.tone(500, .1, "triangle", .07, 380); },
  launch() { this.tone(300, .18, "sawtooth", .04, 500); },
  tick(sp) { const n = performance.now(); if (n - this.last < 70) return; this.last = n; this.tone(260 + Math.min(500, sp * .35), .07, "triangle", .05, -60); },
  boing()  { this.tone(220, .28, "sine", .09, 520); },
  star(k)  { this.tone(660 + k * 190, .32, "triangle", .09, 240); },
  win()    { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .28, "triangle", .08, 0, i * .09)); },
  lose()   { this.tone(300, .45, "sawtooth", .05, -230); },
  set(on)  { this.on = on; store.set("tr_snd", on); if (on) this.unlock(); }
};
const vibOn = () => store.get("tr_vib") !== false;
const vib = p => { try { if (vibOn() && navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
document.addEventListener("pointerdown", () => Snd.unlock(), { passive: true });


/* ---------- Plateforme ---------- */
const Native = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
const Plug = name => (window.Capacitor && Capacitor.Plugins) ? Capacitor.Plugins[name] : null;

/* ---------- Connexion Google ---------- */
function decodeJwt(t) {
  const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(atob(b).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
  return JSON.parse(json);
}
function setUser(p, idToken) {
  const guest = store.get("tr_prog_guest");
  user = { id: p.id || p.sub, name: p.givenName || p.given_name || p.name || "Joueur", picture: p.imageUrl || p.picture || "", email: p.email || "" };
  store.set("tr_user", user);
  // la progression jouée en invité est reprise dans le compte
  if (guest && guest.some(x => x !== 0)) store.set(progKey(), mergeProg(getProg(), guest, LEVELS.length));
  Coins.onLogin(); Meta.onLogin();
  showHome();
  Cloud.login(idToken);
}
function onGoogle(resp) {
  try { setUser(decodeJwt(resp.credential), resp.credential); } catch (e) { toast("Connexion impossible"); }
}
let slReady = false;
async function nativeGoogle() {
  const SL = Plug("SocialLogin");
  if (!SL) return toast("Connexion indisponible");
  try {
    if (!slReady) { await SL.initialize({ google: { webClientId: CFG.GOOGLE_WEB_CLIENT_ID } }); slReady = true; }
    const res = await SL.login({ provider: "google", options: {} });
    const r = res.result || {};
    setUser(r.profile || (r.idToken ? decodeJwt(r.idToken) : {}), r.idToken);
  } catch (e) {
    console.error(e);
    toast("Connexion annulée ou impossible");
    alert("Détail de l'erreur de connexion :\n" + (e && (e.message || JSON.stringify(e))));
  }
}
function initGoogle() {
  const note = $("gnote");
  if (CFG.GOOGLE_WEB_CLIENT_ID.startsWith("VOTRE_")) {
    note.textContent = "Connexion Google : ajoute ton Client ID dans www/config.js";
    note.classList.remove("hidden");
    return;
  }
  if (Native) {
    $("gnative").classList.remove("hidden");
    $("gnative").onclick = nativeGoogle;
    return;
  }
  // Navigateur : bouton Google Identity Services
  if (!window.google || !window.google.accounts) {
    if (!initGoogle.loaded) {
      initGoogle.loaded = true;
      const sc = document.createElement("script");
      sc.src = "https://accounts.google.com/gsi/client"; sc.async = true;
      document.head.appendChild(sc);
    }
    if ((initGoogle.tries = (initGoogle.tries || 0) + 1) < 20) return setTimeout(initGoogle, 300);
    note.textContent = "Google indisponible (hors ligne ?).";
    note.classList.remove("hidden");
    return;
  }
  google.accounts.id.initialize({ client_id: CFG.GOOGLE_WEB_CLIENT_ID, callback: onGoogle, auto_select: false });
  google.accounts.id.renderButton($("gbtn"), { theme: "filled_blue", size: "large", shape: "pill", text: "signin_with", locale: "fr", width: 280 });
}

/* ---------- Publicités AdMob ---------- */
const Ads = {
  ready: false, wins: 0, lastInter: 0,
  ids() {
    const A = CFG.ADS;
    return A.test
      ? { banner: "ca-app-pub-3940256099942544/6300978111", inter: "ca-app-pub-3940256099942544/1033173712", reward: "ca-app-pub-3940256099942544/5224354917" }
      : { banner: A.banner, inter: A.interstitial, reward: A.rewarded };
  },
  setBanner(h) { document.documentElement.style.setProperty("--banner", (h || 0) + "px"); if (game && !game.classList.contains("hidden")) { fit(); render(); } },
  async init() {
    const AdMob = Plug("AdMob");
    if (!Native || !AdMob || CFG.ADS.enabled !== true) return;
    try {
      let info = await AdMob.requestConsentInfo();
      if (info && info.isConsentFormAvailable && info.status === "REQUIRED") info = await AdMob.showConsentForm();
      this.ready = !info || info.canRequestAds !== false;
      $("adprefs").classList.toggle("hidden", !(info && info.privacyOptionsRequirementStatus === "REQUIRED"));
    } catch (e) { report(e, "pubs:consentement"); this.ready = true; }
    if (!this.ready) return;
    try {
      await AdMob.initialize({ initializeForTesting: !!CFG.ADS.test });
      AdMob.addListener("bannerAdSizeChanged", s => this.setBanner(s && s.height));
      await AdMob.showBanner({ adId: this.ids().banner, adSize: "ADAPTIVE_BANNER", position: "BOTTOM_CENTER", margin: 0, isTesting: !!CFG.ADS.test });
      this.prepareInter();
    } catch (e) { report(e, "pubs:initialisation"); this.ready = false; }
  },
  async prepareInter() {
    try { await Plug("AdMob").prepareInterstitial({ adId: this.ids().inter, isTesting: !!CFG.ADS.test }); } catch (e) {}
  },
  /* Interstitiel : toutes les 2 victoires, max 1 par 90 s */
  async interstitialIfDue() {
    if (!Native || !this.ready) return;
    this.wins++;
    if (this.wins % 2 !== 0 || Date.now() - this.lastInter < 90000) return;
    try { await Plug("AdMob").showInterstitial(); this.lastInter = Date.now(); } catch (e) {}
    this.prepareInter();
  },
  /* Vidéo récompensée : renvoie true si le joueur a gagné la récompense */
  async rewarded() {
    if (!Native) return confirm("Mode navigateur : simuler le visionnage d'une pub ?");
    const AdMob = Plug("AdMob");
    if (!this.ready || !AdMob) { toast("Pub indisponible pour le moment"); return false; }
    let got = false, h = null;
    try { h = await AdMob.addListener("onRewardedVideoAdReward", () => { got = true; }); } catch (e) {}
    try {
      await AdMob.prepareRewardVideoAd({ adId: this.ids().reward, isTesting: !!CFG.ADS.test });
      const r = await AdMob.showRewardVideoAd();
      if (r && typeof r.amount === "number") got = true;
    } catch (e) { report(e, "pubs:vidéo bonus"); toast("Pub indisponible pour le moment"); }
    try { h && h.remove(); } catch (e) {}
    return got;
  }
};


/* ---------- Navigation ---------- */
function show(id) {
  for (const s of ["login", "home", "menu", "shop", "settings", "duel", "pseudo", "leaderboard", "ach", "game"]) $(s).classList.toggle("hidden", s !== id);
  if (id === "home") { Hero.start(); HomeBg.start(); } else { Hero.stop(); HomeBg.stop(); }
  gameOn = id === "game";
  if (gameOn && !framing) { framing = true; lastT = performance.now(); requestAnimationFrame(frame); }
}
function fillAvatar(el) {
  el.innerHTML = "";
  if (user && user.picture) {
    const img = document.createElement("img");
    img.referrerPolicy = "no-referrer"; img.src = user.picture; img.alt = "";
    el.appendChild(img);
  } else {
    el.textContent = (user ? user.name : "I")[0].toUpperCase();
  }
}
function nextLevel() {
  const p = getProg(), f = p.findIndex(x => x === 0);
  return f === -1 ? -1 : f;
}
function showHome() {
  phase = 0;
  $("win").classList.add("hidden");
  fillAvatar($("avatarH"));
  $("unameH").textContent = user ? (Profile.pseudo() || user.name) : "Invité";
  const first = !homeIntroDone && !reducedMotion;
  $("home").classList.toggle("intro", first);
  if (first) homeIntroDone = true;   // la classe reste jusqu'au prochain affichage, sinon les cartes rejoueraient leur entrée
  show("home");
  if (first) Hero.t0 = performance.now() + 700;
  refreshHomeBits();
  if (!dailyShownThisSession && Daily.state().ready) { dailyShownThisSession = true; setTimeout(() => { if (!$("home").classList.contains("hidden")) openDaily(); }, 650); }
}
/* met à jour tout ce qui change sur l'accueil (sans relancer l'animation) */
function refreshHomeBits() {
  refreshCoinUI();
  Hero.lv = null;   // la scène relira le niveau en cours une seule fois
  const st = playerStats(), n = nextLevel(), w = worldOf(n === -1 ? LEVELS.length - 1 : n);
  $("homeTag").textContent = user ? (Profile.pseudo() ? "Joueur classé" : "Connecté avec Google") : "Mode invité";
  $("hero").style.setProperty("--wtop", w.top); $("hero").style.setProperty("--wbot", w.bot);
  $("heroWorld").textContent = w.icon + " " + w.name;
  $("heroLevel").textContent = n === -1 ? "Campagne terminée" : "Niveau " + (n + 1);
  $("heroPlay").textContent = n === -1 ? "Rejouer pour 3 étoiles" : st.levels ? "▶  Continuer" : "▶  Commencer";
  $("heroStars").textContent = "★ " + st.stars;
  $("heroElo").textContent = "🏅 " + Profile.elo();
  $("heroElo").classList.toggle("hidden", !user);
  $("campagneSub").textContent = st.levels + "/" + LEVELS.length + " niveaux";
  $("duelSub").textContent = st.duels ? st.wins + " victoire" + (st.wins > 1 ? "s" : "") + " sur " + st.duels : "Duel en direct";
  const ready = achReady().length, card = $("navAch");
  let badge = card.querySelector(".badge");
  if (ready) { if (!badge) { badge = document.createElement("span"); badge.className = "badge"; card.appendChild(badge); } badge.textContent = ready; }
  else if (badge) badge.remove();
  $("achSub").textContent = ready ? ready + " à récupérer" : Meta.get().ach.length + "/" + ACH.length + " obtenus";
  $("loginBanner").classList.toggle("hidden", !!user);
  const d = Daily.state();
  $("dailyBtn").classList.toggle("hidden", !d.ready);
  $("dailySub").textContent = "Jour " + d.streak + " · 🪙 " + DAILY[d.idx] + " à gagner";
}
function drawHomePreview() { if (!$("home").classList.contains("hidden")) refreshHomeBits(); }

/* ---------- Scène animée de l'accueil : le crayon trace, la balle roule jusqu'à la cible ----------
   La bille suit la courbe lisse (sans le tremblement du trait dessiné) et sa vitesse est
   simulée avec la gravité : elle accélère en descente et ralentit en remontée. */
const Hero = {
  raf: 0, t0: 0, cw: 0, ch: 0, conf: [], lastT: 0,
  lv: null,
  start() {
    this.stop(); this.t0 = performance.now(); this.conf = []; this.lastT = 0; this.lv = null;
    const loop = t => { this.draw(Math.max(0, (t - this.t0) / 1000)); if (!reducedMotion) this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; },
  setup() {
    const c = $("heroCv"), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth || 340, h = c.clientHeight || 150;
    if (w === this.cw && h === this.ch && this.path) return c.getContext("2d");
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); this.cw = w; this.ch = h;
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const P0 = [w * .12, h * .3], C = [w * .42, h * 1.08], P2 = [w * .74, h * .58];
    const B = u => { const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u; return [a * P0[0] + b * C[0] + d * P2[0], a * P0[1] + b * C[1] + d * P2[1]]; };
    // courbe lisse échantillonnée finement, avec abscisse curviligne
    const N = 300, path = []; let L = 0;
    for (let i = 0; i <= N; i++) { const p = B(i / N); if (i) L += Math.hypot(p[0] - path[i - 1].x, p[1] - path[i - 1].y); path.push({ x: p[0], y: p[1], s: L }); }
    for (let i = 0; i <= N; i++) {   // tangente et normale (vers le haut)
      const a = path[Math.max(0, i - 1)], b = path[Math.min(N, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
      path[i].tx = dx / l; path[i].ty = dy / l; path[i].nx = dy / l; path[i].ny = -dx / l;
    }
    this.path = path; this.L = L;
    // trait dessiné : même courbe + léger tremblement, avec longueur cumulée pour un tracé continu
    const ink = []; let IL = 0;
    for (let i = 0; i <= 90; i++) {
      const p = B(i / 90), j = Math.sin(i * .42) * .9 + Math.sin(i * .13 + 1) * .9;
      const q = [p[0], p[1] + j]; if (i) IL += Math.hypot(q[0] - ink[i - 1][0], q[1] - ink[i - 1][1]); ink.push(q);
    }
    this.ink = ink; this.inkL = IL;
    // simulation de la descente : ds/dt = v, dv/dt = g·(dy/ds) − frottement
    const G = h * 5.2, sim = [[0, 0]]; let sP = 0, v = h * .25, tt = 0;
    while (sP < L && tt < 6) {
      const st = this.at(sP); v += (G * st.ty - .35 * v) / 240; v = Math.max(v, h * .12);
      sP += v / 240; tt += 1 / 240; sim.push([tt, Math.min(sP, L)]);
    }
    this.sim = sim; this.ride = tt; this.vEnd = v;
    this.goal = [w * .87, h * .4];
    return g;
  },
  at(sv) {   // point de la courbe lisse à l'abscisse curviligne sv
    const p = this.path; let lo = 0, hi = p.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m].s < sv) lo = m; else hi = m; }
    const a = p[lo], b = p[hi], k = b.s > a.s ? (sv - a.s) / (b.s - a.s) : 0;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, tx: a.tx + (b.tx - a.tx) * k, ty: a.ty + (b.ty - a.ty) * k, nx: a.nx + (b.nx - a.nx) * k, ny: a.ny + (b.ny - a.ny) * k };
  },
  sAt(t) {   // abscisse atteinte au temps t de la descente
    const sm = this.sim; if (t <= 0) return 0; if (t >= this.ride) return this.L;
    const i = Math.min(sm.length - 2, Math.floor(t * 240)), a = sm[i], b = sm[i + 1];
    return a[1] + (b[1] - a[1]) * ((t - a[0]) / ((b[0] - a[0]) || 1));
  },
  draw(t) {
    const g = this.setup(), w = this.cw, h = this.ch;
    const dt = this.lastT ? Math.min(.05, t - this.lastT) : 1 / 60; this.lastT = t;
    if (!this.lv) { const nl = nextLevel(); this.lv = { n: nl, world: worldOf(nl === -1 ? LEVELS.length - 1 : nl) }; }
    const world = this.lv.world, sk = Skins.current();
    const r = 13, DRAW = 1.0, DROP0 = .85, RIDE0 = 1.15, FLY = .55;
    const FLY0 = RIDE0 + this.ride, END = FLY0 + FLY, CYCLE = END + 1.1;
    const ct = reducedMotion ? RIDE0 + this.ride * .45 : t % CYCLE;
    const easeIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    g.clearRect(0, 0, w, h);
    // poussière lumineuse du monde (mouvement continu)
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97.3 + t * (6 + i % 4)) % (w + 20)) - 10, y = (i * 41.7) % h, tw = .5 + .5 * Math.sin(t * 2 + i);
      g.globalAlpha = .12 + .25 * tw; g.fillStyle = world.glow; g.beginPath(); g.arc(x, y, 1.2 + (i % 3), 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    // cible qui respire, et qui s'illumine à l'arrivée
    const hitK = ct > END - .05 && ct < END + .6 ? 1 - (ct - (END - .05)) / .65 : 0;
    const pulse = 1 + .07 * Math.sin(t * 4.2) + .25 * hitK;
    g.save(); g.translate(this.goal[0], this.goal[1]);
    g.fillStyle = world.glow; g.globalAlpha = .2 + .3 * hitK; g.beginPath(); g.arc(0, 0, 24 * pulse, 0, 7); g.fill();
    g.globalAlpha = 1; g.strokeStyle = world.glow; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, 15 * pulse, 0, 7); g.stroke();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 4.5, 0, 7); g.fill();
    g.restore();
    // 1) le trait se dessine en continu
    const dk = easeIO(Math.min(1, ct / DRAW)), fade = ct > CYCLE - .45 ? Math.max(0, (CYCLE - ct) / .45) : 1;
    const drawn = this.inkL * dk;
    g.lineCap = "round"; g.lineJoin = "round"; g.globalAlpha = fade;
    g.setLineDash([drawn, this.inkL + 10]);
    g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 9; g.beginPath();
    this.ink.forEach((p, i) => i ? g.lineTo(p[0], p[1] + 3) : g.moveTo(p[0], p[1] + 3)); g.stroke();
    g.strokeStyle = world.ink; g.lineWidth = 6.5; g.beginPath();
    this.ink.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
    // crayon au bout du trait
    if (ct < DRAW + .25) {
      let acc = 0, tip = this.ink[0], ang = 0;
      for (let i = 1; i < this.ink.length; i++) {
        const a = this.ink[i - 1], b = this.ink[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (acc + l >= drawn) { const k = (drawn - acc) / l; tip = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); break; }
        acc += l; tip = b;
      }
      const lift = ct > DRAW ? (ct - DRAW) / .25 : 0;
      g.save(); g.globalAlpha = 1 - lift; g.translate(tip[0], tip[1] - lift * 14); g.rotate(-.8 + Math.sin(ang) * .15);
      g.fillStyle = "#f5c86a"; g.fillRect(0, -5, 34, 10);
      g.fillStyle = "#e9ad3f"; g.fillRect(0, 1.5, 34, 3.5);
      g.fillStyle = "#c9cde0"; g.fillRect(30, -5, 4, 10);
      g.fillStyle = "#ff6f91"; g.fillRect(34, -5, 7, 10);
      g.fillStyle = "#f3dcb5"; g.beginPath(); g.moveTo(0, -5); g.lineTo(-10, 0); g.lineTo(0, 5); g.fill();
      g.fillStyle = world.ink; g.beginPath(); g.moveTo(-6, -2); g.lineTo(-10, 0); g.lineTo(-6, 2); g.fill();
      g.restore();
    }
    // 2) la bille tombe, roule avec la gravité, puis s'envole vers la cible
    let bx, by, sc = 1, sqx = 1, sqy = 1, rot = 0, show = ct >= DROP0;
    const p0 = this.at(0), rest0 = [p0.x + p0.nx * r, p0.y + p0.ny * r];
    if (ct < RIDE0) {
      const k = Math.min(1, (ct - DROP0) / (RIDE0 - DROP0 - .1));
      bx = rest0[0]; by = rest0[1] - 46 * (1 - k * k);
      const land = ct - (DROP0 + (RIDE0 - DROP0 - .1));   // petit écrasement à l'atterrissage
      if (land > 0) { const q = Math.sin(Math.min(1, land / .1) * Math.PI) * .22; sqx = 1 + q; sqy = 1 - q; }
    } else if (ct < FLY0) {
      const sv = this.sAt(ct - RIDE0), p = this.at(sv);
      bx = p.x + p.nx * r; by = p.y + p.ny * r; rot = sv / r;
    } else if (ct < END) {
      const k = (ct - FLY0) / FLY, e = 1 - Math.pow(1 - k, 2);
      const pe = this.at(this.L), s0 = [pe.x + pe.nx * r, pe.y + pe.ny * r];
      const ctl = [s0[0] + pe.tx * 40, s0[1] + pe.ty * 40 - 34];
      bx = (1 - e) * (1 - e) * s0[0] + 2 * (1 - e) * e * ctl[0] + e * e * this.goal[0];
      by = (1 - e) * (1 - e) * s0[1] + 2 * (1 - e) * e * ctl[1] + e * e * this.goal[1];
      sc = 1 - .8 * k * k * k; rot = this.L / r + k * 6;
      if (k > .92 && !this.conf.length && !reducedMotion) for (let i = 0; i < 18; i++) { const a = Math.random() * 6.3, sp = 70 + Math.random() * 150; this.conf.push({ x: this.goal[0], y: this.goal[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, c: CONF[i % CONF.length], l: 0, rr: Math.random() * 6 }); }
    } else show = false;
    if (show) {
      g.save(); g.translate(bx, by);
      g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(2, r * .95, r * .8 * sc, r * .22 * sc, 0, 0, 7); g.fill();
      g.scale(sc * sqx, sc * sqy);
      g.save(); g.rotate(sk.pat ? rot : 0); paintSkin(g, r, sk, t); g.restore();
      paintEyes(g, r, .6, .3);
      paintAccessory(g, r, sk, t);
      g.restore();
    }
    // confettis (pas de temps réel, pour rester fluide quel que soit le téléphone)
    this.conf = this.conf.filter(c => (c.l += dt) < 1.1);
    for (const c of this.conf) {
      c.vy += 420 * dt; c.vx *= 1 - 1.2 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rr += dt * 8;
      g.save(); g.globalAlpha = Math.max(0, 1 - c.l / 1.1); g.translate(c.x, c.y); g.rotate(c.rr); g.fillStyle = c.c; g.fillRect(-2.5, -1.5, 5, 3); g.restore();
    }
    g.globalAlpha = 1;
    if (ct < .1) this.conf = [];
  }
};
function showMenu() {
  phase = 0;
  $("win").classList.add("hidden");
  $("uname").textContent = user ? user.name : "Invité";
  fillAvatar($("avatar"));
  $("snd").textContent = Snd.on ? "🔊 Son : activé" : "🔇 Son : coupé";
  $("logout").textContent = user ? "Quitter / changer de compte" : "Se connecter";
  paintCloud();
  buildMenu();
  show("menu");
  const n = $("worlds").querySelector(".tile.now");
  if (n) setTimeout(() => n.scrollIntoView({ block: "center", behavior: "smooth" }), 450);
}
function paintErrBtn() {
  const n = errorLog().length, b = $("errBtn");
  b.classList.toggle("hidden", !n); b.textContent = "🧰 Copier le rapport d'erreurs (" + n + ")";
}
async function copyErrorLog() {
  const text = JSON.stringify({ app: "Trace & Roule", ua: navigator.userAgent, errors: errorLog() }, null, 1);
  try { await navigator.clipboard.writeText(text); toast("Rapport copié, colle-le dans un message", true); }
  catch (e) { prompt("Copie ce rapport :", text); }
}
function showSettings() {
  paintErrBtn();
  paintVib();
  $("uname").textContent = user ? user.name : "Invité";
  fillAvatar($("avatar"));
  $("ustarsS").textContent = "";
  $("snd").textContent = Snd.on ? "🔊 Son : activé" : "🔇 Son : coupé";
  $("logout").textContent = user ? "Quitter / changer de compte" : "Se connecter";
  paintCloud();
  show("settings");
}
function buildMenu() {
  const p = getProg();
  const first0 = p.findIndex(s => s === 0);
  const maxOpen = first0 === -1 ? LEVELS.length - 1 : first0;
  const total = p.reduce((a, b) => a + Math.max(0, b), 0);
  $("ustars").innerHTML = "★ " + total + " <i>/ " + LEVELS.length * 3 + "</i>";
  requestAnimationFrame(() => { $("pbar").style.width = (100 * total / (LEVELS.length * 3)) + "%"; });
  const box = $("worlds"); box.innerHTML = "";
  let k = 0;
  WORLDS.forEach((w, wi) => {
    const from = wi * WORLD_SIZE, to = Math.min(LEVELS.length, from + WORLD_SIZE);
    if (from >= LEVELS.length) return;
    let st = 0; for (let i = from; i < to; i++) st += Math.max(0, p[i]);
    const sec = document.createElement("section");
    sec.className = "world";
    sec.style.setProperty("--c1", w.c1); sec.style.setProperty("--c2", w.c2);
    sec.innerHTML = '<div class="wh"><span class="wi">' + w.icon + '</span><div><b>' + w.name + '</b><small>Niveaux ' + (from + 1) + ' à ' + to + '</small></div><span class="wst">★ ' + st + '/' + (to - from) * 3 + '</span></div><div class="tiles"></div>';
    const tiles = sec.querySelector(".tiles");
    for (let i = from; i < to; i++) {
      const b = document.createElement("button");
      const locked = i > maxOpen;
      b.className = "tile" + (locked ? " locked" : "") + (i === maxOpen ? " now" : "");
      b.style.setProperty("--i", k++);
      b.disabled = locked;
      b.setAttribute("aria-label", "Niveau " + (i + 1));
      b.innerHTML = locked ? '<span class="lock">🔒</span>'
        : '<span class="num">' + (i + 1) + '</span><small>' + (p[i] > 0 ? "★".repeat(p[i]) + "☆".repeat(3 - p[i]) : p[i] === -1 ? "⏭" : "") + '</small>';
      b.onclick = () => { Snd.pop(); startLevel(i); };
      tiles.appendChild(b);
    }
    box.appendChild(sec);
  });
}
/* état de la sauvegarde affiché sous le nom */
function paintCloud() {
  const el = $("cloud"); if (!el) return;
  let t = "";
  if (!user) t = "Invité · non sauvegardé dans le cloud";
  else if (!Cloud.enabled()) t = "Sauvegarde sur cet appareil";
  else t = { ok: "☁️ Progression sauvegardée", sync: "☁️ Synchronisation…", err: "⚠️ Hors ligne · sauvegarde locale", relog: "🔑 Reconnecte-toi pour sauvegarder", off: "" }[Cloud.status] || "";
  el.textContent = t;
  el.onclick = () => alert("Statut cloud : " + Cloud.status + "\nDétail : " + (Cloud.msg || "(aucun détail)") + "\nActivé : " + Cloud.enabled() + "\nUtilisateur : " + (user ? user.id : "aucun"));
}
function logout() {
  Cloud.clear();
  store.del("tr_user"); user = null;
  try { const SL = Plug("SocialLogin"); if (Native && SL) SL.logout({ provider: "google" }); } catch (e) {}
  if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
  show("login");
}
