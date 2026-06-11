# MYTA — Audit pré-déploiement App Store / Play Store
*11 juin 2026 — audit code + config + politiques stores*

## Verdict global

L'app web est saine : auth cohérente, pas d'IDOR détecté, webhook Stripe signé, quotas IA solides, build TypeScript propre. **Mais 3 points bloquent la publication sur les stores**, et ils ne sont pas techniques — ce sont des exigences de politique Apple/Google.

---

## 🔴 BLOQUANT — à régler avant soumission

### 1. Suppression de compte absente (Apple + Google la rendent obligatoire)
Aucune fonction "supprimer mon compte" dans l'app. Apple (guideline 5.1.1(v)) et Google Play exigent une suppression de compte **dans l'app** (+ un lien web déclaré dans le formulaire Data Safety de Play Console) pour toute app avec création de compte.
**Fix** : bouton dans /account → route API qui annule l'abo Stripe, purge les données (profiles, journal_entries, sessions, push_subscriptions, etc.) et appelle `supabaseAdmin.auth.admin.deleteUser()`.

### 2. Paiement Stripe dans l'app = violation de la politique de paiement des stores
- **Play Store (TWA)** : une app distribuée sur Play qui vend des abonnements numériques doit passer par **Play Billing** (via Digital Goods API + Payment Request API pour les TWA). Ta page /pricing avec Stripe Checkout, visible dans la TWA, sera refusée ou l'app retirée. (Le paysage évolue avec l'antitrust US — alternative billing avec commission 9-20 % en cours de mise en place — mais la voie sûre reste Play Billing.)
- **App Store** : abonnement numérique ⇒ **In-App Purchase Apple obligatoire** (guideline 3.1.1), pas de Stripe ni de lien vers un paiement externe (hors cas particuliers US/EU).

**Options réalistes** :
a) **Variante "reader"** : détecter le contexte TWA/app native et masquer pricing/checkout dans l'app (achat uniquement via le site web, sans lien sortant depuis l'app). C'est le chemin le plus rapide, utilisé par Netflix/Spotify.
b) Implémenter Play Billing (Digital Goods API) côté Android et StoreKit côté iOS — plus long, double système d'abonnement à réconcilier avec Stripe/Supabase.

### 3. iOS : rien n'existe encore, et une TWA ne suffira pas
Le projet Bubblewrap couvre **Android uniquement**. Pour l'App Store il faut un binaire natif (Capacitor recommandé), et Apple rejette les "sites web emballés" (guideline 4.2 — minimum functionality). Il faudra des capacités natives réelles : push natifs, accès caméra natif pour l'analyse photo, haptics, offline propre. Prévois ce chantier comme un projet à part entière, pas une formalité.

---

## 🟠 CRITIQUE — opérationnel

### 4. Crons Vercel cassés (405) — ✅ CORRIGÉ dans cet audit
`vercel.json` appelle `/api/notifications` en GET, la route n'avait qu'un POST. Ajout d'un handler GET authentifié par `Authorization: Bearer CRON_SECRET` (mécanisme natif Vercel). **Action requise : vérifier que la variable `CRON_SECRET` est bien définie dans les env Vercel**, sinon les crons resteront en 401.

### 5. Rate limiting en mémoire (inefficace en serverless)
`checkRateLimit` (Map JS) repart à zéro à chaque instance/cold start. Les routes IA (Claude/Whisper) sont coûteuses ; le quota journalier ai-guard limite les dégâts pour les abonnés Essentiel, mais les Premium sont illimités. **Migrer vers Upstash Redis** (déjà dans ta to-do).
À noter aussi : `checkAiQuota` est *fail-open* en cas d'erreur DB (choix assumé, mais à connaître).

---

## 🟡 MOYEN

6. **Icône maskable** : `icon-192/512` servent à la fois `any` et `maskable`. Sans zone de sécurité (~20 % de marge), le logo sera rogné sur les launchers Android. Générer une vraie version maskable.
7. **Leaderboard public** : `GET /api/groups?leaderboard=1` sans auth expose noms de groupes + nb de membres. Volontaire ? Si oui OK (données peu sensibles), sinon ajouter l'auth.
8. **Compteur quota IA** : lecture-puis-update non atomique dans ai-guard → un user peut dépasser sa limite en envoyant des requêtes parallèles. Faible enjeu, fix possible via RPC SQL atomique.
9. **Upload audio** : MIME + taille vérifiés mais pas les magic bytes. Risque faible (fichiers transmis à Whisper, pas stockés publiquement).

## 🟢 MINEUR

10. Page `/billing` morte (redirige /account) — supprimable, le footer email pointe dessus.
11. `payment_method_types: ['card']` en dur — empêche Apple Pay/Google Pay/Link dans Stripe Checkout (les activer améliore la conversion mobile).
12. Email de bienvenue : lien "Gérer mon abonnement" → /billing (fonctionne via redirect, mais autant pointer /account).

## ✅ Vérifié et sain

- Auth Bearer + fallback cookies cohérent sur toutes les routes API ; aucun IDOR trouvé (family/*, groups, child-journal vérifient l'appartenance)
- `.env.local` jamais committé, keystore/AAB/APK non trackés
- Webhook Stripe : signature vérifiée, gestion subscription.updated/deleted, parrainage protégé
- Anti double abonnement : la route checkout met à jour l'abo existant côté serveur (fix de ce jour)
- Middleware fail-closed sur l'auth, headers de sécurité HTTP, manifest PWA complet, assetlinks.json avec SHA-256 rempli
- `/privacy`, `/legal`, `/faq` présents (requis par les deux stores)
- tsc --noEmit ✓

---

## Ordre d'attaque recommandé

1. **Suppression de compte** (1 route API + 1 section UI) — débloque les deux stores
2. **Masquer le checkout Stripe en contexte app** (variante reader) — débloque Play
3. Vérifier `CRON_SECRET` sur Vercel + `git push` des fixes
4. Soumission **Play Store d'abord** (TWA prête : keystore, assetlinks, AAB v2)
5. Rate limiting Upstash + icône maskable
6. Chantier iOS (Capacitor + StoreKit) — planifier séparément
