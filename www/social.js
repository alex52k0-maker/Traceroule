/* Trace & Roule : profil public, classement, pseudo, duel 1 vs 1, succès et récompense du jour. */
/* ---------- Profil public (pseudo, classement, côte 1v1) ---------- */
const Profile = {
  pseudoKey() { return "tr_pseudo_" + (user ? user.id : "x"); },
  eloKey() { return "tr_elo_" + (user ? user.id : "x"); },
  pseudo() { return store.get(this.pseudoKey()) || ""; },
  hasPseudo() { return !!this.pseudo(); },
  setPseudo(p) { store.set(this.pseudoKey(), p); },
  elo() { const v = store.get(this.eloKey()); return typeof v === "number" ? v : 1000; },
  setElo(v) { store.set(this.eloKey(), v); },
  statsNow() {
    const p = getProg();
    const levels = p.filter(x => x !== 0).length;
    const stars = p.reduce((a, b) => a + Math.max(0, b), 0);
    return { levels, stars };
  },
  /* publie le profil public (lisible par tout joueur connecté, pour le classement) */
  async publish() {
    if (!Cloud.enabled() || !Cloud.auth || !user || !this.hasPseudo()) return;
    const { levels, stars } = this.statsNow();
    try { await Cloud.setDoc("leaderboard/" + Cloud.auth.uid, { pseudo: this.pseudo(), levels, stars, elo: this.elo(), wins: Meta.get().dw, duels: Meta.get().dd, updated: Date.now() }); }
    catch (e) { report(e, "classement:publication"); }
  },
  /* au retour sur l'appli : si l'appareil n'a plus le pseudo/la côte en local (réinstallation), on les récupère */
  async restore() {
    if (!Cloud.enabled() || !Cloud.auth) return;
    if (this.hasPseudo()) return;
    try {
      const d = await Cloud.getDoc("leaderboard/" + Cloud.auth.uid);
      if (d && d.pseudo) { this.setPseudo(d.pseudo); if (typeof d.elo === "number") this.setElo(d.elo); }
    } catch (e) { report(e, "profil:restauration"); }
  }
};

/* ---------- Classement ---------- */
const LB_TABS = [
  { id: "elo",    label: "Côte 1v1",  field: "elo" },
  { id: "stars",  label: "Étoiles",   field: "stars" },
  { id: "levels", label: "Niveaux",   field: "levels" }
];
let lbTab = "elo";
let lbFrom = "home";
async function openLeaderboard(from) {
  if (from) lbFrom = from;
  if (!user) { toast("Connecte-toi avec Google pour voir le classement"); return; }
  if (!Profile.hasPseudo()) { askPseudo(() => openLeaderboard(from)); return; }
  show("leaderboard");
  renderLbTabs();
  await loadLeaderboard();
}
function renderLbTabs() {
  const row = $("lbTabs"); row.innerHTML = "";
  for (const t of LB_TABS) {
    const b = document.createElement("button");
    b.className = "shoptab" + (lbTab === t.id ? " on" : "");
    b.textContent = t.label;
    b.onclick = () => { lbTab = t.id; Snd.pop(); renderLbTabs(); loadLeaderboard(); };
    row.appendChild(b);
  }
}
async function loadLeaderboard() {
  const list = $("lbList");
  list.innerHTML = '<p class="lbLoading">Chargement…</p>';
  if (!Cloud.enabled() || !Cloud.auth) { list.innerHTML = '<p class="lbLoading">Classement indisponible hors ligne.</p>'; return; }
  try {
    const field = LB_TABS.find(t => t.id === lbTab).field;
    const myUid0 = Cloud.auth.uid;
    const rows = (await Cloud.query("leaderboard", field, 80)).filter(r => r.id === myUid0 || (r.levels || 0) > 0 || (r.duels || 0) > 0).slice(0, 50);
    list.innerHTML = "";
    const myUid = Cloud.auth.uid;
    let myRank = rows.findIndex(r => r.id === myUid);
    rows.forEach((r, i) => list.appendChild(lbRow(i + 1, r, r.id === myUid)));
    if (myRank === -1) {
      const mine = await Cloud.getDoc("leaderboard/" + myUid);
      if (mine) {
        const sep = document.createElement("div"); sep.className = "lbSep"; sep.textContent = "⋯"; list.appendChild(sep);
        list.appendChild(lbRow("?", { ...mine, id: myUid }, true));
      }
    }
    if (!rows.length) list.innerHTML = '<p class="lbEmpty">Aucun joueur classé pour l\'instant.<br>Termine un niveau pour apparaître ici.</p>';
  } catch (e) { list.innerHTML = '<p class="lbLoading">Impossible de charger le classement.</p>'; }
}
function lbRow(rank, r, mine) {
  const row = document.createElement("div");
  const medal = ["🥇", "🥈", "🥉"][rank - 1];
  row.className = "lbRow" + (mine ? " mine" : "") + (medal ? " podium" : "");
  const elo = Math.round(r.elo || 1000), stars = r.stars || 0, levels = r.levels || 0, wins = r.wins || 0;
  const mainLabel = lbTab === "elo" ? "🏅 " + elo : lbTab === "stars" ? "★ " + stars : "🗺️ " + levels + "/" + LEVELS.length;
  row.innerHTML = '<span class="lbRank' + (medal ? ' medal' : '') + '">' + (medal || rank) + '</span>' +
    '<span class="lbName"><b>' + escHtml(cleanPseudo(r.pseudo)) + '</b><small>🗺️ ' + levels + '/' + LEVELS.length + ' · ★ ' + stars + ' · ⚔️ ' + wins + ' victoire' + (wins > 1 ? 's' : '') + '</small></span>' +
    '<span class="lbStats"><span class="main">' + mainLabel + '</span></span>';
  return row;
}

/* ---------- Choix du pseudo ---------- */
let pseudoCb = null;
function askPseudo(cb) {
  pseudoCb = cb || null;
  $("pseudoInput").value = Profile.pseudo();
  $("pseudoErr").classList.add("hidden");
  show("pseudo");
  setTimeout(() => $("pseudoInput").focus(), 200);
}

/* ---------- 1 vs 1 ---------- */
/* Duel en 1 vs 1.
   - Chaque recherche a un identifiant aléatoire « sid ». Le duel est créé sous l'identifiant de la recherche
     du joueur qui attendait : il n'y a donc aucune confusion possible avec un ancien duel.
   - Verrou en deux temps : je me retire d'abord de la file (suppression conditionnelle), puis je réserve
     l'adversaire. Si quelqu'un m'a déjà réservé, ma suppression échoue et je rejoins son duel.
   - Les documents portent « expireAt » : une règle d'expiration Firestore les supprime automatiquement. */
const DUEL_POLL = 1500, DUEL_SEARCH_MAX = 45000, DUEL_WAIT_MAX = 60000, DUEL_STALE = 90000, DUEL_FORFEIT_TIME = 999;
const newSid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), x => x.toString(16).padStart(2, "0")).join("");
const Duel = {
  searching: false, sid: null, matchId: null, opp: null, level: 0, myElo0: 1000, oppElo0: 1000,
  startTS: 0, waiting: false, deadline: 0, pollT: null, waitDeadline: 0, lostSince: 0, resolved: false,

  dayLevel() { return Math.floor(Date.now() / 86400000) % LEVELS.length; },
  queueDoc() { return { uid: Cloud.auth.uid, pseudo: Profile.pseudo(), elo: Math.round(Profile.elo()), ts: Date.now(), sid: this.sid, expireAt: new Date(Date.now() + 10 * 60000) }; },

  async open() {
    $("duelPseudo").textContent = Profile.pseudo() || "—";
    $("duelElo").textContent = Math.round(Profile.elo());
    for (const id of ["duelHome", "duelSearch", "duelFound", "duelResult"]) $(id).classList.add("hidden");
    $("duelHome").classList.remove("hidden");
    show("duel");
  },
  async start() {
    if (!user) { toast("Connecte-toi avec Google pour jouer en 1v1"); return; }
    if (!Profile.hasPseudo()) { askPseudo(() => Duel.start()); return; }
    if (!Cloud.enabled() || !Cloud.auth) { toast("Connexion au cloud indisponible"); return; }
    this.searching = true; this.matchId = null; this.sid = newSid(); this.lostSince = 0; this.resolved = false;
    $("duelHome").classList.add("hidden"); $("duelSearch").classList.remove("hidden");
    try { await Cloud.setDoc("duel_queue/" + Cloud.auth.uid, this.queueDoc()); }
    catch (e) { report(e, "duel:file"); toast("Impossible de rejoindre la file"); this.stopSearch(); this.open(); return; }
    this.deadline = Date.now() + DUEL_SEARCH_MAX;
    this.poll();
  },
  stopSearch() { this.searching = false; clearTimeout(this.pollT); },
  /* annulation volontaire (bouton Annuler ou retour) */
  async cancel(goBack) {
    const was = this.searching; this.stopSearch();
    if (was && Cloud.auth) { try { await Cloud.delDoc("duel_queue/" + Cloud.auth.uid); } catch (e) { report(e, "duel:annulation"); } }
    if (goBack !== false) this.open();
  },
  async poll() {
    if (!this.searching) return;
    if (Date.now() > this.deadline) { toast("Aucun adversaire trouvé, réessaie plus tard"); this.cancel(); return; }
    const me = Cloud.auth.uid;
    try {
      // 1) quelqu'un m'a-t-il réservé ? Le duel porte l'identifiant de MA recherche.
      const mine = await Cloud.getDoc("duels/" + this.sid);
      if (mine && mine.players && mine.players.includes(me)) { this.stopSearch(); return this.matched({ id: this.sid, ...mine }); }
      // 2) sinon, chercher les plus anciens joueurs en attente (3 documents lus, pas toute la collection)
      const q = await Cloud.query("duel_queue", "ts", 4, true);
      const now = Date.now();
      // les entrées abandonnées (appli fermée en pleine recherche) sont retirées au passage
      for (const d of q) if (d.uid && d.uid !== me && now - (d.ts || 0) >= DUEL_STALE) Cloud.delDoc("duel_queue/" + d.uid, true).catch(() => {});
      const cand = q.find(d => d.uid && d.uid !== me && d.sid && now - (d.ts || 0) < DUEL_STALE);
      const meInQueue = q.some(d => d.uid === me);
      if (cand) {
        // verrou : je me retire d'abord de la file ; si c'est impossible, quelqu'un m'a déjà réservé
        const freed = await Cloud.delDoc("duel_queue/" + me, true);
        if (!freed) {
          // déjà réservé par quelqu'un (le duel arrive) ou place perdue : on attend le duel, puis on se réinscrit après 5 s
          if (!this.lostSince) this.lostSince = now;
          else if (now - this.lostSince > 5000) { this.lostSince = 0; await Cloud.setDoc("duel_queue/" + me, this.queueDoc()); }
          this.pollT = setTimeout(() => this.poll(), 400); return;
        }
        this.lostSince = 0;
        const claimed = await Cloud.delDoc("duel_queue/" + cand.uid, true);
        if (claimed) {
          const matchObj = {
            players: [me, cand.uid], sids: [this.sid, cand.sid],
            pseudos: { [me]: Profile.pseudo(), [cand.uid]: cleanPseudo(cand.pseudo) },
            elos: { [me]: Math.round(Profile.elo()), [cand.uid]: Math.round(cand.elo || 1000) },
            level: this.dayLevel(), times: {}, created: Date.now(), expireAt: new Date(Date.now() + 86400000)
          };
          const ok = await Cloud.setDoc("duels/" + cand.sid, matchObj, false);
          if (ok) { this.stopSearch(); return this.matched({ id: cand.sid, ...matchObj }); }
        }
        // réservation ratée : je reviens dans la file avec la même recherche
        await Cloud.setDoc("duel_queue/" + me, this.queueDoc());
      } else if (!meInQueue && q.length < 4) {
        // ma place a disparu sans duel (adversaire parti en pleine réservation) : je me réinscris après 5 s
        if (!this.lostSince) this.lostSince = now;
        else if (now - this.lostSince > 5000) { this.lostSince = 0; await Cloud.setDoc("duel_queue/" + me, this.queueDoc()); }
      } else this.lostSince = 0;
    } catch (e) { report(e, "duel:recherche"); }
    if (this.searching) this.pollT = setTimeout(() => this.poll(), DUEL_POLL);
  },
  matched(doc) {
    this.matchId = doc.id;
    const oppUid = doc.players.find(p => p !== Cloud.auth.uid);
    this.opp = { uid: oppUid, pseudo: cleanPseudo(doc.pseudos && doc.pseudos[oppUid]) };
    this.myElo0 = (doc.elos && doc.elos[Cloud.auth.uid]) || Math.round(Profile.elo());
    this.oppElo0 = (doc.elos && doc.elos[oppUid]) || 1000;
    this.level = doc.level;
    $("duelSearch").classList.add("hidden"); $("duelFound").classList.remove("hidden");
    $("duelVs").textContent = (Profile.pseudo() || "Toi") + " vs " + this.opp.pseudo;
    let n = 3; $("duelCountdown").textContent = n;
    const t = setInterval(() => { n--; if (n <= 0) { clearInterval(t); this.launch(); } else $("duelCountdown").textContent = n; }, 700);
  },
  launch() {
    $("duelFound").classList.add("hidden");
    duelMode = { active: true };
    startLevel(this.level);
    this.startTS = performance.now();
  },
  async submit(myTime) {
    let d = null;
    try { d = await Cloud.patchDoc("duels/" + this.matchId, { times: { [Cloud.auth.uid]: myTime } }, ["times." + Cloud.auth.uid]); }
    catch (e) { report(e, "duel:envoi du temps"); }
    return d;
  },
  async onWin() {
    const elapsed = Math.min(DUEL_FORFEIT_TIME - 1, Math.max(.1, Math.round(performance.now() - this.startTS) / 1000));   // bornes acceptées par les règles Firestore
    duelMode = null;
    $("duelFound").classList.add("hidden"); $("duelResult").classList.remove("hidden");
    $("duelResultBadge").textContent = "⏱️"; $("duelResultTitle").textContent = "Terminé en " + elapsed.toFixed(1) + " s";
    $("duelResultSub").textContent = "En attente de " + this.opp.pseudo + "…";
    show("duel");
    const d = await this.submit(elapsed);
    const oppT = d && d.times && d.times[this.opp.uid];
    if (typeof oppT === "number") return this.resolve(elapsed, oppT);
    this.waiting = true; this.waitDeadline = Date.now() + DUEL_WAIT_MAX;
    this.waitOpp(elapsed);
  },
  /* quitter un duel en cours = défaite (évite d'abandonner pour protéger sa côte) */
  async forfeit() {
    if (!duelMode || !duelMode.active) return;
    duelMode = null;
    await this.submit(DUEL_FORFEIT_TIME);
    this.resolve(DUEL_FORFEIT_TIME, 0, true);
    $("duelResult").classList.remove("hidden"); for (const id of ["duelHome", "duelSearch", "duelFound"]) $(id).classList.add("hidden");
    show("duel");
  },
  async waitOpp(myTime) {
    if (!this.waiting) return;
    if (Date.now() > this.waitDeadline) { this.resolve(myTime, null); return; }
    try {
      const d = await Cloud.getDoc("duels/" + this.matchId);
      const oppT = d && d.times && d.times[this.opp.uid];
      if (typeof oppT === "number") return this.resolve(myTime, oppT);
    } catch (e) { report(e, "duel:attente"); }
    setTimeout(() => this.waitOpp(myTime), DUEL_POLL);
  },
  resolve(myTime, oppTime, forfeited) {
    if (this.resolved) return; this.resolved = true;
    this.waiting = false;
    const won = !forfeited && (oppTime == null || myTime < oppTime);
    const newElo = eloAfter(this.myElo0, this.oppElo0, won);
    Profile.setElo(newElo); Meta.duel(won); Profile.publish();
    Coins.add(won ? 40 : 15, "duel"); announceAch();
    $("duelResultBadge").textContent = won ? "🏆" : forfeited ? "🏳️" : "😔";
    $("duelResultTitle").textContent = won ? "Victoire !" : forfeited ? "Abandon" : "Défaite";
    $("duelResultSub").textContent = (forfeited ? "Tu as quitté le duel · " : oppTime != null ? "Toi : " + myTime.toFixed(1) + "s · " + this.opp.pseudo + " : " + (oppTime >= DUEL_FORFEIT_TIME ? "abandon" : oppTime.toFixed(1) + "s") + " · " : "Pas de réponse de l'adversaire · ") +
      "Côte : " + this.myElo0 + " → " + newElo;
  }
};
let duelMode = null;


/* ---------- Méta : succès, récompense du jour, duels (synchronisé dans le cloud) ---------- */
const reducedMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const metaKey = () => "tr_meta_" + (user ? user.id : "guest");
const Meta = {
  blank() { return metaBlank(); },
  get() { return Object.assign(this.blank(), store.get(metaKey()) || {}); },
  set(m) { store.set(metaKey(), m); },
  merge(a, b) { return metaMerge(a, b); },
  duel(won) { const m = this.get(); m.dd++; if (won) m.dw++; this.set(m); Cloud.push(); },
  onLogin() { const g = store.get("tr_meta_guest"); if (g) { this.set(this.merge(this.get(), g)); store.del("tr_meta_guest"); } }
};

/* Récompense du jour : série de 7 jours, remise à zéro si un jour est manqué */
const DAILY = [20, 30, 40, 50, 60, 80, 150];
const dayNum = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
const Daily = {
  state() { return dailyState(Meta.get().dl, dayNum()); },
  claim() {
    const st = this.state(); if (!st.ready) return 0;
    const m = Meta.get(); m.dl = { d: dayNum(), s: st.streak }; m.bs = Math.max(m.bs, st.streak); Meta.set(m);
    const amt = DAILY[st.idx]; Coins.add(amt, "récompense du jour"); return amt;
  }
};
let dailyShownThisSession = false;
function openDaily() {
  const st = Daily.state();
  const box = $("dailyDays"); box.innerHTML = "";
  const cycleStart = st.streak - 1 - st.idx;   // la série en cours, ramenée au début du cycle de 7
  DAILY.forEach((amt, i) => {
    const t = document.createElement("div");
    const done = i < st.idx || (!st.ready && i === st.idx);
    t.className = "dayTile" + (done ? " done" : "") + (st.ready && i === st.idx ? " now" : "") + (i === 6 ? " last" : "");
    t.innerHTML = "Jour " + (cycleStart + i + 1) + "<b>🪙 " + amt + "</b>";
    box.appendChild(t);
  });
  $("dailyText").textContent = st.ready
    ? (st.streak > 1 ? "Série de " + st.streak + " jours, continue comme ça !" : "Reviens chaque jour pour augmenter ta récompense.")
    : "Déjà récupérée aujourd'hui. Reviens demain pour le jour " + (st.streak + 1) + ".";
  $("dailyClaim").classList.toggle("hidden", !st.ready);
  $("dailyClose").textContent = st.ready ? "Plus tard" : "Fermer";
  $("daily").classList.remove("hidden");
}
function closeDaily() { $("daily").classList.add("hidden"); refreshHomeBits(); }

/* ---------- Statistiques et succès ---------- */
function playerStats() {
  const p = getProg(), m = Meta.get();
  let worlds = 0;
  for (let w = 0; w * WORLD_SIZE < LEVELS.length; w++) {
    let all = true; for (let i = w * WORLD_SIZE; i < Math.min(LEVELS.length, (w + 1) * WORLD_SIZE); i++) if (!(p[i] > 0)) { all = false; break; }
    if (all) worlds++;
  }
  return {
    levels: p.filter(x => x > 0).length, stars: p.reduce((a, b) => a + Math.max(0, b), 0), three: p.filter(x => x === 3).length,
    worlds, duels: m.dd, wins: m.dw, elo: Profile.elo(), coins: Coins.earned(), skins: Skins.owned().length, bestStreak: m.bs
  };
}
const ACH = [
  { id: "lv1",   icon: "✏️", name: "Premier trait",          desc: "Termine ton premier niveau",            key: "levels", goal: 1,    reward: 20 },
  { id: "lv10",  icon: "🌱", name: "Bien parti",             desc: "Termine 10 niveaux",                    key: "levels", goal: 10,   reward: 40 },
  { id: "lv50",  icon: "🧭", name: "Explorateur",            desc: "Termine 50 niveaux",                    key: "levels", goal: 50,   reward: 100 },
  { id: "lv100", icon: "🗺️", name: "Grand voyageur",         desc: "Termine 100 niveaux",                   key: "levels", goal: 100,  reward: 200 },
  { id: "lv200", icon: "👑", name: "Maître du trait",        desc: "Termine les 200 niveaux",               key: "levels", goal: 200,  reward: 500 },
  { id: "w1",    icon: "🏁", name: "Monde conquis",          desc: "Termine tous les niveaux d'un monde",   key: "worlds", goal: 1,    reward: 80 },
  { id: "w5",    icon: "🌍", name: "Globe-trotteur",         desc: "Termine 5 mondes en entier",            key: "worlds", goal: 5,    reward: 250 },
  { id: "t10",   icon: "⭐", name: "Économe",                desc: "3 étoiles sur 10 niveaux",              key: "three",  goal: 10,   reward: 60 },
  { id: "t50",   icon: "🌟", name: "Trait de génie",         desc: "3 étoiles sur 50 niveaux",              key: "three",  goal: 50,   reward: 150 },
  { id: "s300",  icon: "✨", name: "Pluie d'étoiles",        desc: "Cumule 300 étoiles",                    key: "stars",  goal: 300,  reward: 200 },
  { id: "d1",    icon: "⚔️", name: "Premier duel",           desc: "Joue un duel en 1 vs 1",                key: "duels",  goal: 1,    reward: 30 },
  { id: "dw1",   icon: "🥊", name: "Première victoire",      desc: "Gagne un duel",                         key: "wins",   goal: 1,    reward: 50 },
  { id: "dw10",  icon: "🏆", name: "Duelliste",              desc: "Gagne 10 duels",                        key: "wins",   goal: 10,   reward: 200 },
  { id: "elo",   icon: "🏅", name: "Dans l'élite",           desc: "Atteins une côte de 1200",              key: "elo",    goal: 1200, reward: 250 },
  { id: "sk4",   icon: "🎨", name: "Styliste",               desc: "Possède 4 skins de balle",              key: "skins",  goal: 4,    reward: 50 },
  { id: "st7",   icon: "📅", name: "Fidèle",                 desc: "Récompense du jour 7 jours de suite",   key: "bestStreak", goal: 7, reward: 150 }
];
function achReady() { const st = playerStats(), got = Meta.get().ach; return ACH.filter(a => st[a.key] >= a.goal && !got.includes(a.id)); }
function claimAch(a) {
  const m = Meta.get(); if (m.ach.includes(a.id) || playerStats()[a.key] < a.goal) return;
  m.ach.push(a.id); Meta.set(m);
  Coins.add(a.reward, a.name); Snd.win(); vib([20, 40, 20]);
  renderAch();
}
/* signale les succès qui viennent d'être débloqués (une seule fois par succès) */
function announceAch() {
  const key = "tr_achseen_" + (user ? user.id : "guest"), seen = store.get(key) || [];
  const fresh = achReady().filter(a => !seen.includes(a.id));
  if (!fresh.length) return;
  store.set(key, [...seen, ...fresh.map(a => a.id)]);
  setTimeout(() => toast("🎖️ Succès débloqué : " + fresh[0].name + (fresh.length > 1 ? " (+" + (fresh.length - 1) + ")" : ""), true), 1400);
}
function openAch() { renderAch(); show("ach"); }
function renderAch() {
  const st = playerStats(), got = Meta.get().ach;
  const tiles = [["Niveaux", st.levels + "/" + LEVELS.length], ["Étoiles", st.stars], ["Parfaits ★★★", st.three],
                 ["Duels gagnés", st.wins + "/" + st.duels], ["Pièces gagnées", st.coins], ["Meilleure série", st.bestStreak + " j"]];
  $("statsGrid").innerHTML = tiles.map(([l, v]) => '<div class="stat"><b>' + v + '</b><small>' + l + '</small></div>').join("");
  const order = a => got.includes(a.id) ? 2 : st[a.key] >= a.goal ? 0 : 1;
  const list = $("achList"); list.innerHTML = "";
  ACH.slice().sort((a, b) => order(a) - order(b)).forEach(a => {
    const done = got.includes(a.id), ready = !done && st[a.key] >= a.goal;
    const row = document.createElement("div");
    row.className = "ach" + (done ? " got" : ready ? " ready" : "");
    const cur = Math.min(st[a.key], a.goal), pct = a.key === "elo" ? Math.max(0, Math.min(1, (st.elo - 1000) / (a.goal - 1000))) : cur / a.goal;
    row.innerHTML = '<div class="ic">' + a.icon + '</div><div><b>' + a.name + '</b><small>' + a.desc + '</small>' +
      (done || ready ? "" : '<div class="bar"><i style="width:' + Math.round(pct * 100) + '%"></i></div>') + '</div>';
    if (ready) { const b = document.createElement("button"); b.className = "primary"; b.textContent = "+" + a.reward + " 🪙"; b.onclick = () => claimAch(a); row.appendChild(b); }
    else { const r = document.createElement("span"); r.className = "rw"; r.textContent = done ? "✓ Obtenu" : (a.key === "elo" ? st.elo : cur) + "/" + a.goal; row.appendChild(r); }
    list.appendChild(row);
  });
  $("achCount").textContent = got.length + "/" + ACH.length;
}
