# MYTA — Contexte de travail Claude

## Projet
**My Twin App (MYTA)** — app santé Next.js 14 (App Router) déployée sur Vercel.
Repo GitHub : https://github.com/contactideaforma-bit/myta.git
Stack : Next.js 14, Supabase (auth + DB), Stripe, Tailwind, next-pwa, @supabase/ssr ^0.3
Utilisateur : IDEA (contact.ideaforma@gmail.com)

## Style de travail
- Réponses courtes et directes, on code directement
- Build local : `npm run build && npm start`, déploiement : `git push` → Vercel auto-deploy
- Pas de confirmation inutile, on avance

## Architecture clé
- `/src/app/` — pages Next.js App Router
- `/src/app/api/` — routes API (auth via Bearer token + cookies @supabase/ssr)
- `/src/components/ui/` — Navbar, ChallengeCard, etc.
- `/src/lib/supabase/client.ts` — createBrowserClient
- `/src/lib/supabase/server.ts` — createServerClient (cookies next/headers)
- `/src/lib/auth.ts` — requireAuth (Bearer) + checkRateLimit (mémoire, à migrer)
- `/public/lava-*.png` — images Floor is Lava (lava-0 à lava-5 + lava-win)

## Auth pattern dans les routes API (groupes)
```ts
// Bearer token prioritaire, fallback cookies SSR
const token = req.headers.get('authorization')?.slice(7)
const { data: { user } } = await supabaseAdmin.auth.getUser(token)
// OU
const supabase = createServerClient(url, key, {
  cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} }
})
```

## Tables Supabase
- `profiles` — calorie_target, goal, subscription_status, referral_code, referred_by
- `journal_entries` — logs nutrition (date, cal, prot, carb, fat)
- `sessions` — séances sport (session_date, duration_min)
- `friend_groups` + `group_members` — feature Amis & Challenges (SQL : supabase-groups.sql)
- `user_badges`, `challenge_completions`, `smoking_log`

## Fait le 29/07 soir (2) — Config Google OAuth ✅ / Apple bloqué (compte dev coupé)
- **Google configuré via Chrome (avec IDEA)** : projet Google Cloud « MYTA » (id `myta-503919`), Auth Platform « My Twin App » (externe), client OAuth Web « MYTA Supabase », redirect `https://sglkpbmqdjuqahykswqh.supabase.co/auth/v1/callback`. Supabase → provider Google ACTIVÉ, client ID `784736275539-svu8q9ta159nkh8h2h7gucv6lh0j3k36.apps.googleusercontent.com`, secret collé par IDEA. App publiée en production par IDEA. Redirect URLs Supabase : déjà couvertes par le wildcard `https://mytwinapp.fr/**`. ⏳ Tester « Continuer avec Google » sur mytwinapp.fr.
- **🚨 DÉCOUVERTE : l'accès Apple Developer est COUPÉ depuis la migration Organization** (constaté le 29/07 en voulant configurer Sign in with Apple) : developer.apple.com propose « Rejoindre le programme », CIP renvoie « Unable to find a team with the given Team ID 'JSQ2M759W8' », ASC dit « compte non activé ». Silence Apple depuis l'accusé du 24/07 (dossier 20000118458293). Relance envoyée par mail à devprograms@apple.com (brouillon Gmail préparé le 29/07, envoyé par IDEA). IDEA ne veut pas appeler. L'app MYTA reste en ligne sur l'App Store.
- **Bouton Apple masqué temporairement** : `APPLE_SIGNIN_READY = false` dans auth/page.tsx (évite l'erreur « provider is not enabled »). Dans l'app iOS il n'y a donc AUCUN bouton social (Google interdit en WebView) → retour au formulaire email après achat, sous-titre adapté. **Quand Apple débloque** : 1) créer Services ID (`fr.mytwinapp.app.web`, domaine mytwinapp.fr, return URL callback Supabase) + clé .p8 Sign in with Apple ; 2) configurer provider Apple dans Supabase (Services ID + secret JWT) ; 3) repasser `APPLE_SIGNIN_READY = true`.

## Fait le 29/07 soir — Compte lié Apple/Google après achat (1 tap, OAuth Supabase web)
- **Demande IDEA** : après le paiement IAP anonyme, ne plus tomber sur le formulaire d'inscription — compte lié au compte Apple (iOS) / Google (Android), entrée directe dans l'app avec le forfait. Précision donnée : un compte 100% silencieux est impossible (Apple ne révèle jamais l'identité de l'acheteur) → flux retenu = 1 tap « Continuer avec Apple ». **Choix IDEA : OAuth web Supabase** (pas de plugin natif → AUCUN rebuild iOS ni resoumission).
- **auth/page.tsx** : boutons « Continuer avec Apple » (partout) et « Continuer avec Google » (masqué dans l'app iOS — OAuth Google bloqué en WebView) via `supabase.auth.signInWithOAuth` avec `redirectTo=/auth/confirm(?purchased=1)` + séparateur « ou par email ». Mode `purchased=1` : titre « Abonnement activé 🎉 », sous-titre « lie ton compte en 1 tap », boutons « continuer sans compte »/démo masqués.
- **auth/confirm/page.tsx** : à la session (retour OAuth par hash ou lien email) → `syncPurchases` (linkRevenueCatUser + POST /api/revenuecat/claim, iOS only) puis si `?purchased=1` → **redirect direct** onboarding (nouveau compte) ou dashboard, sans écran intermédiaire ; sinon écran de bienvenue habituel. Garde anti-double-exécution (useRef), name aussi lu depuis user_metadata.name (Google).
- **⏳ CONFIG À FAIRE (IDEA, sans ça les boutons renverront une erreur)** :
    1. **Supabase → Auth → URL Configuration** : ajouter `https://mytwinapp.fr/auth/confirm` aux Redirect URLs.
    2. **Apple Developer → Identifiers** : créer un **Services ID** (ex `fr.mytwinapp.app.web`), activer Sign in with Apple, domaine `mytwinapp.fr`, return URL `https://<project-ref>.supabase.co/auth/v1/callback` ; **Keys** : créer une clé « Sign in with Apple » (.p8). **Supabase → Auth → Providers → Apple** : renseigner Services ID + secret (généré depuis Team ID + Key ID + .p8).
    3. **Google Cloud Console** : OAuth Client ID (Web), redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` → **Supabase → Providers → Google** (client ID + secret).
- **Conformité** : 4.8 OK (Sign in with Apple offert dans l'app ; Google absent de l'app iOS). NB WebView : cookies Safari non partagés → 1re connexion Apple demande l'identifiant + code, ensuite fluide.
- ✅ typecheck. 100% web → `git push` suffit.

## Fait le 29/07 — Dark mode paywall + wallets Stripe + point migration Apple
- **Fix dark mode paywall iOS (screenshot IDEA : carte Essentiel illisible)** : la carte Essentiel utilisait un style inline `background:'#fff'` → non écrasé par `.dark .bg-white`, alors que `text-zinc-900` devenait clair → texte clair sur carte blanche. `pricing/page.tsx` : carte passée en classes `bg-white border-zinc-200` (les overrides dark s'appliquent), gradient Premium inchangé.
- **globals.css — compléments dark** : `.dark .text-\[\#4B47A0\]` → #a8a4ee (liens « Restaurer mes achats », « Se connecter » illisibles sur fond sombre, 21 occurrences dans src) ; `.dark .bg-white\/60→\/95` → rgba(37,35,64,x) (nav landing, footer sticky démo, veils) — les /15-/30 (effet verre sur dégradés) restent intacts.
- **auth/page.tsx** : 3 badges Nutrition/Sport/Sommeil en styles inline pastel → classes Tailwind (bg-green-50/indigo-50/teal-50 + text/border) pour hériter des overrides dark. **demo/page.tsx** : fond inline #f8f8fc → `bg-[#f8f8fc] dark:bg-[#1a1825]`.
- **Apple Pay / Google Pay** : sur iOS, RIEN à ajouter — l'achat IAP passe par la feuille de paiement Apple qui propose déjà Apple Pay/les moyens du compte Apple (et Apple interdit un bouton Apple Pay séparé pour du contenu digital, 3.1.1). Web/Stripe : `payment_method_types: ['card']` RETIRÉ du checkout → Stripe applique les moyens activés dans le Dashboard, les wallets Apple Pay (Safari) / Google Pay (Chrome/Android) s'affichent automatiquement sur le Checkout hébergé. ⏳ IDEA : vérifier Dashboard Stripe → Réglages → Moyens de paiement que Apple Pay + Google Pay sont bien activés. Play Store : app pas encore publiée — l'Android (TWA) paiera via le site = Google Pay via Stripe ; attention future : des abos digitaux dans une TWA Play Store peuvent exiger Google Play Billing.
- **Migration Individual → Organization (nom vendeur IDEAFORMA)** : AUCUNE réponse d'Apple depuis l'accusé de réception du 24/07 (dossier 20000118458293) alors que l'annonce était « 1 jour ouvré ». ⏳ IDEA : relancer Apple Developer Support (répondre au mail du dossier ou demander un rappel via https://developer.apple.com/contact/). Le nom vendeur ne changera qu'à la fin de la migration — rien à faire côté code/ASC.
- ✅ `npx tsc --noEmit` : 0 erreur. ⏳ IDEA : `git push` (Vercel auto-deploy, aucun rebuild iOS).

## Fait le 24/07 soir (4) — Fix viewport mobile (écran fixe)
- **Cause** : aucune balise viewport dans layout.tsx → le WebView iOS rendait le site en largeur desktop (~980 px) : page zoomable/déplaçable « comme une page web ».
- **Fix layout.tsx** : `export const viewport: Viewport` (Next 14) = width device-width, initialScale 1, maximumScale 1, userScalable false, viewportFit cover, themeColor #4B47A0 (meta theme-color manuel retiré).
- **Fix globals.css** : html/body overflow-x hidden + max-width 100% (plus de scroll horizontal), overscroll-behavior-y none (plus d'effet élastique), -webkit-text-size-adjust 100%, touch-action pan-y (pas de zoom double-tap ; canvas = touch-action none pour les mini-jeux), safe-area-inset gauche/droite (encoches).

## Fait le 24/07 soir (3) — Mini-jeux refaits en VRAIS jeux (canvas)
- Retour IDEA : jeux trop basiques → **Floor is Lava réécrit en vrai platformer Canvas** façon Mario (maquette fournie) : 5 niveaux dessinés à la main, plateformes briques au-dessus d'une lave animée (vagues + bulles 🔥), étoiles à ramasser (⭐=1 pt), plateformes mobiles horizontales (niv 3+) et ascenseurs verticaux (niv 4+), drapeau FINISH 🏁 + trophée, 3 vies (respawn début de niveau), bonus +5 pts/vie restante à la victoire. Contrôles : boutons tactiles ◀ ▶ SAUT + clavier (flèches/espace), buffer de saut 9 frames, caméra qui suit, Waty flippé selon la direction.
- **Le Grand Tri réécrit en jeu d'arcade Canvas** : les aliments tombent du ciel (rotation), on déplace Waty au doigt (pointermove, lissage) ou aux flèches ; attraper les sains = +10 (+15 bonus combo ×5), attraper la malbouffe = -1 ❤️ + flash rouge, 3 vies, vitesse et fréquence de spawn croissantes, popups de score.
- Moteurs : rAF + refs (zéro re-render dans la boucle), rendu Canvas 2D avec devicePixelRatio. Waty = waty-sport.png / waty-nutrition.png (fallback 🍉).
- games.ts : descriptions mises à jour (scoreUnit lava = ⭐). Runner inchangé.
- Fichiers : src/app/games/lava/page.tsx, src/app/games/tri/page.tsx, src/lib/games.ts.

## Fait le 24/07 soir (2) — Mini-jeux Waty 🎮
- **Section Mini-jeux Waty** débloquée par paliers de jours d'utilisation NON consécutifs : 7 j → 🌋 Floor is Lava (réflexe : taper la plateforme sûre avant l'éruption, accélération progressive), 14 j → 🥗 Le Grand Tri (sain/plaisir, 45 s, bonus série ×5, 50 aliments), 30 j → 🏃 Waty Runner (runner infini tactile, physique saut/gravité, rAF, score en mètres).
- **SQL : `supabase-minigames.sql`** (⏳ IDEA : à exécuter dans Supabase SQL Editor) — tables `activity_days` (PK user_id+day, RLS select/insert own) et `game_scores` (PK user_id+game_key, RLS) + **backfill** des jours depuis journal_entries et sessions → les utilisateurs existants ne repartent pas de zéro.
- **Tracking des jours** : `logActivityToday()` appelé depuis la Navbar (présente sur toutes les pages connectées), 1 upsert max/jour (guard localStorage `myta_activity_YYYY-MM-DD`).
- **`src/lib/games.ts`** : GAMES (défs + paliers), logActivityToday, saveBestScore (upsert si record battu), hook useGameUnlocks (daysUsed + unlocked() + bestScores).
- **Pages** : `/games` (hub avec progression et jeux verrouillés/déverrouillés), `/games/lava`, `/games/tri`, `/games/runner` (+ layout avec Navbar). Chaque jeu revérifie le palier (écran verrouillé sinon) et sauvegarde le meilleur score.
- **Navbar** : entrée « Mini-jeux Waty » (icône Gamepad2) après Amis & Challenges + appel logActivityToday.
- Routes protégées par le middleware (pas dans PUBLIC_PATHS) → réservé aux comptes avec accès actif. 100% web → git push suffit.
- Fichiers : supabase-minigames.sql, src/lib/games.ts, src/app/games/{layout,page}.tsx, src/app/games/{lava,tri,runner}/page.tsx, src/components/ui/Navbar.tsx.

## Fait le 24/07 soir (tuto d'introduction nouveaux utilisateurs)
- **Refonte complète de `/onboarding`** en vrai tuto post-inscription (7 étapes, toutes skippables) : bienvenue → prénom (pré-rempli depuis user_metadata) → sexe + année de naissance → poids/taille → objectif → activité → récap. Le récap calcule TDEE (Mifflin-St Jeor, même formule que /profile) + macros suggérées (même logique que computeMacros) et enregistre calorie_target/prot/carb/fat_target + toutes les infos dans profiles (upsert). « Passer l'introduction » (global) + « Passer cette étape » (par étape).
- **Fix flux post-inscription** : `auth/confirm` envoyait les nouveaux comptes (essai 3j → hasAccess=true) DIRECT au dashboard → le tuto n'était jamais vu. Désormais : onboarding_step ≠ 'done' → `/onboarding`.
- **Tour spotlight auto** : fin du tuto → `/dashboard?welcome=1` → TourGuide se lance automatiquement 1 fois (si `myta_guide_seen` absent). Skip = croix/clic fond (handleDoneTour pose le flag). Replay inchangé via /guide (?tour=1).
- **Chaînage parcours Waty** : si le profil est complet à la fin du tuto, `advanceOnboarding('profile')` → les cartes Waty reprennent à l'étape « journal » ; sinon l'étape « profile » reste active et Waty guide vers le profil.
- Aucune migration SQL nécessaire (colonnes sex/birth_date/weight_kg/height_cm/activity_factor/onboarding_step déjà en place — vérifier que `supabase-onboarding.sql` a bien été exécuté).
- Fichiers modifiés : `src/app/onboarding/page.tsx` (réécrit), `src/app/auth/confirm/page.tsx`, `src/app/dashboard/page.tsx`.
- ⏳ IDEA : `npm run build` puis `git push` (aucun rebuild iOS — l'app charge mytwinapp.fr).

## Fait le 24/07 après-midi — 🎉 APP APPROUVÉE PAR APPLE 🎉
- **MYTA 1.0 (5) est APPROUVÉE et sur l'App Store.** Les 2 abos .v2 (Essentiel + Premium) sont **« Approuvé »** dans ASC → paywall fonctionnel en production. La théorie était bonne : les abos WFR sont testés et approuvés avec le binaire.
- ⏳ **Localisation du groupe d'abonnements** : état « Finaliser avant soumission » — ASC exige qu'elle parte avec une NOUVELLE version de l'app (bouton « Ajouter pour vérification » sur la page du groupe, à faire à la prochaine soumission 1.1). Non bloquant : n'affecte que le nom affiché dans Réglages > Abonnements.
- **Migration compte Individual → Organization LANCÉE** (formulaire Apple soumis le 24/07, réponse annoncée sous 1 jour ouvré) : objectif = nom vendeur App Store « IDEAFORMA » au lieu du nom personnel. Données utilisées : IDEAFORMA, SASU, SIREN 993125335, RCS Nanterre 2025B12114, TVA FR65993125335, 144 av. Charles de Gaulle 92200 Neuilly-sur-Seine, D-U-N-S 28-548-2062, site https://mytwinapp.fr, Myriam = fondatrice/présidente/associée unique, pas de DBA, société sans compte développeur existant, Tax ID membership individuel = None. L'app reste en ligne pendant la migration.
- ⏳ **À suivre (migration)** : (1) répondre au mail d'Apple Developer Support (vérif documents société, possible appel) ; (2) après migration, vérifier dans ASC > Accords/Banking que les infos bancaires/fiscales passent au nom d'IDEAFORMA ; (3) vérifier que le nom vendeur sur la fiche App Store devient IDEAFORMA.

## Fait le 24/07 (reprise après pause — état des lieux + déblocage)
- **Constat critique** : les fixes du 15/07 (5.1.1(v) + 2.1(b)) n'avaient JAMAIS été commités/poussés — ils dormaient en local sur le Mac. → Commités le 24/07 (`110b34a`). ⏳ `git push` à faire par IDEA (Claude n'a pas le réseau via le pont device). Sans ce push, les fixes ne sont PAS en prod → resoumettre = rejet assuré.
- **Mails Apple relus (Gmail)** :
    - Rejet 15/07 : confirme 5.1.1(v) + 2.1(b). **« Number of items submitted: 1 »** → les 2 abos .v2 n'étaient PAS dans la soumission du 14/07 (même soumission aea10f2c réactivée — impossible d'y ajouter des éléments). Ils ne sont donc toujours pas passés en review.
    - Le mail de rejet précise noir sur blanc : « The in-app purchases/subscriptions do not need to have been previously approved to confirm they function correctly in review » → l'échec d'achat en review = bug code (corrigé), pas l'état des abos.
    - Réponse support 16/07 (case 102935558738, abos WFR v1) : « you must submit a binary for the review to continue » — rien à attendre de plus du support, la voie est la resoumission.
- **Plan prochaine soumission** : créer une NOUVELLE soumission (pas réactiver aea10f2c) avec build 1.0 (5) + les 2 abos .v2 rattachés (mail Apple doit dire « items submitted: 3 »), après : push Vercel + env RC vérifiées + statut regulated medical device ASC + note reviewer (achat sans compte dès l'ouverture) + test sandbox.
- ✅ **SOUMISSION RENVOYÉE le 24/07 (~11h, via navigateur ASC par Claude)** — actions faites : (1) ancienne soumission aea10f2c supprimée (retrait de la version) ; (2) **note reviewer RÉÉCRITE** — elle contenait encore la note du pivot Netflix (« This app has NO in-app purchases ») en contradiction totale avec le paywall IAP → probable facteur aggravant des rejets 14-15/07 ; nouvelle note EN : 2 abos .v2 inclus, achat sans compte dès l'ouverture (5.1.1(v)), fixes 2.1(b)+5.1.1(v) actifs dans le même build (app charge mytwinapp.fr) ; (3) nouveau brouillon créé + version 1.0 (5) ajoutée + **ENVOYÉ** (« 1 élément envoyé », app « En attente de vérification »).
- ℹ️ **Découvertes ASC 24/07** : les 2 abos .v2 sont « En attente de vérification » mais IMPOSSIBLES à ajouter manuellement à une soumission (boutons grisés) — ils sont testés par le reviewer avec le binaire (prouvé le 15/07 : le reviewer a vu les produits et tenté l'achat). Le GROUPE MYTA (localisation) est « Refusé » et ne peut être soumis qu'avec un abo joint → retiré du brouillon pour débloquer l'envoi ; à re-soumettre quand les abos seront approuvés (bouton « Ajouter pour vérification » du groupe). Statut « dispositif médical réglementé » : déjà déclaré « n'est pas un dispositif médical » ✅. Compte démo dans ASC = myriam@gmail.com / ouiouioui — IDEA confirme qu'il fonctionne et n'a pas d'abo actif.
- ⏳ **À la réponse Apple** : si rejet 2.1(b) encore → tester achat sandbox TestFlight AVANT de resoumettre + taper le message d'erreur sur le paywall pour lire le diag ; si approbation → vérifier que les 2 abos .v2 passent « Approuvé », sinon relancer le support (case 102935558738) ; puis re-soumettre la localisation du groupe MYTA.

- 🔧 Effet de bord pont device : fichiers `.git/*.lock` non supprimables via Claude → déplacés dans `_to_delete/` à la racine du repo. **IDEA : `rm -rf _to_delete` (ne pas commiter ce dossier).**

## Fait le 15/07 (rejet v1.0 (5) — 5.1.1(v) + 2.1(b), corrigés par Claude)
- **Rejet 15/07 (iPad Air M3, iPadOS 26.5.2)** : (1) **5.1.1(v)** compte exigé avant achat IAP ; (2) **2.1(b)** « an error message appeared after trying to purchase IAP/subscriptions ».
- **Cause 5.1.1(v) trouvée** : l'app iOS charge `mytwinapp.fr/` = la LANDING WEB marketing — tous les CTA (« Essai gratuit », « Démarrer ») mènent à `/auth?mode=signup`, et l'écran /auth n'offrait AUCUN chemin vers le paywall sans compte. Le paywall anonyme (fait le 07/07) existait mais était indécouvrable. Bonus : la landing affichait prix Stripe + mentions CB dans l'app iOS (risque 3.1.1).
- **Cause 2.1(b) (la plus probable, code)** : `purchaseRcPackage` retournait `ok:false` si l'entitlement n'était pas actif dans le customerInfo renvoyé par `purchasePackage` (latence validation reçu RC, fréquente en sandbox) → message d'erreur affiché APRÈS un achat réussi.
- ✅ **Fix 5.1.1(v)** : `page.tsx` (racine) → si `isIosApp()` : jamais la landing (écran logo neutre) ; sans session → redirect `/pricing` (paywall anonyme) ; avec session → dashboard/pricing selon accès. `auth/page.tsx` → bouton « Continuer sans compte — voir les abonnements » (iOS).
- ✅ **Fix 2.1(b)** : `revenuecat.ts` → si `purchasePackage` résout sans throw = achat StoreKit abouti → TOUJOURS `ok:true` ; `planId` fallback via product id du package si entitlement pas encore actif ; diag enrichi sur erreur (code+message, visible en tapant le message d'erreur sur le paywall). Timeout ajouté sur le getOfferings de l'achat (pas sur purchasePackage : feuille Apple peut rester ouverte longtemps).
- ✅ Typecheck 0 erreur. Aucun rebuild iOS nécessaire (l'app charge mytwinapp.fr) → `git push` suffit, puis resoumettre le MÊME build 1.0 (5).
- ⏳ **AVANT resoumission (IDEA)** : (1) vérifier env Vercel `NEXT_PUBLIC_REVENUECAT_IOS_KEY` + `REVENUECAT_WEBHOOK_AUTH` (jamais confirmé fait le 14/07 — si la clé manque, le paywall est vide) ; (2) **localisation du GROUPE d'abonnements MYTA en état « Refusé » dans ASC** — à corriger/resoumettre, cause possible d'échec d'achat sandbox ; (3) header webhook RC ; (4) statut « regulated medical device » ASC ; (5) tester achat sandbox TestFlight ; (6) note reviewer : achat possible sans compte dès l'ouverture (app → paywall direct).

## Fait le 14/07 (RE-PIVOT — Apple refuse le modèle web-only, retour à l'IAP)
- **Rejet 14/07 (Submission aea10f2c, iPad Air M3) — Guideline 3.1.1** : l'app donne accès à du contenu payant (abos) acheté hors app SANS possibilité de l'acheter en In-App Purchase → interdit. Le modèle « Netflix web-only » du 09/07 est REFUSÉ.
- **Cause de fond (vérifiée règles Apple à jour, sources web)** : MYTA n'est PAS une « reader app » (3.1.3(a) = presse/livres/audio/musique/vidéo uniquement ; fitness/santé/coaching **explicitement exclus**). Donc le modèle Netflix ne s'applique pas. Reste 3.1.3(b) multiplateforme : on PEUT honorer les abos achetés sur le web MAIS le même abo doit AUSSI être proposé en IAP dans l'app. Pas d'échappatoire web-only.
- **Décision IDEA (14/07)** : **retour IAP + web** (option 1). Réintégrer StoreKit via **RevenueCat** (app = shell Capacitor → RC gère reçus/entitlements/webhook ; StoreKit direct = trop de natif). On GARDE les acquis du pivot : essai 3j sans CB, access.ts, trial-migration.
- ✅ **Backend RC restauré depuis git 1a8de6f** : `src/lib/revenuecat.ts`, `src/app/api/revenuecat/claim/route.ts`, `src/app/api/webhook/revenuecat/route.ts` (imports OK : app-platform, stripe-plans). Compatibles access.ts actuel (webhook/claim écrivent subscription_status='active'/'trialing' + plan).
- ✅ **UI re-branchée (fait 14/07 par Claude)** : `pricing/page.tsx` (paywall IAP iOS RevenueCat + restore + mentions 3.1.2 + achat sans compte 5.1.1(v) ; web = Stripe inchangé ; check d'accès = `hasActiveAccess` avec trial_ends_at), `account/page.tsx` (gestion abo iOS + Apple manage subs + restore), `auth/page.tsx` (`syncIosPurchases`/linkRevenueCatUser + claim au login ; garde `hasActiveAccess`). Tous restaurés depuis `1a8de6f` + fusionnés avec les acquis du pivot. Typecheck : 0 erreur hors `revenuecat.ts` (les 13 erreurs restantes = module `@revenuecat/purchases-capacitor` pas encore installé, disparaissent après `npm i`).
- ⏳ RESTE À FAIRE — sur le Mac : (1) `npm i @revenuecat/purchases-capacitor` (registre bloqué côté Claude) ; (2) `npx cap sync` ; (3) `npm run build` (doit passer, 0 erreur) ; (4) Env Vercel à REMETTRE : `NEXT_PUBLIC_REVENUECAT_IOS_KEY`, `REVENUECAT_WEBHOOK_AUTH` ; (5) archive Xcode + upload ; (6) config webhook RevenueCat → `/api/webhook/revenuecat` avec le header `REVENUECAT_WEBHOOK_AUTH`.
- 🚨 **CAUSE RACINE DÉFINITIVE trouvée le 14/07 (via navigateur, ASC)** : le groupe d'abonnements « MYTA » (ID 22159439, app 6780540005) est **VIDE — 0 abonnement**. Les 2 abos (Essentiel/Premium) ont été **SUPPRIMÉS d'ASC** (probablement pendant le pivot Netflix 09/07 — la todo disait « retirer les 2 abonnements de la fiche ASC »). Donc StoreKit n'a AUCUN produit à vendre → paywall vide → rejets. RevenueCat pointe vers des IDs qui n'existent plus côté Apple. **Ni le code ni RC n'étaient en cause.**
- ✅ **Test réutilisation IDs (14/07)** : Apple REFUSE les anciens IDs (`...premium.monthly` → « identifiant déjà utilisé par un autre abonnement »). Les IDs supprimés sont verrouillés à vie. → obligation de nouveaux IDs.
- ✅ **2 abos RECRÉÉS dans ASC (14/07, via navigateur)** dans le groupe MYTA (22159439), durée 1 mois, état « Métadonnées manquantes » :
    - Premium : `fr.mytwinapp.app.premium.monthly.v2` (ID Apple 6790862154), niveau 1
    - Essentiel : `fr.mytwinapp.app.essentiel.monthly.v2` (ID Apple 6790862423)
- ✅ **Code MàJ** : `RC_PRODUCT_IDS` dans `src/lib/revenuecat.ts` pointe sur les IDs `.v2` (RC_PRODUCT_TO_PLAN suit auto → webhook OK).
- ✅ **ASC configuré (14/07, via navigateur)** pour les 2 abos : disponibilité = **TOUS pays (175)** ✅ ; prix Essentiel 2,99€ / Premium 4,99€ (auto-calc 175 pays) ✅ ; localisation FR (nom + description) ✅. État abos = « Métadonnées manquantes / Finaliser avant soumission » (normal tant que pas soumis avec le build).
- ⏳ **RESTE ASC** : (1) **capture d'écran de review** par abo (section « Informations destinées à l'équipe de vérification » → tu as `iap-review-screenshot.png` dans le repo à réutiliser) ; (2) la localisation du GROUPE d'abonnements MYTA était « Refusé » (ancien état) — sera re-vérifiée à la resoumission ; (3) rattacher les 2 abos à « Achats intégrés et abonnements » de la version + soumettre AVEC le build (« Number of items submitted » > 1).
- ✅ **RevenueCat MàJ (14/07, via navigateur)** : 2 nouveaux produits créés `fr.mytwinapp.app.premium.monthly.v2` (→ entitlement premium) et `fr.mytwinapp.app.essentiel.monthly.v2` (→ entitlement essentiel) ; offering `default` édité → ses 2 packages pointent désormais sur les produits `.v2`. Les anciens produits RC (`...monthly`) restent présents mais ne sont plus dans l'offering (inoffensif ; peut être désactivé plus tard). Le code mappe via `pkg.product.identifier` → RC_PRODUCT_TO_PLAN (.v2), donc cohérent.
- ✅ **État cohérent ASC ↔ RevenueCat ↔ code** sur les IDs `.v2`.
- ✅ **FAIT (IDEA, 14/07)** : (a) `npm i @revenuecat/purchases-capacitor@13.2.2` + `npx cap sync` (plugin bien inclus iOS) + `npm run build` OK + push `1cfe762` sur `main` (Vercel redéployé) ; (b) captures de review ajoutées aux 2 abos ; (c) 2 abos `.v2` rattachés à la version + build ; (d) archive Xcode + upload OK.
- ✅ **SOUMISSION ENVOYÉE le 14/07** (IAP + web, conformité 3.1.3(b)) — app « En attente de vérification ». **On attend la réponse Apple.**
- ⚠️ **À vérifier si nouveau rejet** : (1) le mail Apple montrait-il « Number of items submitted » > 1 (sinon abos toujours pas rattachés) ; (2) env Vercel `NEXT_PUBLIC_REVENUECAT_IOS_KEY` + `REVENUECAT_WEBHOOK_AUTH` présentes ; (3) header webhook RC = `REVENUECAT_WEBHOOK_AUTH` ; (4) statut « regulated medical device » déclaré dans ASC (obligatoire Santé/Fitness depuis 26/03/2026).
- ⚠️ **NOUVEAU point conformité** : depuis le **26/03/2026**, toute app catégorisée Santé/Fitness/Médical doit déclarer un statut « regulated medical device » dans ASC. À renseigner avant resoumission sinon motif de rejet supplémentaire.
- ⚠️ Alternative écartée (mais à garder en tête si nouvelle boucle) : abandonner l'App Store iOS et pousser la PWA (mytwinapp.fr + Stripe, zéro Apple).
- ✅ **Audit config RevenueCat (14/07, via navigateur — projet 6153b3c5 « MY TWIN APP »)** : tout est bon. Produits `fr.mytwinapp.app.essentiel.monthly` + `.premium.monthly` OK ; entitlements `essentiel`/`premium` OK ; offering `default` = 2 packages (les 2 produits) OK ; **clé In-App Purchase P8 `XF8GZ28N28.p8` = Valid** (critique pour StoreKit 2 / purchases-capacitor v13, sans elle les achats ne s'enregistrent pas) ; clé ASC API `85XMD4NA6A.p8` = Valid ; Bundle ID `fr.mytwinapp.app` OK ; webhook « MYTA Supabase » Active → `https://mytwinapp.fr/api/webhook/revenuecat`, Prod+Sandbox. **Conclusion : la config RC n'a JAMAIS été la cause des rejets** (c'était ASC : abos WFR orphelins).
- 🔧 **Correction install** : l'app tournait sous **purchases-capacitor 13.1.7** (vu dans RC → SDK distribution 100%). Installer `@revenuecat/purchases-capacitor@^13` (PAS ^10). Vérifier compat Capacitor 8.
- ⚠️ **2 points RC à confirmer avant resoumission** : (1) le **header d'autorisation du webhook** doit être réellement renseigné dans RC ET égal à `REVENUECAT_WEBHOOK_AUTH` sur Vercel — sinon le code renvoie 401 et Supabase n'est jamais mis à jour (le champ apparaissait vide dans l'éditeur, à revérifier via « Edit ») ; (2) **Apple Server Notifications = « No notifications received »** → configurer l'URL de notif S2S dans ASC vers RC (recommandé, fiabilise renouvellements/remboursements).

## Fait le 09/07 (PIVOT MAJEUR — abandon IAP/RevenueCat → modèle « Netflix » externe) [ANNULÉ le 14/07, voir ci-dessus]
- **Décision IDEA** : marre des rejets IAP. On abandonne RevenueCat/achats in-app. Nouveau modèle : paiement 100% sur le site (Stripe), l'app iOS ne sert qu'à se connecter. + essai gratuit 3 jours SANS CB.
- **Conformité (vérifiée règles Apple à jour)** : storefront FR/EU → règle 3.1.3(b). L'app iOS ne doit contenir AUCUNE UI d'achat, AUCUN prix, AUCUN lien vers le site, AUCUN « steering ». Piège : interdiction (hors USA) d'envoyer un email de relance vers un paiement externe à un contact créé dans l'app → on n'envoie PAS d'email de relance (route email-pricing-link laissée dormante, non appelée). Choix retenu : **hybride sécurisé** (inscription autorisée dans l'app + essai 3j auto + état neutre à l'expiration, jamais de renvoi).
- ✅ **RevenueCat entièrement supprimé** : src/lib/revenuecat.ts, src/app/api/revenuecat/*, src/app/api/webhook/revenuecat/* supprimés ; refs retirées de pricing, auth, account (0 ref restante).
- ✅ **Essai 3j sans CB** : migration `supabase-trial-migration.sql` — colonne `profiles.trial_ends_at` (SANS default pour ne pas backfill les existants) + trigger BEFORE INSERT `set_free_trial_on_new_profile` qui force `subscription_status='trialing'` + `trial_ends_at=now()+3j` sur tout nouveau compte. Expiration calculée à la volée → **AUCUN cron nécessaire**.
- ✅ **Source de vérité unique** `src/lib/access.ts` : `hasActiveAccess(status, trialEndsAt)` (active/vip = OK ; trialing = OK si trial_ends_at NULL [géré Stripe] ou futur ; sinon refus) + `isFreeTrial()` + `trialDaysLeft()`. Utilisé dans middleware, ai-guard, pricing, auth, page racine, auth/confirm.
- ✅ **ai-guard** : essai 3j = accès Premium complet (IA illimitée) ; essai expiré → SUBSCRIPTION_REQUIRED.
- ✅ **pricing/page.tsx (iOS)** = écran NEUTRE : logo + soit « Se connecter », soit « Aucun abonnement actif » + bouton « Actualiser » (recheck après paiement web) + « Se déconnecter ». Zéro prix/lien/steering. Web = checkout Stripe inchangé.
- ✅ **account/page.tsx (iOS)** : retrait total des CTA « Voir les offres », « changer de forfait », lien gestion Apple, « Restaurer mes achats ». Affiche seulement le statut.
- ✅ Typecheck OK (`npx tsc --noEmit` exit 0), 0 référence RevenueCat dans src/.
- ⏳ RESTE À FAIRE (IDEA, sur Mac) : (1) exécuter `supabase-trial-migration.sql` dans Supabase SQL Editor ; (2) `npm run build` local pour confirmer ; (3) `npm uninstall @revenuecat/purchases-capacitor` + `npx cap sync` ; (4) retirer les 2 abonnements de la fiche ASC (plus d'IAP) OU les laisser inactifs ; (5) MàJ note reviewer (EN) : « No in-app purchases. Subscriptions are handled on our website like Netflix/Spotify; the app is used to sign in only. » ; (6) resoumettre. Env à RETIRER (Vercel) : NEXT_PUBLIC_REVENUECAT_IOS_KEY, REVENUECAT_WEBHOOK_AUTH.
- ⚠️ Marketing : comme l'app ne fait plus de renvoi, c'est le site/marketing qui amène les gens souscrire sur mytwinapp.fr (compliant).

## Fait dans la dernière session (déploiement iOS App Store)
- ✅ Info.plist iOS : ajout NSMicrophone/NSCamera/NSPhotoLibrary(+Add)UsageDescription, ITSAppUsesNonExemptEncryption=false, region fr, armv7→arm64
- ✅ Conformité review auditée : suppression compte ✅, pas de social login (Sign in Apple non requis) ✅
- ✅ Décision 3.1.1 : remplacement du flux email (steering, rejet probable) par achats in-app RevenueCat
- ✅ IAP RevenueCat solo (Essentiel/Premium) : src/lib/revenuecat.ts, écran achat iOS dans pricing/page.tsx (restore + mentions légales 3.1.2), webhook /api/webhook/revenuecat → profiles, gestion abo iOS dans account/page.tsx (App Store + restore)
- ⏳ RESTE À FAIRE sur Mac : `npm install @revenuecat/purchases-capacitor`, npx cap sync, setup ASC+RevenueCat, archive/upload, soumission → voir IOS-IAP-DEPLOY.md
- Product IDs IAP (codés en dur): fr.mytwinapp.app.essentiel.monthly / fr.mytwinapp.app.premium.monthly ; entitlements RC: essentiel/premium
- Env à ajouter (Vercel): NEXT_PUBLIC_REVENUECAT_IOS_KEY, REVENUECAT_WEBHOOK_AUTH

## Fait le 07/07 soir (4e rejet — 2 motifs : 2.1(a) + NOUVEAU 5.1.1(v))
- Rejet ~21h13 (review en ~4h, iPhone 17 Pro Max + iPad Air M4) : 2.1(a) « purchases failed to load » (toujours les abos WFR) + **5.1.1(v)** : l'app exigeait la création de compte AVANT l'achat IAP → interdit, l'inscription doit être optionnelle
- ✅ Fix 5.1.1(v) codé + déployé (commit 1a8de6f) : paywall iOS accessible et achat possible SANS compte (RC anonyme via initRevenueCat() sans userId), compte proposé APRÈS achat (/auth?purchased=1, optionnel) ; à la connexion linkRevenueCatUser() (Purchases.logIn → transfert achats anonymes) + POST /api/revenuecat/claim (nouvelle route : vérif entitlements via GET api.revenuecat.com/v1/subscribers avec la clé publique, update profiles côté serveur)
- ✅ Note « Remarques » mise à jour (5.1.1 corrigé + case support) → **resoumission ENVOYÉE le 07/07 soir** (même soumission aea10f2c réactivée, « En attente de vérification »)
- ✅ Demande support Apple envoyée par mail — **Case ID 102935558738** (déblocage des 2 abos WFR orphelins)
- Piste si nouveau rejet 2.1(a) : attendre la réponse du support (la seule voie fiable pour rattacher les abos), puis resoumettre

## Fait le 07/07 (3e rejet 2.1(a) — cause racine identifiée : abos jamais inclus dans les soumissions)
- Rejet du 06/07 identique (iPad Air M3, « error message on the subscription page », build 1.0 (4))
- **CAUSE RACINE** : les emails Apple montrent « Number of items submitted: 1 » sur TOUTES les soumissions (vérifié dans ASC : les 2 soumissions supprimées = 1 élément chacune). Les 2 abos sont coincés en « Waiting for Review » ORPHELINS (liés à aucune soumission depuis la suppression de la 1re) → non fetchables par le reviewer → paywall vide → boucle de rejets. Le code n'a jamais été en cause.
- Blocage ASC : abos en WFR → section « Achats intégrés et abonnements » absente de la page version, bouton « Soumettre pour vérification » des abos grisé, brouillon de soumission n'accepte pas d'ajout. Modifier la localisation ne réinitialise PAS l'état. Bug ASC connu (cf. forums Apple/RevenueCat).
- Vérifié : accord « Applications payantes » Actif (tous pays, 15/06/26–10/06/27) ✅ ; fiche abo complète (capture + notes) ✅
- ✅ Actions du 07/07 : soumission rejetée supprimée (retrait de la version) → nouveau brouillon → note reviewer ajoutée en tête des « Remarques » (EN : abos coincés en WFR, impossible de les rattacher, merci de les approuver AVEC la version) → **soumission ENVOYÉE le 07/07 ~15h10** (version 1.0, build 1.0 (4), app « En attente de vérification »)
- Modif mineure : description Essentiel « Journal, sport et sommeil — IA limitée » (tentative de reset d'état)
- ⏳ EN PARALLÈLE (recommandé, voie la plus fiable selon la communauté) : contacter Apple Developer Support (https://developer.apple.com/contact/ → demander un rappel téléphonique) pour faire débloquer les 2 abos coincés en « Waiting for Review » (ID Apple Essentiel : 6780541713)

## Fait le 04/07 (déblocage abonnements « Waiting for Review »)
- Constat : soumission ASC bien « Supprimé » (annulée session précédente) mais les 2 abos restent « En attente de vérification » → confirmé via doc/communauté RevenueCat : les produits Apple en « Waiting for Review » ne sont PAS fetchables (ni sandbox/TestFlight, ni API RC qui les filtre côté serveur → packages: []). Limitation Apple, pas un bug : impossible de tester le paywall TestFlight avant approbation des abos. Test API RC (offerings, en-têtes SDK complets) → toujours packages: [].
- Conclusion : les 1ers abos restent WFR tant qu'une version n'est pas approuvée — la seule voie est de resoumettre (motifs du rejet corrigés : pays ✅, compte démo ✅).
- ✅ Soumission ENVOYÉE à Apple le 04/07 à 18:34 (version 1.0, build 1.0 (4)) — vérification sous ~48 h, app en « En attente de vérification »
- ✅ Compte démo gibbes.contact@gmail.com remis à subscription_status='free', plan=null dans Supabase (était vip/premium — 2e motif de rejet)

## Fait dans cette session (rejet App Review 03/07 — Guideline 2.1(a))
- Rejet Apple : erreur sur la page abonnement après création de compte (iPad Air 11" M3, iPadOS 26.5) + compte démo fourni avait déjà un abo actif
- ✅ revenuecat.ts : fallback sur offerings.all si offerings.current est null (config RC incomplète/sandbox)
- ✅ pricing/page.tsx : retry auto (1,5 s) si 0 produit au 1er chargement + diag debug masqué en prod
- ✅ CAUSE RACINE trouvée (via ASC) : disponibilité des IAP limitée (Essentiel 3 pays, Premium Europe 42) → pas de USA → reviewer US ne voyait aucun produit. Corrigé : tous les pays (175) activés pour les 2 abonnements + futurs pays auto
- ✅ Webhook Stripe désactivé par Stripe (9× HTTP 500 depuis 27/06) : current_period_end absent de l'objet subscription en API dahlia → fix subPeriodEnd() via items + try/catch global anti-500. À faire : réactiver l'endpoint dans le dashboard Stripe + rejouer les événements manqués
- ⏳ À faire avant resoumission : retester TestFlight (compte neuf → offres visibles), compte démo SANS abonnement actif, resoumettre (pas de rebuild nécessaire, l'app charge mytwinapp.fr)

## Fait dans la session précédente (Play Store deep links)
- ✅ Deep links Play Console validés : assetlinks.json corrigé avec l'empreinte Play App Signing (D5:66:22:9F...) en plus de la clé d'upload (67:28:6C...) + relation get_login_creds. Le SHA-256 manquant était celui de Play App Signing (clé avec laquelle Google re-signe l'app livrée). Domaine mytwinapp.fr → validé.

## Fait avant
- ✅ Menu disparu sur /friends (Navbar manquante dans friends/layout.tsx)
- ✅ Création de groupe (auth route via Bearer + cookies req.cookies)
- ✅ Fix build TypeScript ChallengeCard (throwOnError supprimé)
- ✅ Feature Floor is Lava dans GroupCard (7 images, score basé sur joined_at)
- ✅ Score challenge : start à 0 au join, objectifs journaliers (% jours loggés + sport proraté)
- ✅ Audit sécurité + 15 failles corrigées (middleware fail-open, XSS support, anti-auto-parrainage, audio size/MIME, prompt injection, security headers HTTP, crypto invite codes)
- ✅ Manifest PWA amélioré (icônes séparées any/maskable, start_url /dashboard, lang/categories)
- ✅ .well-known/assetlinks.json créé (template TWA Play Store, SHA-256 à remplir après Bubblewrap)

## À faire — prochaines sessions
- [ ] **Play Store** : compte Google Play ($25) → Bubblewrap init/build → AAB → soumission Play Console
- [ ] **Vidéo promo** : améliorer vidéo amateur avec FFmpeg (color grading, titres, logo, musique libre de droits)
- [ ] **Feature graphic** Play Store 1024×500 PNG
- [ ] **Rate limiting** persistant : migrer de Map mémoire vers Upstash Redis (Vercel serverless)
- [ ] **Cron notifications** : fix GET→POST (actuellement les crons Vercel reçoivent 405)
- [ ] **Autres améliorations app** à définir avec IDEA

## Notes importantes
- `supabaseAdmin` (service role) bypasse RLS → toujours filtrer par userId dans les queries
- Les images lava-*.png sont dans /public/ et doivent être committées dans git pour prod
- next-pwa génère sw.js + workbox au build automatiquement
- Le rate limiting en Map JS est inefficace en serverless (chaque instance repart à 0)
