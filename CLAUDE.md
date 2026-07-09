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

## Fait le 09/07 (PIVOT MAJEUR — abandon IAP/RevenueCat → modèle « Netflix » externe)
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
