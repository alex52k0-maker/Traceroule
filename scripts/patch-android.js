const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const androidApp = path.join(root, "android", "app");
const res = path.join(androidApp, "src", "main", "res");
const manifestPath = path.join(androidApp, "src", "main", "AndroidManifest.xml");
const gradlePath = path.join(androidApp, "build.gradle");

let appCfg = {};
try { appCfg = JSON.parse(fs.readFileSync(path.join(root, "app-config.json"), "utf8")); } catch (e) {}
const ADMOB_APP_ID = process.env.ADMOB_APP_ID || appCfg.admobAppId || "ca-app-pub-3940256099942544~3347511713";
const VERSION_CODE = process.env.VERSION_CODE || "1";
const VERSION_NAME = process.env.VERSION_NAME || "1.0.0";

function must(cond, msg) { if (!cond) { console.error("ERREUR: " + msg); process.exit(1); } }

/* ---- Manifest ---- */
must(fs.existsSync(manifestPath), "AndroidManifest.xml introuvable");
let m = fs.readFileSync(manifestPath, "utf8");
m = m.replace(/<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>\s*/g, "");
m = m.replace("</application>",
  `    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${ADMOB_APP_ID}" />\n    </application>`);
if (!/android:screenOrientation=/.test(m)) {
  m = m.replace('android:launchMode="singleTask"', 'android:launchMode="singleTask"\n            android:screenOrientation="portrait"');
}
if (!/permission\.AD_ID/.test(m)) {
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
  must(g.includes("    buildTypes {"), "buildTypes introuvable");
  g = g.replace("    buildTypes {", signing + "    buildTypes {");
  g = g.replace(/(buildTypes\s*\{\s*release\s*\{)/, "$1\n            signingConfig signingConfigs.release");
}
fs.writeFileSync(gradlePath, g);

/* ---- Icône : crayon + balle (dessinée en vectoriel) ---- */
const ICON_ART = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="108" android:viewportHeight="108">
  <group android:pivotX="54" android:pivotY="54" android:scaleX="0.80" android:scaleY="0.80">
    <path android:strokeColor="#06D6A0" android:strokeWidth="6.1" android:strokeLineCap="round" android:fillColor="#00000000" android:pathData="M19.8,79.0 C38.1,82.7 52.8,87.5 79.6,87.5"/>
    <path android:fillColor="#F6E0BC" android:pathData="M21.1,79 L28,61.8 L33.1,66.9 Z"/>
    <path android:fillColor="#E0BC8A" android:pathData="M21.1,79 L33.1,66.9 L38.3,72.1 Z"/>
    <path android:fillColor="#06D6A0" android:pathData="M21.1,79 L23.5,72.8 L27.2,76.5 Z"/>
    <path android:fillColor="#FFD166" android:pathData="M28,61.8 L57.3,32.4 L62.5,37.6 L33.1,66.9 Z"/>
    <path android:fillColor="#F2B33D" android:pathData="M33.1,66.9 L62.5,37.6 L67.6,42.8 L38.3,72.1 Z"/>
    <path android:fillColor="#D5DAF2" android:pathData="M57.3,32.4 L64.2,25.5 L69.4,30.7 L62.5,37.6 Z"/>
    <path android:fillColor="#A9B0D6" android:pathData="M62.5,37.6 L69.4,30.7 L74.5,35.9 L67.6,42.8 Z"/>
    <path android:fillColor="#FF6B8A" android:pathData="M64.2,25.5 L71.5,18.2 L75.8,18.2 L78.9,21.2 L69.4,30.7 Z"/>
    <path android:fillColor="#E63E64" android:pathData="M69.4,30.7 L78.9,21.2 L81.9,24.2 L81.9,28.5 L74.5,35.9 Z"/>
    <path android:fillColor="#F4F5FB" android:pathData="M49.7,72.9 a12.2,12.2 0 1,0 24.4,0 a12.2,12.2 0 1,0 -24.4,0 Z"/>
    <path android:fillColor="#CDD1E8" android:pathData="M59.7,76.9 a6.3,6.3 0 1,0 12.6,0 a6.3,6.3 0 1,0 -12.6,0 Z"/>
    <path android:fillColor="#FFFFFF" android:pathData="M54.6,68 a2.8,2.8 0 1,0 5.6,0 a2.8,2.8 0 1,0 -5.6,0 Z"/>
  </group>
</vector>`;
function write(rel, content) {
  const f = path.join(res, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_art"/>
</adaptive-icon>
`;
write("drawable/ic_launcher_art.xml", ICON_ART + "\n");
write("values/ic_launcher_background.xml", `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#161A33</color>
</resources>
`);
write("mipmap-anydpi-v26/ic_launcher.xml", adaptive);
write("mipmap-anydpi-v26/ic_launcher_round.xml", adaptive);

console.log("Android patché, version " + VERSION_NAME + " / " + VERSION_CODE + ", icône crayon + balle");
