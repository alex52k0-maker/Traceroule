# Publier Trace & Roule sur le Play Store

Tout se fait depuis GitHub (gratuit) : **pas besoin d'Android Studio ni d'ordinateur puissant**.
Compte 1h30 la première fois, en dehors de l'attente de validation Google.

Ce que tu vas obtenir : un fichier `.aab` prêt à envoyer sur le Play Store, avec connexion Google et pubs AdMob.

---

## 0. Ce qu'il te faut

| Compte | Coût | Lien |
|---|---|---|
| GitHub | gratuit | github.com |
| Google Play Console | 25 $ (une fois) | play.google.com/console |
| AdMob | gratuit | admob.google.com |
| Google Cloud (pour la connexion Google) | gratuit | console.cloud.google.com |

Choisis maintenant ton **nom de package**, unique et définitif (impossible à changer après publication) :
ex. `com.tonprenom.traceroule`. Remplace `com.tracenroule.game` dans `capacitor.config.json` (champ `appId`).

---

## 1. Mettre le projet sur GitHub

1. Crée un dépôt **privé** (important : il contiendra ta clé de signature).
2. Envoie-y tout le contenu de ce dossier (sur téléphone : « Add file → Upload files », glisse les fichiers ; les dossiers cachés `.github` doivent être présents, sinon utilise un ordinateur ou l'appli GitHub Desktop).

---

## 2. Créer ta clé de signature (une seule fois)

1. Onglet **Actions** → workflow **« 1 - Créer la clé de signature »** → *Run workflow*.
2. Quand c'est vert, ouvre l'exécution : note les empreintes **SHA1** affichées dans le résumé, et télécharge l'artefact **cle-de-signature** (en bas).
3. Dans le zip : `keystore-info.txt` contient 4 valeurs. Dans ton dépôt → **Settings → Secrets and variables → Actions → New repository secret**, crée ces 4 secrets avec exactement ces noms :
   `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
4. **Sauvegarde `upload.jks` et `keystore-info.txt` dans un endroit sûr** (gestionnaire de mots de passe, cloud privé). L'artefact GitHub est supprimé au bout de 3 jours.

---

## 3. Connexion Google

Dans console.cloud.google.com :

1. Crée un projet → **API et services → Écran de consentement OAuth** : type *Externe*, nom de l'appli, ton e-mail. Scopes : ceux par défaut (email, profile, openid) suffisent.
   **Clique sur « Publier l'application »** (sinon seuls tes testeurs pourront se connecter).
2. **Identifiants → Créer des identifiants → ID client OAuth** :
   - Type **Application Web** → copie l'ID client. Il va dans `www/config.js` → `GOOGLE_WEB_CLIENT_ID`.
   - Type **Android** → nom du package = ton `appId`, empreinte SHA-1 = celle de l'étape 2.
3. Plus tard, quand l'appli sera sur la Play Console : **Configuration → Intégrité de l'appli → Signature d'appli** : copie l'empreinte SHA-1 du « certificat de signature de l'appli » et crée un **deuxième** ID client Android avec cette empreinte. Sans lui, la connexion Google échouera pour les utilisateurs qui téléchargent depuis le Play Store.

---

## 4. Publicités AdMob

1. Sur admob.google.com : **Applications → Ajouter une appli** (Android, « pas encore publiée »).
2. Copie l'**ID de l'appli** (`ca-app-pub-…~…`) dans `app-config.json` → `admobAppId`.
3. Crée 3 **blocs d'annonces** et colle leurs ID (`ca-app-pub-…/…`) dans `www/config.js` :
   - **Bannière** → `banner` (bandeau en bas de l'écran)
   - **Interstitielle** → `interstitial` (plein écran, toutes les 2 victoires, max 1 par 90 s)
   - **Avec récompense** → `rewarded` (le joueur regarde une vidéo pour gagner +40 % d'encre)
4. **Confidentialité et messages** → crée un message de consentement **RGPD** (obligatoire pour les joueurs en Europe). Le jeu l'affiche automatiquement.
5. Reste en `ADS.test: true` pendant tous tes tests. **Ne clique jamais sur tes propres vraies pubs** : AdMob peut fermer ton compte.

---

## 5. Politique de confidentialité (obligatoire)

Le Play Store exige une adresse web publique.

1. Ouvre `privacy-site/index.html`, remplace `[TON E-MAIL]` et `[TON NOM]`.
2. Crée un **second dépôt public** (ex. `traceroule-privacy`), envoie-y ce fichier, puis **Settings → Pages → Deploy from a branch → main / (root)**.
   Ton adresse sera `https://TON-PSEUDO.github.io/traceroule-privacy/`.
   (Alternative : coller le texte dans une page Google Sites publique.)
3. Colle cette adresse dans `www/config.js` → `PRIVACY_URL`.

---

## 6. Construire le fichier .aab

1. **Actions → « 2 - Construire l'app Android »** → *Run workflow* (renseigne la version, ex. `1.0.0`).
2. Attends ~8 minutes. En bas de l'exécution, télécharge l'artefact **trace-et-roule-android** :
   - `app-release.aab` → à envoyer au Play Store
   - `app-release.apk` → à installer sur ton téléphone pour tester avant
3. Chaque exécution augmente automatiquement le numéro de version interne (obligatoire pour les mises à jour).

Si le build échoue, ouvre l'étape en rouge et envoie-moi le message d'erreur : je corrigerai.

---

## 7. Publier sur la Play Console

1. **Créer une appli** : nom « Trace & Roule », langue français, *Jeu*, *Gratuite*.
2. **Contenu de l'appli** (menu Politique) — à remplir tel quel :
   - Politique de confidentialité : ton URL
   - **Annonces** : *Oui, l'appli contient des annonces*
   - Accès à l'appli : *toutes les fonctionnalités accessibles* (mode invité)
   - **Classification du contenu** : questionnaire → ça sortira PEGI 3
   - **Public cible** : coche **13 ans et plus** (ne coche pas « moins de 13 ans » : cela déclenche la politique Familles, incompatible avec cette configuration de pubs)
   - **Sécurité des données** : voir `store-listing.md`
   - Application d'actualités / COVID / gouvernement : non
3. **Fiche Play Store** : textes dans `store-listing.md`, icône `assets/icon-512.png`, image de présentation `assets/feature-graphic-1024x500.png`, et **au moins 2 captures d'écran** prises sur ton téléphone avec l'APK.
4. **Tests → Test interne** : envoie le `.aab`, ajoute ton e-mail comme testeur, installe et vérifie (connexion Google, pubs de test, niveaux).
5. **Compte personnel créé après le 13 novembre 2023 ?** Google impose un **test fermé avec au moins 12 testeurs inscrits en continu pendant 14 jours** avant de demander l'accès à la production (les comptes « organisation » en sont dispensés). Prépare ta liste d'amis dès maintenant.
   Source : aide Play Console « App testing requirements for new personal developer accounts ».
6. **Avant la version de production** : dans `www/config.js`, passe `ADS.test` à `false`, relance le build (étape 6) et envoie ce nouvel `.aab` en production.
7. Après la première publication, pense à :
   - ajouter le fichier **app-ads.txt** (AdMob te guide) sur le site de ton développeur ;
   - vérifier dans AdMob que l'appli est bien liée à sa fiche Play Store.

---

## Ce qui est déjà géré dans le code

- Connexion Google native (Credential Manager), avec mode invité.
- Bannière, interstitielle et vidéo récompensée AdMob + message de consentement RGPD + bouton « Préférences de pub » quand la loi l'exige.
- Signature, version automatique, icône, écran de démarrage, orientation portrait.
- Progression enregistrée sur l'appareil, par compte Google.

## Limites connues

- La progression ne se synchronise pas entre appareils (il faudrait un serveur, par exemple Firebase).
- Pas d'achat « supprimer les pubs » : c'est le prochain ajout logique (Google Play Billing). Dis-le-moi et je l'ajoute.
- Je n'ai pas pu compiler l'appli Android moi-même dans mon environnement (pas d'Android SDK) : le jeu et les scripts sont testés, mais le premier build sur GitHub est le vrai test.
