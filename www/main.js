/* Trace & Roule : notifications, branchement des boutons et démarrage. Chargé en dernier. */
/* ---------- Toast ---------- */
let tt;
window.toast = toast;
function toast(msg, ok) {
  const t = $("toast"); t.textContent = msg; t.classList.toggle("ok", !!ok); t.classList.add("show");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1700);
}

/* ---------- Démarrage ---------- */
$("guest").onclick = () => { user = null; store.del("tr_user"); Snd.pop(); showHome(); };
$("logout").onclick = () => { logout(); initGoogle(); };
$("navCampagne").onclick = e => { Snd.pop(); inkGo(e, "#1f9e8e", showMenu); };
$("navShop").onclick = e => { Snd.pop(); inkGo(e, "#d98a33", openShop); };
$("settingsBtn").onclick = () => { Snd.pop(); showSettings(); };
$("navDuel").onclick = e => { Snd.pop(); inkGo(e, "#c8407a", () => Duel.open()); };
$("duelFind").onclick = () => { Snd.pop(); Duel.start(); };
$("duelCancel").onclick = () => { Snd.pop(); Duel.cancel(); };
$("duelLbBtn").onclick = () => { Snd.pop(); openLeaderboard("duel"); };
$("navClassement").onclick = e => { Snd.pop(); if (!user) { openLeaderboard("home"); return; } inkGo(e, "#e8a23e", () => openLeaderboard("home")); };
$("duelPseudoBtn").onclick = () => { Snd.pop(); askPseudo(() => Duel.open()); };
$("duelResultOk").onclick = () => { Snd.pop(); showHome(); };
$("backLb").onclick = () => { Snd.pop(); if (lbFrom === "duel") Duel.open(); else showHome(); };
$("pseudoOk").onclick = () => {
  const v = validatePseudo($("pseudoInput").value);
  if (!v) { $("pseudoErr").classList.remove("hidden"); return; }
  Profile.setPseudo(v); Profile.publish(); Snd.pop();
  const cb = pseudoCb; pseudoCb = null;
  if (cb) cb(); else showHome();
};
$("backHomePseudo").onclick = () => { Snd.pop(); pseudoCb = null; showHome(); };
$("pseudoInput").addEventListener("keydown", e => { if (e.key === "Enter") $("pseudoOk").click(); });
$("navAch").onclick = e => { Snd.pop(); inkGo(e, "#6f52e0", openAch); };
$("backAch").onclick = () => { Snd.pop(); showHome(); };
$("errBtn").onclick = () => { Snd.pop(); copyErrorLog(); };
$("statsBtn").onclick = () => { Snd.pop(); openAch(); };
$("heroPlay").onclick = e => { Snd.pop(); const n = nextLevel(); const w = worldOf(n === -1 ? LEVELS.length - 1 : n); inkGo(e, w.bot, () => { if (n === -1) showMenu(); else startLevel(n); }); };
$("loginBanner").onclick = () => { Snd.pop(); Hero.stop(); show("login"); initGoogle(); };
$("dailyBtn").onclick = () => { Snd.pop(); openDaily(); };
$("dailyClose").onclick = () => { Snd.pop(); closeDaily(); };
$("dailyClaim").onclick = () => { const amt = Daily.claim(); if (amt) { Snd.win(); vib([20, 40, 20]); } openDaily(); setTimeout(closeDaily, 900); };
$("vibBtn").onclick = () => { store.set("tr_vib", !vibOn()); paintVib(); vib(30); };
function paintVib() { $("vibBtn").textContent = vibOn() ? "📳 Vibrations : activées" : "📴 Vibrations : coupées"; }
for (const id of ["backHome1","backHome2","backHome3"]) $(id).onclick = () => { Snd.pop(); showHome(); };
$("backHome4").onclick = () => { Snd.pop(); if (Duel.searching) Duel.cancel(false); showHome(); };
$("privacy").onclick = () => window.open(CFG.PRIVACY_URL, "_blank");
$("adprefs").onclick = () => { Promise.resolve().then(() => Plug("AdMob").showPrivacyOptionsForm()).catch(e => report(e, "pubs:préférences")); };
user = store.get("tr_user");
if (user) { showHome(); Cloud.resume(); } else { show("login"); initGoogle(); }
window.__booted = true;
Ads.init();
IAP.init();
if (CFG.ADS.enabled !== true) $("bonus").classList.add("hidden");
