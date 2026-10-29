// Test de bout en bout dans un vrai navigateur (Chromium via Playwright), avec une fausse base Firestore en mémoire.
// Vérifie le démarrage, chaque écran, une partie, le duel 1 vs 1 et les protections de sécurité.
// Lancement : npm run test:smoke   (en local : npx playwright install chromium au préalable)
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const INDEX = pathToFileURL(join(import.meta.dirname, "..", "www", "index.html")).href;
const TEST_CONFIG = `window.CFG = { GOOGLE_WEB_CLIENT_ID: "test", FIREBASE: { apiKey: "K", projectId: "p" },
  PRIVACY_URL: "https://example.com", ADS: { enabled: false, test: true } };`;
let failures = 0;
const check = (ok, label, detail) => { console.log((ok ? "✓ " : "✗ ") + label + (detail !== undefined ? " (" + detail + ")" : "")); if (!ok) failures++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Fausse base Firestore (API REST) ---------- */
const DB = {};
const fv = v => v === null || v === undefined ? { nullValue: null } : typeof v === "boolean" ? { booleanValue: v }
  : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === "string" ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(fv) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fv(x)])) } };
const jv = f => "integerValue" in f ? parseInt(f.integerValue, 10) : "doubleValue" in f ? f.doubleValue : "booleanValue" in f ? f.booleanValue
  : "arrayValue" in f ? (f.arrayValue.values || []).map(jv) : "mapValue" in f ? Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, jv(x)]))
  : "nullValue" in f ? null : f.stringValue ?? f.timestampValue;
const docJson = (c, id, v) => ({ name: "projects/p/databases/(default)/documents/" + c + "/" + id, fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fv(x)])) });
const reply = (route, status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body ?? {}) });

async function firestore(route) {
  const req = route.request(), url = new URL(req.url()), method = req.method();
  if (url.host.startsWith("identitytoolkit")) {
    const uid = "u-" + /id_token=([^&]+)/.exec(JSON.parse(req.postData()).postBody)[1];
    return reply(route, 200, { localId: uid, idToken: "T" + uid, refreshToken: "R" + uid, expiresIn: "3600" });
  }
  if (url.host.startsWith("securetoken")) return reply(route, 200, { id_token: "T", refresh_token: "R", expires_in: "3600" });
  const path = decodeURIComponent(url.pathname.split("/documents")[1] || "");
  if (path.endsWith(":runQuery") || url.pathname.endsWith(":runQuery")) {
    const q = JSON.parse(req.postData()).structuredQuery, c = q.from[0].collectionId;
    let items = Object.entries(DB[c] || {});
    if (q.orderBy) { const f = q.orderBy[0].field.fieldPath, desc = q.orderBy[0].direction === "DESCENDING"; items.sort((a, b) => ((a[1][f] ?? 0) - (b[1][f] ?? 0)) * (desc ? -1 : 1)); }
    return reply(route, 200, items.slice(0, q.limit || 50).map(([k, v]) => ({ document: docJson(c, k, v) })));
  }
  const [, c, id] = path.split("/");
  const col = (DB[c] = DB[c] || {});
  if (method === "GET") return id in col ? reply(route, 200, docJson(c, id, col[id])) : reply(route, 404, { error: { message: "NOT_FOUND" } });
  if (method === "DELETE") {
    if (url.searchParams.get("currentDocument.exists") === "true" && !(id in col)) return reply(route, 400, { error: { message: "FAILED_PRECONDITION" } });
    delete col[id]; return reply(route, 200, {});
  }
  if (method === "PATCH") {
    const body = JSON.parse(req.postData()), obj = Object.fromEntries(Object.entries(body.fields || {}).map(([k, x]) => [k, jv(x)]));
    if (body.currentDocument && body.currentDocument.exists !== (id in col)) return reply(route, 400, { error: { message: "FAILED_PRECONDITION" } });
    const masks = url.searchParams.getAll("updateMask.fieldPaths");
    if (masks.length) {
      const cur = col[id] || {};
      for (const m of masks) { const [top, sub] = m.split("."); if (sub) { cur[top] = cur[top] || {}; cur[top][sub] = obj[top] && obj[top][sub]; } else if (m in obj) cur[m] = obj[m]; }
      col[id] = cur;
    } else col[id] = obj;
    return reply(route, 200, docJson(c, id, col[id]));
  }
  return reply(route, 200, {});
}

/* ---------- Navigateur ---------- */
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const pageErrors = [];
async function open(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route("**/config.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body: TEST_CONFIG }));
  await ctx.route(/https:\/\/(identitytoolkit|securetoken|firestore)\.googleapis\.com\/.*/, firestore);
  await ctx.route(/https:\/\/accounts\.google\.com\/.*/, r => r.fulfill({ status: 200, body: "" }));
  const page = await ctx.newPage();
  page.on("pageerror", e => pageErrors.push(name + " : " + e.message));
  await page.goto(INDEX); await sleep(300);
  await page.evaluate(() => Meta.set(Object.assign(Meta.get(), { dl: { d: dayNum(), s: 1 } })));   // pas de fenêtre « récompense du jour »
  await page.click("#guest"); await sleep(400);
  return page;
}
async function signIn(page, name) {
  await page.evaluate(n => setUser({ sub: n, given_name: n }, n), name); await sleep(600);
  await page.evaluate(n => Profile.setPseudo(n), name);
}
/* attend qu'une condition soit vraie dans la page (au lieu d'un délai fixe), 10 s maximum */
async function until(page, fn, arg, timeout = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await page.evaluate(fn, arg)) return true; await sleep(250); }
  return false;
}
const screen = page => page.evaluate(() => document.querySelector(".screen:not(.hidden)").id);
const launchBall = page => page.evaluate(() => [...document.querySelectorAll("#game button")].find(b => /Lancer/.test(b.textContent)).click());

try {
  /* 1. Démarrage et navigation */
  const A = await open("alice");
  check(await A.evaluate(() => window.__booted === true), "le jeu démarre");
  for (const [btn, back, expected] of [["#navCampagne", "#backHome1", "menu"], ["#navShop", "#backHome2", "shop"], ["#navDuel", "#backHome4", "duel"], ["#navAch", "#backAch", "ach"], ["#settingsBtn", "#backHome3", "settings"]]) {
    await A.click(btn); await sleep(800); check(await screen(A) === expected, "navigation " + btn + " → " + expected); await A.click(back); await sleep(500);
  }
  await A.click("#navShop"); await sleep(500); await A.click("#tabPremium"); await sleep(300);
  check(await A.locator(".skin-card.prem").count() === 8, "8 skins exclusifs en boutique");
  await A.click("#backHome2"); await sleep(400);

  /* 2. Une partie gagnée */
  await A.click("#heroPlay"); await sleep(900);
  check(await screen(A) === "game", "le bouton Continuer lance un niveau");
  await A.evaluate(() => { inkUsed = 1; endRun("win"); }); await sleep(1300);
  check(/\+\d+ 🪙/.test(await A.innerText("#wcoins")), "pièces gagnées affichées sur la victoire");
  await A.click("#wmenu"); await sleep(400); await A.click("#backHome1"); await sleep(400);

  /* 3. Performance : aucune lecture du stockage pendant que la balle roule */
  await A.evaluate(() => { window.__ls = 0; const g = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { window.__ls++; return g.call(this, k); }; });
  await A.evaluate(() => { startLevel(40); const pts = []; for (let i = 0; i < 120; i++) pts.push([30 + i * 2.5, 160 + Math.sin(i / 9) * 60]); strokes = [pts]; rebuildSegs(); });
  await sleep(300); await launchBall(A); await sleep(200);
  const ls0 = await A.evaluate(() => window.__ls); await sleep(1000);
  const lsPerSec = (await A.evaluate(() => window.__ls)) - ls0;
  check(lsPerSec < 5, "pas de lecture du stockage à chaque image", lsPerSec + " lectures/s");
  await A.evaluate(() => { phase = 0; show("home"); });

  /* 4. Sécurité : un pseudo piégé ne doit rien exécuter chez l'adversaire */
  const B = await open("bob"), C = await open("carol");
  await signIn(A, "alice"); await signIn(B, "bob"); await signIn(C, "carol");
  DB.duel_queue = { "u-evil": { uid: "u-evil", pseudo: '<img src=x onerror="window.__pwn=1">', elo: 1000, ts: Date.now(), sid: "e".repeat(24) } };
  await C.evaluate(() => Duel.start()); await until(C, () => !!duelMode);
  check(!(await C.evaluate(() => !!window.__pwn)), "pseudo piégé neutralisé (XSS)", await C.evaluate(() => $("ltitle").textContent));
  await C.evaluate(() => { duelMode = null; Duel.resolved = true; show("home"); });
  DB.duel_queue = {}; DB.duels = {};

  /* 5. Duel : deux duels successifs doivent apparier les bons joueurs */
  await A.evaluate(() => Duel.start()); await B.evaluate(() => Duel.start());
  await until(A, () => !!duelMode); await until(B, () => !!duelMode); await sleep(300);
  await A.evaluate(() => { Duel.startTS = performance.now() - 5000; endRun("win"); }); await sleep(2600);
  await B.evaluate(() => { Duel.startTS = performance.now() - 9000; endRun("win"); }); await sleep(2600);
  check(await A.innerText("#duelResultTitle") === "Victoire !" && await B.innerText("#duelResultTitle") === "Défaite", "duel 1 : le plus rapide gagne");
  await A.evaluate(() => { Duel.open(); Duel.start(); }); await C.evaluate(() => { Duel.open(); Duel.start(); });
  await until(A, () => !Duel.searching && !!Duel.matchId); await until(C, () => !Duel.searching && !!Duel.matchId);
  const oppA = await A.evaluate(() => Duel.opp && Duel.opp.pseudo), oppC = await C.evaluate(() => Duel.opp && Duel.opp.pseudo);
  const sameMatch = await A.evaluate(() => Duel.matchId) === await C.evaluate(() => Duel.matchId);
  check(oppA === "carol" && oppC === "alice" && sameMatch, "duel 2 : pas de réutilisation de l'ancien duel", "Alice contre " + oppA + ", Carol contre " + oppC);
  await B.evaluate(() => { Duel.open(); Duel.start(); }); await sleep(1200); await B.click("#backHome4"); await sleep(800);
  check(!(await B.evaluate(() => Duel.searching)) && !("u-bob" in (DB.duel_queue || {})), "le bouton retour annule la recherche");

  /* 6. Sécurité : un skin payant ne peut pas venir du stockage du compte ni du cloud */
  await A.evaluate(() => { duelMode = null; store.set(skinsKey(), ["classic", "galaxy", "sun"]); Skins.dirty(); Skins.select("galaxy"); });
  check(!(await A.evaluate(() => Skins.has("galaxy"))) && await A.evaluate(() => Skins.current().id) === "classic", "skin payant injecté refusé");
  await A.evaluate(() => Cloud.sync()); await sleep(900);
  check(!/galaxy/.test((DB.users || {})["u-alice"]?.ownedSkins || ""), "aucun skin payant envoyé au cloud");

  /* 7. Filet d'erreurs */
  await A.evaluate(() => setTimeout(() => { throw new Error("erreur volontaire du test"); }, 0)); await sleep(300);
  check(await A.evaluate(() => errorLog().some(e => /erreur volontaire/.test(e.msg))), "une erreur imprévue est enregistrée");

  /* 8. Démarrage raté : écran explicite au lieu d'un écran figé */
  const ctx = await browser.newContext();
  await ctx.route("**/config.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body: TEST_CONFIG }));
  await ctx.route("**/economy.js", r => r.fulfill({ status: 200, contentType: "text/javascript", body: "ceci n'est pas du JavaScript(" }));
  const D = await ctx.newPage(); await D.goto(INDEX); await sleep(600);
  check(await D.isVisible("#bootFail"), "écran « le jeu n'a pas pu démarrer » si un fichier est cassé");

  const unexpected = pageErrors.filter(e => !/erreur volontaire/.test(e));
  check(unexpected.length === 0, "aucune erreur JavaScript inattendue", unexpected.join(" | ") || "0");
} finally {
  await browser.close();
}
console.log(failures ? "\n" + failures + " échec(s)" : "\nTous les tests de bout en bout sont passés");
process.exit(failures ? 1 : 0);
