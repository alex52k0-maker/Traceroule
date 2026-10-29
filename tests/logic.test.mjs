// Tests unitaires de la logique pure du jeu (www/logic.js), sans navigateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const L = createRequire(import.meta.url)("../www/logic.js");

test("escHtml neutralise toute balise et tout guillemet", () => {
  assert.equal(L.escHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(L.escHtml("l'été & co"), "l&#39;été &amp; co");
  assert.equal(L.escHtml(null), "");
});

test("cleanPseudo ne laisse passer que l'alphabet autorisé, 16 caractères max", () => {
  assert.equal(L.cleanPseudo('<img src=x onerror="x">'), "img srcx onerror");   // nettoyé puis coupé à 16 caractères
  assert.equal(L.cleanPseudo("Zoé_42"), "Zoé_42");
  assert.equal(L.cleanPseudo("a".repeat(40)).length, 16);
  assert.equal(L.cleanPseudo("<><>"), "Joueur");
  assert.equal(L.cleanPseudo(undefined), "Joueur");
});

test("validatePseudo suit la même règle que Firestore", () => {
  assert.equal(L.validatePseudo("  Gizmo  "), "Gizmo");
  assert.equal(L.validatePseudo("Élodie-3"), "Élodie-3");
  assert.equal(L.validatePseudo("ab"), null);
  assert.equal(L.validatePseudo("a".repeat(17)), null);
  assert.equal(L.validatePseudo("<script>"), null);
  assert.equal(L.validatePseudo("hé😀"), null);
});

test("mergeProg garde le meilleur score de chaque niveau", () => {
  assert.deepEqual(L.mergeProg([3, 0, -1, 1], [1, 2, 0, -1]), [3, 2, -1, 1]);
  assert.deepEqual(L.mergeProg([], [], 3), [0, 0, 0]);
  assert.deepEqual(L.mergeProg([2], null, 2), [2, 0]);
});

test("eloAfter : symétrique, borné, et favorise l'exploit contre plus fort", () => {
  assert.equal(L.eloAfter(1000, 1000, true), 1016);
  assert.equal(L.eloAfter(1000, 1000, false), 984);
  assert.ok(L.eloAfter(1000, 1400, true) - 1000 > L.eloAfter(1400, 1000, true) - 1400);
  assert.equal(L.eloAfter(10, 10, false), 0);      // la côte ne descend jamais sous zéro
  assert.equal(L.eloAfter(5, 3000, false), 5);      // perdre contre bien plus fort ne coûte presque rien
});

test("metaMerge additionne les succès et garde les maxima", () => {
  const m = L.metaMerge({ ach: ["a"], dl: { d: 10, s: 3 }, bs: 3, dw: 2, dd: 5 }, { ach: ["b", "a"], dl: { d: 9, s: 7 }, bs: 7, dw: 1, dd: 6 });
  assert.deepEqual(m.ach.sort(), ["a", "b"]);
  assert.deepEqual(m.dl, { d: 10, s: 3 });
  assert.equal(m.bs, 7); assert.equal(m.dw, 2); assert.equal(m.dd, 6);
  assert.deepEqual(L.metaMerge(null, undefined), L.metaBlank());
});

test("dailyState : série continue, remise à zéro, cycle de 7 jours", () => {
  assert.deepEqual(L.dailyState({ d: 100, s: 3 }, 100), { ready: false, streak: 3, idx: 2 });
  assert.deepEqual(L.dailyState({ d: 99, s: 3 }, 100), { ready: true, streak: 4, idx: 3 });
  assert.deepEqual(L.dailyState({ d: 97, s: 3 }, 100), { ready: true, streak: 1, idx: 0 });
  assert.deepEqual(L.dailyState({ d: 99, s: 7 }, 100), { ready: true, streak: 8, idx: 0 });
  assert.deepEqual(L.dailyState(null, 100), { ready: true, streak: 1, idx: 0 });
});
