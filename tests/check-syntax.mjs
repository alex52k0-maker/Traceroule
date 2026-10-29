// Contrôle rapide avant tout le reste : chaque script du jeu doit être du JavaScript valide,
// et chaque fichier référencé par index.html doit exister (une seule erreur suffit à bloquer le démarrage).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const www = join(import.meta.dirname, "..", "www");
const html = readFileSync(join(www, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^":]+\.(?:js|css))"/g)].map(m => m[1]);
let failed = 0;
for (const f of refs) if (!existsSync(join(www, f))) { console.error("✗ fichier référencé introuvable : www/" + f); failed++; }
for (const f of readdirSync(www).filter(f => f.endsWith(".js"))) {
  const r = spawnSync(process.execPath, ["--check", join(www, f)], { encoding: "utf8" });
  if (r.status !== 0) { console.error("✗ erreur de syntaxe dans www/" + f + "\n" + r.stderr); failed++; }
}
if (failed) { console.error(failed + " problème(s) : le jeu ne démarrerait pas."); process.exit(1); }
console.log("✓ syntaxe valide et " + refs.length + " fichiers référencés présents");
