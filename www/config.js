/* =========================================================
   CONFIGURATION — à modifier avant la publication
   ========================================================= */
window.CFG = {
  // ID client OAuth de type "Application Web" (Google Cloud Console).
  // Utilisé pour la connexion Google dans l'appli Android ET dans le navigateur.
  GOOGLE_WEB_CLIENT_ID: "683688408108-id140bhmag5uins98f26t8hlb1701tld.apps.googleusercontent.com",
   FIREBASE: {
    apiKey: "AIzaSyDOP6BkVRXN5lxmrPrcXHej4wf5D0t-CBQ",
    projectId: "traceroule-6fbe3"
  },

  // Adresse publique de ta politique de confidentialité (voir docs/privacy.html)
  PRIVACY_URL: "https://alex52k0-maker.github.io/traceroule/privacy.html",

  ADS: {
    enabled: true,
    // true  = publicités de TEST Google (obligatoire pendant le développement)
    // false = vraies publicités (à mettre AVANT de publier sur le Play Store)
    test: true,

    // Identifiants des blocs d'annonces créés dans AdMob (ca-app-pub-XXXX/YYYY)
    banner:       "ca-app-pub-XXXXXXXXXXXXXXXX/1111111111",
    interstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/2222222222",
    rewarded:     "ca-app-pub-XXXXXXXXXXXXXXXX/3333333333"
  }
};
