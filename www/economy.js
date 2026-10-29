/* Trace & Roule : pièces d'or, skins (dessin, motifs, accessoires) et achats Google Play. */
/* ---------- Pièces d'or ---------- */
const coinKey = () => "tr_coins_" + (user ? user.id : "guest");
const Coins = {
  earned() { return (store.get(coinKey()) || { e: 0, s: 0 }).e; },
  spent() { return (store.get(coinKey()) || { e: 0, s: 0 }).s; },
  balance() { return Math.max(0, this.earned() - this.spent()); },
  setTotals(e, s) { store.set(coinKey(), { e, s }); refreshCoinUI(); },
  add(n, why, quiet) {
    const d = store.get(coinKey()) || { e: 0, s: 0 }; d.e += n; store.set(coinKey(), d);
    if (!quiet) toast("🪙 +" + n + " pièces" + (why ? " · " + why : ""), true);
    const pill = $("coinsH"); if (pill) { pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump"); }
    Cloud.push(); refreshCoinUI();
  },
  spend(n) {
    if (this.balance() < n) return false;
    const d = store.get(coinKey()) || { e: 0, s: 0 }; d.s += n; store.set(coinKey(), d);
    Cloud.push(); refreshCoinUI(); return true;
  },
  /* à la connexion : on reprend les pièces gagnées en invité */
  onLogin() {
    const guest = store.get("tr_coins_guest");
    if (guest && (guest.e || guest.s)) {
      const mine = store.get(coinKey()) || { e: 0, s: 0 };
      this.setTotals(mine.e + guest.e, mine.s + guest.s);
      store.del("tr_coins_guest");
    }
    const gs = store.get("tr_skins_guest");
    if (gs && gs.length) { Skins.setOwned(Array.from(new Set([...Skins.coinOwned(), ...gs]))); store.del("tr_skins_guest"); }
  }
};
function refreshCoinUI() {
  const b = Coins.balance();
  const sh = $("coinsShop"); if (sh) sh.textContent = "🪙 " + b;
  const h = $("coinsH"); if (h) { tweenCoins(h, b); }
}

/* ---------- Skins (apparence de la balle) ---------- */
const SKINS = [
  { id: "classic",  name: "Classique", price: 0,   c1: "#ffffff", c2: "#c9d2ff" },
  { id: "sun",      name: "Soleil",    price: 60,  c1: "#fff3b0", c2: "#ffb703" },
  { id: "mint",     name: "Menthe",    price: 60,  c1: "#c8ffe8", c2: "#2ec4b6" },
  { id: "berry",    name: "Myrtille",  price: 90,  c1: "#d6c6ff", c2: "#6f42c1" },
  { id: "lava",     name: "Lave",      price: 90,  c1: "#ffb37a", c2: "#c1392b" },
  { id: "sakura",   name: "Sakura",    price: 120, c1: "#ffd6e8", c2: "#ff6fa0" },
  { id: "storm",    name: "Orage",     price: 120, c1: "#cfe6ff", c2: "#2e5f8a" },
  { id: "gold",     name: "Or",        price: 220, c1: "#fff0b3", c2: "#d4a017" },
  { id: "aurora",   name: "Aurore",    price: 260, c1: "#b3ffe0", c2: "#7c6cff" },
  { id: "bee",      name: "Abeille",   price: 150, c1: "#ffe066", c2: "#f4a700", pat: "stripes", tag: "Rayé" },
  { id: "lady",     name: "Coccinelle", price: 180, c1: "#ff7272", c2: "#c0262d", pat: "dots", tag: "À pois" },
  { id: "melon",    name: "Pastèque",  price: 200, c1: "#ff9aac", c2: "#e6395a", pat: "seeds", tag: "Fruité" },
  { id: "moon",     name: "Lune",      price: 240, c1: "#f4f4fa", c2: "#9898b2", pat: "craters", tag: "Cratères" },
  { id: "rainbow",  name: "Arc-en-ciel", price: 320, c1: "#ffffff", c2: "#e8e8ff", pat: "rainbow", tag: "Traînée multicolore" },
  { id: "galaxy",   name: "Galaxie",   price: 0, premium: true, priceLabel: "2,99 €", productId: "skin_galaxy",   c1: "#e0c6ff", c2: "#2a1050", pat: "stars", acc: "wizard", tag: "Pour les magiciens du trait", perks: ["Chapeau de sorcier étoilé", "Étoiles qui scintillent", "Traînée d'étincelles en jeu"] },
  { id: "pirate", name: "Pirate", price: 0, premium: true, priceLabel: "2,99 €", productId: "skin_pirate", c1: "#ffffff", c2: "#dde6ff", pat: "breton", acc: "pirate", tag: "Pour les corsaires du crayon", perks: ["Tricorne et cache-œil", "Marinière rayée", "Traînée d'étincelles en jeu"] },
  { id: "cool", name: "Cool", price: 0, premium: true, priceLabel: "2,99 €", productId: "skin_cool", c1: "#fff59a", c2: "#ffb81f", acc: "shades", tag: "Toujours détendue", perks: ["Lunettes de soleil", "Grand sourire", "Traînée d'étincelles en jeu"] },
  { id: "ninja", name: "Ninja", price: 0, premium: true, priceLabel: "3,99 €", productId: "skin_ninja", c1: "#6a6a86", c2: "#1c1c30", acc: "ninja", tag: "Rapide comme l'encre", perks: ["Bandeau rouge flottant", "Regard de guerrier", "Traînée d'étincelles en jeu"] },
  { id: "cowboy", name: "Cowboy", price: 0, premium: true, priceLabel: "3,99 €", productId: "skin_cowboy", c1: "#ffe0b3", c2: "#d58a3c", acc: "cowboy", tag: "Le shérif du niveau", perks: ["Chapeau de cow-boy", "Étoile de shérif", "Traînée d'étincelles en jeu"] },
  { id: "diamond",  name: "Diamant",   price: 0, premium: true, priceLabel: "4,99 €", productId: "skin_diamond",  c1: "#eafaff", c2: "#4fc3f7", pat: "facets", acc: "crown", tag: "Pour les rois de la campagne", perks: ["Couronne en or sertie", "Reflets de diamant animés", "Traînée d'étincelles en jeu"] },
  { id: "astro", name: "Astronaute", price: 0, premium: true, priceLabel: "4,99 €", productId: "skin_astro", c1: "#ffffff", c2: "#b4c0dc", acc: "astro", tag: "Cap sur les étoiles", perks: ["Casque en verre brillant", "Antenne qui clignote", "Traînée d'étincelles en jeu"] },
  { id: "unicorn", name: "Licorne", price: 0, premium: true, priceLabel: "4,99 €", productId: "skin_unicorn", c1: "#fff2fb", c2: "#ffbfe4", acc: "unicorn", tag: "Magique et scintillante", perks: ["Corne dorée en spirale", "Crinière arc-en-ciel", "Traînée d'étincelles en jeu"] },
];

/* Peint le corps d'une balle (dégradé + motif + reflet), centrée en (0,0), rayon r */
const RAINBOW = ["#ff5a5f", "#ff9f43", "#ffd166", "#06d6a0", "#4cc9f0", "#7c6cff"];
function paintSkin(g, r, sk, t) {
  t = t || 0;
  const bg = g.createRadialGradient(-r * .3, -r * .4, r * .1, 0, 0, r * 1.1);
  bg.addColorStop(0, sk.c1); bg.addColorStop(1, sk.c2);
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
  if (sk.pat) {
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip();
    if (sk.pat === "stripes") {
      g.fillStyle = "#33210a";
      for (let i = -2; i <= 2; i++) { g.save(); g.rotate(.35); g.fillRect(i * r * .62 - r * .13, -r * 1.3, r * .26, r * 2.6); g.restore(); }
    } else if (sk.pat === "dots") {
      g.fillStyle = "#1c1014";
      g.fillRect(-r * .04, -r * 1.2, r * .08, r * 2.4);
      for (const [x, y, k] of [[-.52, .28, .2], [.52, .3, .19], [-.22, .66, .14], [.24, .64, .14], [-.68, -.28, .12], [.68, -.28, .12]]) { g.beginPath(); g.arc(x * r, y * r, k * r, 0, 7); g.fill(); }
    } else if (sk.pat === "seeds") {
      g.strokeStyle = "#2e9e4f"; g.lineWidth = r * .28; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
      g.strokeStyle = "#c8f5c8"; g.lineWidth = r * .08; g.beginPath(); g.arc(0, 0, r * .84, 0, 7); g.stroke();
      g.fillStyle = "#2a1414";
      for (const [x, y] of [[-.42, .25], [.38, .32], [-.05, .58], [.5, -.18], [-.55, -.2]]) { g.beginPath(); g.ellipse(x * r, y * r, r * .07, r * .12, x, 0, 7); g.fill(); }
    } else if (sk.pat === "craters") {
      g.fillStyle = "rgba(90,90,120,.35)";
      for (const [x, y, k] of [[-.4, .3, .22], [.42, .2, .16], [.1, -.5, .2], [-.15, .65, .12], [.55, -.45, .1]]) { g.beginPath(); g.arc(x * r, y * r, k * r, 0, 7); g.fill(); }
    } else if (sk.pat === "breton") {
      g.fillStyle = "#26407a";
      for (let i = -3; i <= 3; i++) g.fillRect(-r, i * r * .5 - r * .13, r * 2, r * .26);
    } else if (sk.pat === "rainbow") {
      const h = r * 2 / RAINBOW.length;
      RAINBOW.forEach((c, i) => { g.fillStyle = c; g.fillRect(-r, -r + i * h, r * 2, h + .5); });
    } else if (sk.pat === "stars") {
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4, d = r * (.2 + (i % 4) * .2), tw = .5 + .5 * Math.sin(t * 3 + i * 1.7);
        g.globalAlpha = .35 + .65 * tw; g.fillStyle = i % 3 ? "#ffffff" : "#ffd6ff";
        g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * (.05 + .05 * tw), 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    } else if (sk.pat === "facets") {
      g.fillStyle = "rgba(255,255,255,.28)";
      for (let i = 0; i < 6; i += 2) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); g.lineTo(Math.cos(a + 1.05) * r * 1.2, Math.sin(a + 1.05) * r * 1.2); g.fill(); }
      const sx = ((t * .7) % 2) * r * 3 - r * 1.5;
      const sh = g.createLinearGradient(sx - r * .5, 0, sx + r * .5, 0);
      sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(.5, "rgba(255,255,255,.75)"); sh.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = sh; g.fillRect(-r, -r, r * 2, r * 2);
    }
    g.restore();
  }
  g.fillStyle = "rgba(255,255,255,.38)"; g.beginPath(); g.ellipse(-r * .34, -r * .44, r * .3, r * .16, -.55, 0, 7); g.fill();
}
function paintEyes(g, r, lx, ly) {
  for (const ex of [-r * .36, r * .36]) {
    g.fillStyle = "#22224a"; g.beginPath(); g.arc(ex + lx * r * .12, -r * .1 + ly * r * .12, r * .2, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + lx * r * .12 - r * .06, -r * .17 + ly * r * .12, r * .07, 0, 7); g.fill();
  }
}

/* Accessoire des skins exclusifs, dessiné au-dessus de la balle (reste droit quand la balle roule) */
function star5(g, x, y, rr) {
  g.beginPath();
  for (let j = 0; j < 10; j++) { const q = j % 2 ? rr * .45 : rr, a = j * Math.PI / 5 - Math.PI / 2; j ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fill();
}
function paintAccessory(g, r, sk, t) {
  if (!sk.acc) return;
  t = t || 0;
  g.save();
  if (sk.acc === "wizard") {
    g.rotate(-.12 + Math.sin(t * 1.6) * .04);
    const cone = g.createLinearGradient(-r * .6, -r * 2.2, r * .6, -r * .8);
    cone.addColorStop(0, "#7a4fe0"); cone.addColorStop(1, "#2e1470");
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(-r * .66, -r * .78);
    g.quadraticCurveTo(-r * .25, -r * 1.55, r * .05, -r * 2.15);
    g.quadraticCurveTo(r * .28, -r * 2.55, r * .78, -r * 2.25);     // pointe recourbée
    g.quadraticCurveTo(r * .34, -r * 2.05, r * .32, -r * 1.6);
    g.quadraticCurveTo(r * .42, -r * 1.15, r * .62, -r * .78);
    g.closePath(); g.fill();
    g.fillStyle = "#ffd166"; g.fillRect(-r * .62, -r * 1.02, r * 1.22, r * .18);   // ruban doré
    g.fillStyle = "#24105c"; g.beginPath(); g.ellipse(0, -r * .78, r * 1.02, r * .24, 0, 0, 7); g.fill();   // bord
    g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.ellipse(-r * .2, -r * .84, r * .6, r * .08, 0, 0, 7); g.fill();
    for (const [x, y, k, ph] of [[-.18, -1.32, .16, 0], [.16, -1.75, .12, 2], [.62, -2.22, .1, 4]]) {
      g.fillStyle = "rgba(255,230,140," + (.65 + .35 * Math.sin(t * 4 + ph)) + ")"; star5(g, x * r, y * r, k * r * (1 + .15 * Math.sin(t * 4 + ph)));
    }
  } else if (sk.acc === "pirate") {
    // cache-œil + lanière, puis tricorne par-dessus
    g.fillStyle = "#14141f"; g.strokeStyle = "#14141f"; g.lineWidth = r * .09;
    g.beginPath(); g.moveTo(-r * .97, -r * .34); g.quadraticCurveTo(-r * .2, -r * .46, r * .3, -r * .3); g.stroke();
    g.beginPath(); g.moveTo(r * .56, -r * .24); g.lineTo(r * .97, -r * .36); g.stroke();
    g.beginPath(); g.ellipse(r * .38, -r * .12, r * .3, r * .26, .15, 0, 7); g.fill();
    g.rotate(-.1 + Math.sin(t * 1.5) * .03);
    g.fillStyle = "#1b1b2b";
    g.beginPath(); g.moveTo(-r * 1.28, -r * .62); g.quadraticCurveTo(-r * 1.1, -r * 1.08, -r * .5, -r * 1.12);
    g.quadraticCurveTo(0, -r * 1.7, r * .5, -r * 1.12); g.quadraticCurveTo(r * 1.1, -r * 1.08, r * 1.28, -r * .62);
    g.quadraticCurveTo(0, -r * .98, -r * 1.28, -r * .62); g.closePath(); g.fill();
    g.strokeStyle = "#ffd166"; g.lineWidth = r * .08; g.beginPath(); g.moveTo(-r * 1.2, -r * .66); g.quadraticCurveTo(0, -r * 1.02, r * 1.2, -r * .66); g.stroke();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(0, -r * 1.18, r * .2, 0, 7); g.fill();
    g.fillRect(-r * .11, -r * 1.02, r * .22, r * .12);
    g.fillStyle = "#1b1b2b"; g.beginPath(); g.arc(-r * .08, -r * 1.2, r * .045, 0, 7); g.arc(r * .08, -r * 1.2, r * .045, 0, 7); g.fill();
  } else if (sk.acc === "shades") {
    g.fillStyle = "#12121c"; g.strokeStyle = "#12121c"; g.lineWidth = r * .11; g.lineJoin = "round";
    for (const ex of [-r * .38, r * .38]) { g.beginPath(); g.roundRect ? g.roundRect(ex - r * .34, -r * .36, r * .68, r * .46, r * .14) : g.rect(ex - r * .34, -r * .36, r * .68, r * .46); g.fill(); }
    g.beginPath(); g.moveTo(-r * .06, -r * .2); g.lineTo(r * .06, -r * .2); g.stroke();
    g.beginPath(); g.moveTo(-r * .72, -r * .22); g.lineTo(-r * .98, -r * .3); g.moveTo(r * .72, -r * .22); g.lineTo(r * .98, -r * .3); g.stroke();
    g.fillStyle = "rgba(255,255,255,.35)";
    for (const ex of [-r * .5, r * .26]) { g.beginPath(); g.moveTo(ex, -r * .32); g.lineTo(ex + r * .16, -r * .32); g.lineTo(ex + r * .02, -r * .02); g.lineTo(ex - r * .14, -r * .02); g.fill(); }
    g.strokeStyle = "#7a3a00"; g.lineWidth = r * .09; g.beginPath(); g.arc(0, r * .24, r * .34, .2, Math.PI - .2); g.stroke();
  } else if (sk.acc === "ninja") {
    // bande de peau pour faire ressortir le regard
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip();
    g.fillStyle = "#f4d9b8"; g.fillRect(-r, -r * .5, r * 2, r * .72);
    g.fillStyle = "#22224a";
    for (const ex of [-r * .36, r * .36]) { g.beginPath(); g.ellipse(ex, -r * .14, r * .16, r * .2, 0, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(ex - r * .05, -r * .2, r * .055, 0, 7); g.fill(); g.fillStyle = "#22224a"; }
    g.fillStyle = "#e63e64"; g.fillRect(-r, -r * .86, r * 2, r * .3);        // bandeau
    g.fillStyle = "rgba(255,255,255,.28)"; g.fillRect(-r, -r * .86, r * 2, r * .07);
    g.restore();
    const w1 = Math.sin(t * 6) * .25, w2 = Math.sin(t * 6 + 1.2) * .25;
    g.fillStyle = "#e63e64";
    g.beginPath(); g.moveTo(r * .86, -r * .72); g.quadraticCurveTo(r * 1.5, -r * (.5 + w1), r * 1.9, -r * (.2 + w1 * 2)); g.lineTo(r * 1.86, -r * (.02 + w1 * 2)); g.quadraticCurveTo(r * 1.4, -r * (.38 + w1), r * .9, -r * .52); g.fill();
    g.beginPath(); g.moveTo(r * .86, -r * .62); g.quadraticCurveTo(r * 1.4, -r * (.2 + w2), r * 1.7, r * (.2 + w2 * 2)); g.lineTo(r * 1.62, r * (.34 + w2 * 2)); g.quadraticCurveTo(r * 1.3, -r * (.06 + w2), r * .9, -r * .5); g.fill();
    g.fillStyle = "#b72a4c"; g.beginPath(); g.arc(r * .86, -r * .62, r * .15, 0, 7); g.fill();
  } else if (sk.acc === "cowboy") {
    g.rotate(-.06 + Math.sin(t * 1.5) * .03);
    const felt = g.createLinearGradient(0, -r * 1.7, 0, -r * .6); felt.addColorStop(0, "#b56a2a"); felt.addColorStop(1, "#7a4216");
    g.fillStyle = felt;
    g.beginPath(); g.moveTo(-r * .56, -r * .8); g.quadraticCurveTo(-r * .62, -r * 1.55, -r * .22, -r * 1.5);
    g.quadraticCurveTo(0, -r * 1.34, r * .22, -r * 1.5); g.quadraticCurveTo(r * .62, -r * 1.55, r * .56, -r * .8); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-r * 1.55, -r * .78); g.quadraticCurveTo(-r * 1.3, -r * .5, -r * .6, -r * .66);
    g.lineTo(r * .6, -r * .66); g.quadraticCurveTo(r * 1.3, -r * .5, r * 1.55, -r * .78); g.quadraticCurveTo(r * 1.1, -r * 1.02, 0, -r * .94);
    g.quadraticCurveTo(-r * 1.1, -r * 1.02, -r * 1.55, -r * .78); g.closePath(); g.fill();
    g.fillStyle = "#3a1d08"; g.fillRect(-r * .57, -r * 1.0, r * 1.14, r * .17);
    g.fillStyle = "#ffd166"; star5(g, 0, -r * .915, r * .17);
  } else if (sk.acc === "astro") {
    // dôme en verre autour de la balle, antenne qui clignote
    const dome = g.createRadialGradient(-r * .5, -r * .6, r * .2, 0, 0, r * 1.45);
    dome.addColorStop(0, "rgba(190,235,255,.34)"); dome.addColorStop(1, "rgba(120,190,255,.14)");
    g.fillStyle = dome; g.beginPath(); g.arc(0, 0, r * 1.3, 0, 7); g.fill();
    g.strokeStyle = "rgba(230,248,255,.9)"; g.lineWidth = r * .09; g.beginPath(); g.arc(0, 0, r * 1.3, 0, 7); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = r * .1; g.beginPath(); g.arc(0, 0, r * 1.14, Math.PI * 1.08, Math.PI * 1.38); g.stroke();
    g.fillStyle = "#c8d2ea"; g.beginPath(); g.roundRect ? g.roundRect(-r * .8, r * 1.08, r * 1.6, r * .2, r * .08) : g.rect(-r * .8, r * 1.08, r * 1.6, r * .2); g.fill();
    g.strokeStyle = "#c8d2ea"; g.lineWidth = r * .08; g.beginPath(); g.moveTo(r * .24, -r * 1.27); g.lineTo(r * .4, -r * 1.78); g.stroke();
    const on = Math.sin(t * 5) > 0; g.fillStyle = on ? "#ff4d78" : "#7a2a40"; g.beginPath(); g.arc(r * .4, -r * 1.83, r * .12, 0, 7); g.fill();
    if (on) { g.fillStyle = "rgba(255,77,120,.3)"; g.beginPath(); g.arc(r * .4, -r * 1.83, r * .26, 0, 7); g.fill(); }
  } else if (sk.acc === "unicorn") {
    g.rotate(Math.sin(t * 1.7) * .035);
    const cols = ["#ff5a5f", "#ff9f43", "#ffd166", "#06d6a0", "#4cc9f0", "#b388ff"];
    for (let i = 0; i < 6; i++) { g.strokeStyle = cols[i]; g.lineWidth = r * .3; g.lineCap = "round"; const a = -2.35 + i * .2, w = Math.sin(t * 2.4 + i * .8) * r * .08;
      g.beginPath(); g.moveTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9); g.quadraticCurveTo(Math.cos(a) * r * 1.65 + w, Math.sin(a) * r * 1.5, Math.cos(a) * r * 1.4 - r * .55 + w, Math.sin(a) * r * 1.3 + r * .75); g.stroke(); }
    g.lineCap = "butt";
    g.fillStyle = "#ffd9ee";
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * r * .5, -r * .78); g.lineTo(sx * r * .78, -r * 1.36); g.lineTo(sx * r * .16, -r * 1.0); g.closePath(); g.fill(); }
    const horn = g.createLinearGradient(0, -r * 2.2, 0, -r * .8); horn.addColorStop(0, "#fff2a8"); horn.addColorStop(1, "#ffb81f");
    g.fillStyle = horn; g.beginPath(); g.moveTo(-r * .24, -r * .86); g.lineTo(0, -r * 2.2); g.lineTo(r * .24, -r * .86); g.closePath(); g.fill();
    g.strokeStyle = "rgba(160,90,0,.55)"; g.lineWidth = r * .07;
    for (let i = 1; i <= 3; i++) { const yy = -r * (.86 + i * .3), ww = r * .24 * (1 - i * .2); g.beginPath(); g.moveTo(-ww, yy + r * .1); g.lineTo(ww, yy - r * .06); g.stroke(); }
    g.fillStyle = "rgba(255,120,170,.4)"; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * r * .62, r * .26, r * .17, r * .1, 0, 0, 7); g.fill(); }
  } else if (sk.acc === "crown") {
    g.rotate(-.1 + Math.sin(t * 1.4) * .03);
    const gold = g.createLinearGradient(0, -r * 1.6, 0, -r * .7);
    gold.addColorStop(0, "#fff4b8"); gold.addColorStop(.5, "#ffcc33"); gold.addColorStop(1, "#d99200");
    g.fillStyle = gold; g.strokeStyle = "#a86c00"; g.lineWidth = Math.max(1, r * .06); g.lineJoin = "round";
    g.beginPath();
    g.moveTo(-r * .66, -r * .72); g.lineTo(-r * .72, -r * 1.42); g.lineTo(-r * .34, -r * 1.06);
    g.lineTo(0, -r * 1.62); g.lineTo(r * .34, -r * 1.06); g.lineTo(r * .72, -r * 1.42); g.lineTo(r * .66, -r * .72);
    g.closePath(); g.fill(); g.stroke();
    // reflet qui balaie la couronne
    g.save(); g.clip();
    const sx = ((t * .8) % 2.2) * r * 2 - r * 1.6;
    const sh = g.createLinearGradient(sx - r * .3, 0, sx + r * .3, 0);
    sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(.5, "rgba(255,255,255,.85)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sh; g.fillRect(-r, -r * 1.7, r * 2, r * 1.1);
    g.restore();
    for (const [x, y] of [[-.72, -1.42], [0, -1.62], [.72, -1.42]]) { g.fillStyle = "#fff"; g.beginPath(); g.arc(x * r, y * r, r * .1, 0, 7); g.fill(); }
    for (const [x, c] of [[-.38, "#4cc9f0"], [0, "#ff4d78"], [.38, "#06d6a0"]]) { g.fillStyle = c; g.beginPath(); g.arc(x * r, -r * .9, r * .11, 0, 7); g.fill(); }
  }
  g.restore();
}
const skinTrail = (sk, i) => sk.pat === "rainbow" ? RAINBOW[i % RAINBOW.length] : sk.pat === "stars" ? "#e0b8ff" : sk.id === "classic" ? "#ffffff" : sk.c2;
const skinsKey = () => "tr_skins_" + (user ? user.id : "guest");
const selSkinKey = () => "tr_skinsel_" + (user ? user.id : "guest");
/* Les skins exclusifs ne viennent QUE de Google Play (cache local « tr_premium », jamais synchronisé dans le cloud).
   Un achat Play est lié au compte Google Play de l'appareil, d'où une clé commune à tous les comptes du jeu. */
const PREMIUM_IDS = SKINS.filter(s => s.premium).map(s => s.id);
const PREMIUM_KEY = "tr_premium";
const Skins = {
  _memo: null,
  dirty() { this._memo = null; },
  coinOwned() { const o = (store.get(skinsKey()) || []).filter(id => !PREMIUM_IDS.includes(id)); return o.includes("classic") ? o : ["classic", ...o]; },
  premiumOwned() { return (store.get(PREMIUM_KEY) || []).filter(id => PREMIUM_IDS.includes(id)); },
  owned() { return [...this.coinOwned(), ...this.premiumOwned()]; },
  setOwned(list) { store.set(skinsKey(), Array.from(new Set(["classic", ...list.filter(id => !PREMIUM_IDS.includes(id))]))); this.dirty(); },
  setPremium(list) { store.set(PREMIUM_KEY, Array.from(new Set(list.filter(id => PREMIUM_IDS.includes(id))))); this.dirty(); },
  own(id) {
    if (PREMIUM_IDS.includes(id)) { this.setPremium([...this.premiumOwned(), id]); return; }
    const o = this.coinOwned(); if (!o.includes(id)) { this.setOwned([...o, id]); Cloud.push(); }
  },
  has(id) { return this.owned().includes(id); },
  selected() { return store.get(selSkinKey()) || "classic"; },
  select(id) { store.set(selSkinKey(), id); this.dirty(); },
  /* appelé à chaque image : mémorisé, recalculé seulement après un changement (skin, compte, achats) */
  current() {
    const k = selSkinKey();
    if (this._memo && this._memo.k === k) return this._memo.sk;
    const id = this.selected();
    const sk = (this.has(id) && SKINS.find(s => s.id === id)) || SKINS[0];   // skin remboursé ou introuvable : retour au classique
    this._memo = { k, sk };
    return sk;
  },
  async buy(sk) {
    if (sk.premium) { await IAP.purchase(sk); return; }
    if (this.has(sk.id)) return;
    if (!Coins.spend(sk.price)) { toast("Pas assez de pièces"); return; }
    this.own(sk.id); toast("Skin débloqué !", true); Snd.win();
  }
};

/* ---------- Achats réels (Google Play Billing) ---------- */
const IAP = {
  ready: false,
  plug() { return Plug("NativePurchases"); },
  async init() {
    if (!Native || !this.plug()) return;
    try {
      const r = await this.plug().isBillingSupported();
      this.ready = !!r.isBillingSupported;
      if (this.ready) await this.restore();
    } catch (e) { report(e, "achats:initialisation"); }
  },
  /* Sur Android, purchaseState "1" = acheté ; "2" = en attente (paiement non confirmé) */
  valid(t) { return !!t && !!t.productIdentifier && (t.purchaseState == null || String(t.purchaseState) === "1"); },
  async purchase(sk) {
    if (!Native || !this.plug()) { toast("Les achats ne sont disponibles que dans l'appli installée"); return; }
    if (!this.ready) { toast("Boutique indisponible, réessaie dans un instant"); return; }
    try {
      const res = await this.plug().purchaseProduct({ productIdentifier: sk.productId, productType: "inapp", isConsumable: false });
      if (this.valid(res) && res.productIdentifier === sk.productId) {
        Skins.own(sk.id); toast(sk.name + " débloqué, merci !", true); Snd.win(); renderShop();
      } else if (res && String(res.purchaseState) === "2") {
        toast("Paiement en attente : le skin sera débloqué dès sa validation");
      }
    } catch (e) {
      if (!/cancel/i.test(e.message || "")) { report(e, "achats:achat " + sk.productId); toast("Achat impossible pour l'instant"); }
    }
  },
  /* Source de vérité : la liste des achats valides renvoyée par Google Play (les remboursés en disparaissent).
     Appelé au démarrage : redonne les skins après une réinstallation et retire ceux qui ont été remboursés. */
  async restore() {
    if (!Native || !this.plug()) return;
    try {
      const r = await this.plug().getPurchases({ productType: "inapp" });
      const ids = (r && r.purchases || []).filter(t => this.valid(t)).map(t => t.productIdentifier);
      Skins.setPremium(SKINS.filter(s => s.premium && ids.includes(s.productId)).map(s => s.id));
      if (!$("shop").classList.contains("hidden")) renderShop();
    } catch (e) { report(e, "achats:restauration"); }   // hors ligne : on garde le cache local tel quel
  }
};
