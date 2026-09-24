/* Applique les réglages Android nécessaires après `npx cap add android` / `npx cap sync`.
   Idempotent : peut être relancé sans risque. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const androidApp = path.join(root, "android", "app");
const manifestPath = path.join(androidApp, "src", "main", "AndroidManifest.xml");
const gradlePath = path.join(androidApp, "build.gradle");

// ID d'application AdMob (ca-app-pub-XXXX~YYYY). Par défaut : ID de TEST Google.
let appCfg = {};
try { appCfg = JSON.parse(fs.readFileSync(path.join(root, "app-config.json"), "utf8")); } catch (e) {}
const ADMOB_APP_ID = process.env.ADMOB_APP_ID || appCfg.admobAppId || "ca-app-pub-3940256099942544~3347511713";
const VERSION_CODE = process.env.VERSION_CODE || "1";
const VERSION_NAME = process.env.VERSION_NAME || "1.0.0";

function must(cond, msg) { if (!cond) { console.error("✖ " + msg); process.exit(1); } }

/* ---- AndroidManifest ---- */
must(fs.existsSync(manifestPath), "AndroidManifest.xml introuvable (lance d'abord `npx cap add android`)");
let m = fs.readFileSync(manifestPath, "utf8");

m = m.replace(/<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>\s*/g, "");
m = m.replace("</application>",
  `    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${ADMOB_APP_ID}" />\n    </application>`);

if (!/android:screenOrientation=/.test(m)) {
  m = m.replace('android:launchMode="singleTask"', 'android:launchMode="singleTask"\n            android:screenOrientation="portrait"');
}
// Permission requise par les SDK publicitaires récents (ID publicitaire)
if (!/com\.google\.android\.gms\.permission\.AD_ID/.test(m)) {
  m = m.replace("</manifest>", '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />\n</manifest>');
}
fs.writeFileSync(manifestPath, m);

/* ---- build.gradle ---- */
let g = fs.readFileSync(gradlePath, "utf8");
g = g.replace(/versionCode\s*=?\s*\d+/, `versionCode ${VERSION_CODE}`);
g = g.replace(/versionName\s*=?\s*"[^"]*"/, `versionName "${VERSION_NAME}"`);

if (!g.includes("signingConfigs.release")) {
  const signing = `    signingConfigs {
        release {
            if (System.getenv("KEYSTORE_PATH")) {
                storeFile file(System.getenv("KEYSTORE_PATH"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
`;
  must(g.includes("    buildTypes {"), "bloc buildTypes introuvable dans build.gradle");
  g = g.replace("    buildTypes {", signing + "    buildTypes {");
  g = g.replace(/(buildTypes\s*\{\s*release\s*\{)/, "$1\n            signingConfig signingConfigs.release");
}
fs.writeFileSync(gradlePath, g);

/* ---- Icônes ---- */
const src = path.join(root, "android-res");
const dst = path.join(androidApp, "src", "main", "res");
function copyDir(a, b) {
  if (!fs.existsSync(a)) return;
  fs.mkdirSync(b, { recursive: true });
  for (const f of fs.readdirSync(a)) {
    const from = path.join(a, f), to = path.join(b, f);
    if (fs.statSync(from).isDirectory()) copyDir(from, to); else fs.copyFileSync(from, to);
  }
}
copyDir(src, dst);

console.log(`✔ Android patché (AdMob app id, orientation, signature, version ${VERSION_NAME} / code ${VERSION_CODE}, icônes)`);
