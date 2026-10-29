/* Trace & Roule : moteur de jeu (état, dessin au doigt, effets, physique, boucle, rendu). */
/* ---------- Jeu : état ---------- */
const cv = $("cv"), ctx = cv.getContext("2d");
const game = $("game");
let lvl = 0, L = null, inkMax = 0, bonusUsed = false, fails = 0;
let ball = { x: 0, y: 0, vx: 0, vy: 0, spawn: 1, sq: 0, sqa: 0 };
let strokes = [], segs = [], inkUsed = 0, drawing = null, scale = 1;
let phase = 0;   /* 0 prêt · 1 en cours · 2 victoire (anim) · 3 échec (anim) · 4 écran de victoire */
let phaseT = 0, elapsed = 0, T = 0, shake = 0, gameOn = false, framing = false, lastT = 0;
let parts = [], fxp = [], trail = [], bumpAnim = [], winFrom = [0, 0], portalCd = 0;

function fit() {
  const st = $("stage").getBoundingClientRect();
  const s = Math.min(st.width / W, st.height / H);
  const dpr = window.devicePixelRatio || 1;
  cv.style.width = W * s + "px"; cv.style.height = H * s + "px";
  cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
  scale = s * dpr;
}
window.addEventListener("resize", () => { if (gameOn) fit(); });

function startLevel(i) {
  lvl = i; L = LEVELS[i]; inkMax = L.ink; bonusUsed = false; fails = 0;
  const w = worldOf(i);
  game.style.setProperty("--top", w.top); game.style.setProperty("--bot", w.bot); game.style.setProperty("--ink", w.ink);
  $("bonus").disabled = false; $("skipRow").classList.add("hidden");
  strokes = []; segs = []; inkUsed = 0; parts = []; shake = 0;
  bumpAnim = (L.bumpers || []).map(() => 0);
  initFx(w);
  const t = $("ltitle");
  const tb = document.createElement("b"), ts = document.createElement("span");
  if (duelMode && duelMode.active) { tb.textContent = "⚔️ Duel"; ts.textContent = "contre " + (Duel.opp ? Duel.opp.pseudo : "?"); }
  else { tb.textContent = "Niveau " + (i + 1); ts.textContent = w.icon + " " + w.name; }
  t.replaceChildren(tb, ts);
  t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop");
  $("hint").classList.toggle("hidden", i > 1 || !!(duelMode && duelMode.active));
  $("skipRow").classList.add("hidden");
  $("bonus").classList.toggle("hidden", !!(duelMode && duelMode.active) || CFG.ADS.enabled !== true);
  $("win").classList.add("hidden");
  show("game");
  fit(); resetBall(); updateInk();
}
function resetBall() {
  ball = { x: L.ball[0], y: L.ball[1], vx: 0, vy: 0, spawn: 0, sq: 0, sqa: 0 };
  phase = 0; phaseT = 0; elapsed = 0; simT = 0; trail = []; portalCd = 0;
  $("go").textContent = "Lancer la balle"; $("go").classList.add("pulse");
}
function updateInk() {
  $("inkbar").style.width = Math.max(0, 100 * (1 - inkUsed / inkMax)) + "%";
  $("inkwrap").classList.toggle("low", inkUsed / inkMax > .82);
}
function rebuildSegs() {
  segs = [];
  for (const s of strokes) for (let i = 1; i < s.length; i++) segs.push([s[i-1][0], s[i-1][1], s[i][0], s[i][1]]);
}

/* ---------- Dessin au doigt ---------- */
function pos(e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
}
cv.addEventListener("pointerdown", e => {
  if (phase >= 2 || inkUsed >= inkMax) return;
  cv.setPointerCapture(e.pointerId);
  const p = pos(e);
  drawing = [p]; strokes.push(drawing);
  $("hint").classList.add("hidden");
  spark(p[0], p[1], worldOf(lvl).ink);
});
cv.addEventListener("pointermove", e => {
  if (!drawing) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (events.length ? events : [e])) {
    const p = pos(ev), q = drawing[drawing.length - 1];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < 6) continue;
    if (inkUsed + d > inkMax) { drawing = null; toast("Plus d'encre !"); vib(30); break; }
    drawing.push(p); inkUsed += d;
    segs.push([q[0], q[1], p[0], p[1]]);
    spark(p[0], p[1], worldOf(lvl).ink);
  }
  updateInk();
});
const endDraw = () => { drawing = null; };
cv.addEventListener("pointerup", endDraw);
cv.addEventListener("pointercancel", endDraw);

/* ---------- Effets ---------- */
const CONF = ["#ffd166", "#ff4d78", "#06d6a0", "#4cc9f0", "#b388ff", "#ffffff"];
function burst(x, y, type, n, color, sp) {
  sp = sp || 180;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, v = sp * (.35 + Math.random());
    const cf = type === "confetti";
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (cf ? 140 : 0), life: 0, max: cf ? 1.9 : .6 + Math.random() * .4,
      c: color || CONF[i % CONF.length], s: cf ? 4 + Math.random() * 4 : 2 + Math.random() * 2.6, type, rot: Math.random() * 6.28, vr: (Math.random() - .5) * 12, g: cf ? 420 : 240 });
  }
}
function ring(x, y, r, color) { parts.push({ x, y, type: "ring", life: 0, max: .5, r, c: color || "#fff", vx: 0, vy: 0, g: 0, rot: 0, vr: 0, s: 1 }); }
function spark(x, y, c) { parts.push({ x, y, vx: (Math.random() - .5) * 50, vy: (Math.random() - .5) * 50 - 20, life: 0, max: .5, c, s: 1.6 + Math.random() * 1.8, type: "dot", g: 60, rot: 0, vr: 0 }); }
function updParts(dt) {
  for (const p of parts) { p.life += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.vr || 0) * dt; }
  parts = parts.filter(p => p.life < p.max);
}
function drawParts() {
  for (const p of parts) {
    const k = Math.max(0, 1 - p.life / p.max);
    ctx.globalAlpha = k;
    if (p.type === "ring") { ctx.strokeStyle = p.c; ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - k) * 26, 0, 7); ctx.stroke(); }
    else if (p.type === "confetti") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.s, -p.s * .5, p.s * 2, p.s); ctx.restore(); }
    else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * k + .4, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function initFx(w) {
  fxp = []; const n = w.fx === "stars" ? 48 : 28;
  for (let i = 0; i < n; i++) fxp.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.6, s: .3 + Math.random() * .9, ph: Math.random() * 6.28 });
}
function updFx(dt, w) {
  for (const p of fxp) {
    if (w.fx === "bubbles") { p.y -= p.s * 24 * dt; p.x += Math.sin(T * 1.5 + p.ph) * 8 * dt; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } }
    else if (w.fx === "embers") { p.y -= p.s * 46 * dt; p.x += Math.sin(T * 2 + p.ph) * 14 * dt; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } }
    else if (w.fx === "fireflies") { p.x += Math.cos(T * .6 + p.ph) * 12 * dt; p.y += Math.sin(T * .8 + p.ph * 1.3) * 12 * dt; }
  }
}
function drawFx(w) {
  for (const p of fxp) {
    let a = .3, col = "#d6f3ff";
    if (w.fx === "stars") { a = .3 + .7 * Math.abs(Math.sin(T * 1.2 + p.ph)); col = "#ffffff"; }
    else if (w.fx === "fireflies") { a = .2 + .6 * Math.abs(Math.sin(T * 1.5 + p.ph)); col = "#eaffb5"; }
    else if (w.fx === "embers") { a = .3 + .5 * Math.abs(Math.sin(T * 6 + p.ph)); col = "#ffb347"; }
    ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    if (w.fx === "bubbles") { ctx.globalAlpha = a * 1.5; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

/* ---------- Physique ---------- */
function hit(sp, nx, ny) {
  ball.sq = Math.max(ball.sq || 0, Math.min(.34, sp / 2200)); ball.sqa = Math.atan2(ny, nx);
  if (sp > 230) { Snd.tick(sp); if (sp > 420) burst(ball.x - nx * R, ball.y - ny * R, "dot", 5, "#ffffff", 60); }
}
function collide(x1, y1, x2, y2, th, onIce) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? ((ball.x - x1) * dx + (ball.y - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  let nx = ball.x - cx, ny = ball.y - cy, d = Math.hypot(nx, ny);
  const min = R + th / 2;
  if (d >= min) return;
  if (d < 1e-6) { nx = 0; ny = -1; d = 0; } else { nx /= d; ny /= d; }
  ball.x = cx + nx * min; ball.y = cy + ny * min;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    const k = Math.abs(vn) < 60 ? 1 : 1 + REST;   // pas de rebond minuscule
    ball.vx -= k * vn * nx; ball.vy -= k * vn * ny;
    const tx = -ny, ty = nx, vt = ball.vx * tx + ball.vy * ty;
    const fr = onIce ? 0 : FRICTION;
    ball.vx -= vt * fr * tx; ball.vy -= vt * fr * ty;
    if (-vn > 140) hit(-vn, nx, ny);
  }
}
function wallAt(w, t) {
  if (w.length < 6) return w;
  const k = Math.sin((w[6] || 0) * t + (w[7] || 0));
  return [w[0] + w[4] * k, w[1] + w[5] * k, w[2] + w[4] * k, w[3] + w[5] * k];
}
function inRect(x, y, r) { return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]; }
function step(dt) {
  simT += dt;
  if (L.wind) for (const z of L.wind) if (inRect(ball.x, ball.y, z)) { ball.vx += z[4] * dt; ball.vy += z[5] * dt; }
  ball.vy += G * dt;
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  const onIce = L.ice && L.ice.some(z => inRect(ball.x, ball.y, z));
  for (const w of L.walls) collide(w[0], w[1], w[2], w[3], WALL, onIce);
  if (L.movers) for (const w0 of L.movers) { const w = wallAt(w0, simT); collide(w[0], w[1], w[2], w[3], WALL, onIce); }
  for (const s of segs) collide(s[0], s[1], s[2], s[3], STROKE, onIce);
  if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx) * REST; }
  if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx) * REST; }
  if (L.portals) for (const p of L.portals) {
    if (portalCd <= 0) {
      if (Math.hypot(ball.x - p[0], ball.y - p[1]) < p[4]) { ball.x = p[2]; ball.y = p[3]; portalCd = .35; ring(p[2], p[3], p[4], "#5efce8"); break; }
      if (Math.hypot(ball.x - p[2], ball.y - p[3]) < p[4]) { ball.x = p[0]; ball.y = p[1]; portalCd = .35; ring(p[0], p[1], p[4], "#5efce8"); break; }
    }
  }
  portalCd = Math.max(0, portalCd - dt);
  if (L.bumpers) for (let bi = 0; bi < L.bumpers.length; bi++) {
    const b = L.bumpers[bi];
    let nx = ball.x - b[0], ny = ball.y - b[1], d = Math.hypot(nx, ny);
    const min = R + b[2];
    if (d < min) {
      if (d < 1e-6) { nx = 0; ny = -1; d = 0; } else { nx /= d; ny /= d; }
      ball.x = b[0] + nx * min; ball.y = b[1] + ny * min;
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        ball.vx -= 2.15 * vn * nx; ball.vy -= 2.15 * vn * ny;
        bumpAnim[bi] = 1; Snd.boing(); ring(b[0], b[1], b[2], "#cfc9ff"); vib(15);
      }
    }
  }
  for (const h0 of L.hazards) { const h = hz(h0, simT); if (Math.hypot(ball.x - h[0], ball.y - h[1]) < R + h[2] - 3) return "lose"; }
  if (Math.hypot(ball.x - L.goal[0], ball.y - L.goal[1]) < L.goal[2] - 2) return "win";
  if (ball.y > H + 40) return "lose";
  return null;
}

/* ---------- Boucle principale ---------- */
function frame(t) {
  if (!gameOn) { framing = false; return; }
  const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016); lastT = t; T += dt;
  if (L) { update(dt); render(); }
  requestAnimationFrame(frame);
}
function update(dt) {
  const w = worldOf(lvl);
  updFx(dt, w);
  if (ball.spawn < 1) ball.spawn = Math.min(1, ball.spawn + dt / .45);
  ball.sq = Math.max(0, (ball.sq || 0) - dt * 1.6);
  for (let i = 0; i < bumpAnim.length; i++) bumpAnim[i] = Math.max(0, bumpAnim[i] - dt * 3);
  shake = Math.max(0, shake - dt * 1.8);
  if (phase === 1) {
    elapsed += dt;
    for (let i = 0; i < SUB; i++) { const r = step(dt / SUB); if (r) { endRun(r); break; } }
    if (phase === 1) {
      trail.push([ball.x, ball.y]); if (trail.length > 16) trail.shift();
      { const sk = Skins.current(); if (sk.premium && Math.random() < .35) spark(ball.x + (Math.random() - .5) * 8, ball.y + (Math.random() - .5) * 8, sk.pat === "stars" ? "#f0d0ff" : sk.id === "diamond" ? "#dff6ff" : "#fff3b0"); }
      if (elapsed > 20) endRun("lose");
    }
  } else if (phase === 2) {
    phaseT += dt;
    if (phaseT > .95) { phase = 4; showWin(); }
  } else if (phase === 3) {
    phaseT += dt;
    if (phaseT > .85) {
      resetBall(); toast("Raté ! Essaie un autre tracé");
      if (fails >= 6 && !(duelMode && duelMode.active)) $("skipRow").classList.remove("hidden");
    }
  }
  updParts(dt);
}
function endRun(r) {
  if (r === "win") {
    phase = 2; phaseT = 0; winFrom = [ball.x, ball.y]; ball.vx = ball.vy = 0;
    burst(L.goal[0], L.goal[1], "confetti", 60, null, 260);
    ring(L.goal[0], L.goal[1], L.goal[2], "#06d6a0"); ring(L.goal[0], L.goal[1], L.goal[2] + 14, "#ffffff");
    Snd.win(); vib([30, 40, 70]);
  } else {
    phase = 3; phaseT = 0; fails++;
    burst(ball.x, ball.y, "dot", 26, "#ff8fa3", 230); ring(ball.x, ball.y, R, "#ff4d78");
    shake = .7; Snd.lose(); vib(120);
  }
  $("go").textContent = "Lancer la balle"; $("go").classList.add("pulse");
}
function showWin() {
  let stars;
  if (L.par) { const r = inkUsed / L.par; stars = r <= 1.7 ? 3 : r <= 2.6 ? 2 : 1; }
  else { const r = inkUsed / L.ink; stars = r < .4 ? 3 : r < .7 ? 2 : 1; }
  const gained = setStars(lvl, stars);
  if (duelMode && duelMode.active) { Duel.onWin(); return; }
  $("wcoins").classList.toggle("hidden", !gained);
  $("wcoins").textContent = "+" + gained + " 🪙";
  announceAch();
  const last = lvl >= LEVELS.length - 1;
  $("wbadge").textContent = ["", "👍", "👏", "🏆"][stars];
  $("wtitle").textContent = last ? "Tu as tout terminé !" : ["", "Réussi !", "Bien joué !", "Parfait !"][stars];
  $("stars").innerHTML = [0, 1, 2].map(k => '<i class="' + (k < stars ? "on" : "") + '" style="--k:' + k + '">★</i>').join("");
  $("wsub").textContent = stars === 3 ? "Trait de génie, très peu d'encre !" : "Astuce : moins d'encre = plus d'étoiles (" + Math.round(100 * inkUsed / L.ink) + " % utilisée)";
  $("wnext").classList.toggle("hidden", last);
  for (let k = 0; k < stars; k++) setTimeout(() => Snd.star(k), 350 + k * 250);
  $("win").classList.remove("hidden");
  // rejoue l'animation de la carte
  const c = $("win").querySelector(".card"); c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
}

/* ---------- Boutons ---------- */
$("go").onclick = () => {
  if (phase === 1) { resetBall(); return; }
  if (phase >= 2) return;
  resetBall(); ball.spawn = 1; phase = 1;
  $("go").textContent = "Stop"; $("go").classList.remove("pulse");
  Snd.launch();
};
$("clear").onclick = () => { strokes = []; segs = []; inkUsed = 0; updateInk(); resetBall(); Snd.pop(); };
$("undo").onclick = () => {
  const s = strokes.pop();
  if (s) { for (let i = 1; i < s.length; i++) inkUsed -= Math.hypot(s[i][0] - s[i-1][0], s[i][1] - s[i-1][1]); inkUsed = Math.max(0, inkUsed); }
  rebuildSegs(); updateInk(); resetBall(); Snd.pop();
};
$("bonus").onclick = async () => {
  if (bonusUsed) return;
  if (phase === 1) resetBall();
  if (await Ads.rewarded()) {
    bonusUsed = true; inkMax += Math.round(L.ink * 0.4);
    $("bonus").disabled = true; updateInk(); toast("+40 % d'encre !", true);
  }
};
$("skip").onclick = async () => {
  if (CFG.ADS.enabled === true && !(await Ads.rewarded())) return;
  setSkipped(lvl); Snd.pop();
  if (lvl >= LEVELS.length - 1) showMenu(); else startLevel(lvl + 1);
};
$("back").onclick = () => {
  Snd.pop();
  if (duelMode && duelMode.active) { if (confirm("Quitter le duel ? Ce sera compté comme une défaite.")) Duel.forfeit(); return; }
  showMenu();
};
$("wmenu").onclick = async () => { $("win").classList.add("hidden"); await Ads.interstitialIfDue(); showMenu(); };
$("wretry").onclick = () => { Snd.pop(); startLevel(lvl); };
$("wnext").onclick = async () => { $("win").classList.add("hidden"); await Ads.interstitialIfDue(); Snd.pop(); startLevel(lvl + 1); };
$("snd").onclick = () => { Snd.set(!Snd.on); $("snd").textContent = Snd.on ? "🔊" : "🔇"; Snd.pop(); };

/* ---------- Rendu ---------- */
function seg(x1, y1, x2, y2, w, col, a) {
  ctx.globalAlpha = a == null ? 1 : a; ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1;
}
function starPath(cx, cy, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r;
    ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}
const easeOutBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeOut = x => 1 - Math.pow(1 - x, 3);

function render() {
  const w = worldOf(lvl);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - .5) * shake * 12, (Math.random() - .5) * shake * 12);

  // fond + ambiance
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, w.top); g.addColorStop(1, w.bot);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  drawFx(w);
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  // zones de vent
  if (L.wind) for (const z of L.wind) {
    ctx.save(); ctx.beginPath(); ctx.rect(z[0], z[1], z[2], z[3]); ctx.clip();
    ctx.globalAlpha = .14; ctx.fillStyle = "#8fe3ff"; ctx.fillRect(z[0], z[1], z[2], z[3]);
    ctx.globalAlpha = .4; ctx.strokeStyle = "#cdf4ff"; ctx.lineWidth = 2;
    const ang = Math.atan2(z[5], z[4]), sp = Math.hypot(z[4], z[5]);
    for (let i = 0; i < 4; i++) {
      const off = ((T * sp * .12) + i * (z[2] + z[3])) % (z[2] + z[3] + 40) - 20;
      const x0 = z[0] + Math.cos(ang) * -20 + Math.cos(ang) * off, y0 = z[1] + z[3] / 2 + (i - 1.5) * 14;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(ang) * 22, y0 + Math.sin(ang) * 22); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // zones de glace
  if (L.ice) for (const z of L.ice) {
    ctx.fillStyle = "rgba(190,235,255,.22)"; ctx.fillRect(z[0], z[1], z[2], z[3]);
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.5; ctx.strokeRect(z[0] + 1, z[1] + 1, z[2] - 2, z[3] - 2);
  }
  // murs
  for (const wl of L.walls) {
    seg(wl[0], wl[1], wl[2], wl[3], WALL + 9, w.wall, .12);
    seg(wl[0], wl[1], wl[2], wl[3], WALL, w.wall, 1);
    seg(wl[0], wl[1] - 1.4, wl[2], wl[3] - 1.4, 1.6, "#ffffff", .7);
  }
  // plateformes mobiles
  if (L.movers) for (const w0 of L.movers) {
    const wl = wallAt(w0, simT);
    seg(wl[0], wl[1], wl[2], wl[3], WALL + 9, "#ffd166", .18);
    seg(wl[0], wl[1], wl[2], wl[3], WALL, "#ffd166", 1);
    seg(wl[0], wl[1] - 1.4, wl[2], wl[3] - 1.4, 1.6, "#fff6d6", .8);
  }
  // portails
  if (L.portals) for (const p of L.portals) {
    for (const [px, py] of [[p[0], p[1]], [p[2], p[3]]]) {
      const pu = .5 + .5 * Math.sin(T * 4 + px * .1);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = .3 + .2 * pu; ctx.fillStyle = "#5efce8"; ctx.beginPath(); ctx.arc(px, py, p[4] + 4, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.strokeStyle = "#5efce8"; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -T * 40;
      ctx.beginPath(); ctx.arc(px, py, p[4], 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // cible
  const gx = L.goal[0], gy = L.goal[1], gr = L.goal[2], pu = .5 + .5 * Math.sin(T * 3);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .2 + .14 * pu; ctx.fillStyle = "#06d6a0"; ctx.beginPath(); ctx.arc(gx, gy, gr + 10 + pu * 8, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.strokeStyle = "#06d6a0"; ctx.lineWidth = 3.5; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -T * 26;
  ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#06d6a0"; starPath(gx, gy, gr * .66, T * .9); ctx.fill();
  ctx.fillStyle = "#eafff8"; ctx.beginPath(); ctx.arc(gx, gy, gr * .17, 0, 7); ctx.fill();

  // rebondisseurs
  if (L.bumpers) L.bumpers.forEach((b, i) => {
    const k = 1 + .22 * (bumpAnim[i] || 0) + .03 * Math.sin(T * 4 + i);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(124,108,255,.3)"; ctx.beginPath(); ctx.arc(b[0], b[1], (b[2] + 7) * k, 0, 7); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    const bg = ctx.createRadialGradient(b[0] - b[2] * .3, b[1] - b[2] * .3, 2, b[0], b[1], b[2] * k);
    bg.addColorStop(0, "#b7adff"); bg.addColorStop(1, "#6a56f0");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b[0], b[1], b[2] * k, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b[0], b[1], b[2] * .55 * k, 0, 7); ctx.stroke();
  });

  // pièges (pics qui tournent)
  L.hazards.forEach((h0, i) => {
    if (h0[3] || h0[4]) {
      ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(h0[0] - (h0[3] || 0), h0[1] - (h0[4] || 0)); ctx.lineTo(h0[0] + (h0[3] || 0), h0[1] + (h0[4] || 0)); ctx.stroke();
      ctx.setLineDash([]);
    }
    const h = hz(h0, simT), rot = T * (i % 2 ? 1.4 : -1.4);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,77,120,.22)"; ctx.beginPath(); ctx.arc(h[0], h[1], h[2] + 9 + 2 * Math.sin(T * 5 + i), 0, 7); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ff4d78";
    for (let s = 0; s < 8; s++) {
      const a = rot + s * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(h[0] + Math.cos(a - .3) * h[2], h[1] + Math.sin(a - .3) * h[2]);
      ctx.lineTo(h[0] + Math.cos(a) * (h[2] + 8), h[1] + Math.sin(a) * (h[2] + 8));
      ctx.lineTo(h[0] + Math.cos(a + .3) * h[2], h[1] + Math.sin(a + .3) * h[2]);
      ctx.fill();
    }
    const hg = ctx.createRadialGradient(h[0] - 3, h[1] - 3, 1, h[0], h[1], h[2]);
    hg.addColorStop(0, "#ff9aa8"); hg.addColorStop(1, "#e0245e");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(h[0], h[1], h[2], 0, 7); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(h[0] - h[2] * .32, h[1] - h[2] * .1, h[2] * .2, 0, 7); ctx.arc(h[0] + h[2] * .32, h[1] - h[2] * .1, h[2] * .2, 0, 7); ctx.fill();
    ctx.fillStyle = "#3a0a1a";
    ctx.beginPath(); ctx.arc(h[0] - h[2] * .32, h[1] - h[2] * .06, h[2] * .09, 0, 7); ctx.arc(h[0] + h[2] * .32, h[1] - h[2] * .06, h[2] * .09, 0, 7); ctx.fill();
  });

  // traits du joueur
  for (const s of strokes) {
    if (s.length === 1) { ctx.fillStyle = w.ink; ctx.beginPath(); ctx.arc(s[0][0], s[0][1], STROKE / 2, 0, 7); ctx.fill(); continue; }
    ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]);
    ctx.globalAlpha = .2; ctx.strokeStyle = w.ink; ctx.lineWidth = STROKE + 9; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = STROKE; ctx.stroke();
    ctx.globalAlpha = .55; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
  }

  // traînée
  const trailSkin = Skins.current();
  for (let i = 0; i < trail.length; i++) {
    const k = i / trail.length;
    ctx.globalAlpha = k * .4; ctx.fillStyle = skinTrail(trailSkin, i);
    ctx.beginPath(); ctx.arc(trail[i][0], trail[i][1], R * (.35 + .55 * k), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (phase !== 3 && phase !== 4) drawBall();
  drawParts();
  ctx.restore();
}

function drawBall() {
  const sp = Math.hypot(ball.vx, ball.vy);
  let sc = ball.spawn < 1 ? easeOutBack(ball.spawn) : 1;
  if (phase === 2) {
    const k = Math.min(1, phaseT / .55);
    ball.x = winFrom[0] + (L.goal[0] - winFrom[0]) * easeOut(k);
    ball.y = winFrom[1] + (L.goal[1] - winFrom[1]) * easeOut(k);
    sc *= 1 - .7 * k;
  }
  ctx.save(); ctx.translate(ball.x, ball.y); ctx.scale(sc, sc);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .28; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, R + 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  if ((ball.sq || 0) > .02) { ctx.rotate(ball.sqa); ctx.scale(1 - ball.sq, 1 + ball.sq * .9); ctx.rotate(-ball.sqa); }
  else if (sp > 220) { const a = Math.atan2(ball.vy, ball.vx), st = Math.min(.2, sp / 3600); ctx.rotate(a); ctx.scale(1 + st, 1 - st * .8); ctx.rotate(-a); }
  const sk = Skins.current();
  paintSkin(ctx, R, sk, T);
  ctx.strokeStyle = "rgba(30,30,90,.35)"; ctx.lineWidth = 1.4; ctx.stroke();
  // yeux
  let lx = phase === 1 ? ball.vx : L.goal[0] - ball.x, ly = phase === 1 ? ball.vy : L.goal[1] - ball.y;
  const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
  ctx.strokeStyle = "#22224a"; ctx.fillStyle = "#22224a"; ctx.lineWidth = 1.7;
  if (phase === 2) {
    for (const ex of [-3.6, 3.6]) { ctx.beginPath(); ctx.arc(ex, -.5, 2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 2.5, 3, .15, Math.PI - .15); ctx.stroke();
  } else if ((T % 3.4) < .12) {
    for (const ex of [-3.6, 3.6]) { ctx.beginPath(); ctx.moveTo(ex - 1.8, -1); ctx.lineTo(ex + 1.8, -1); ctx.stroke(); }
  } else {
    for (const ex of [-3.6, 3.6]) {
      ctx.beginPath(); ctx.arc(ex + lx * 1.2, -1 + ly * 1.2, 2, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex + lx * 1.2 - .6, -1.7 + ly * 1.2, .7, 0, 7); ctx.fill(); ctx.fillStyle = "#22224a";
    }
    if (sp > 520) { ctx.beginPath(); ctx.ellipse(0, 4, 1.6, 2.1, 0, 0, 7); ctx.fill(); }
  }
  paintAccessory(ctx, R, sk, T);
  ctx.restore();
}
