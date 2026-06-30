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

## Fait dans la dernière session (déploiement iOS App Store)
- ✅ Info.plist iOS : ajout NSMicrophone/NSCamera/NSPhotoLibrary(+Add)UsageDescription, ITSAppUsesNonExemptEncryption=false, region fr, armv7→arm64
- ✅ Conformité review auditée : suppression compte ✅, pas de social login (Sign in Apple non requis) ✅
- ✅ Décision 3.1.1 : remplacement du flux email (steering, rejet probable) par achats in-app RevenueCat
- ✅ IAP RevenueCat solo (Essentiel/Premium) : src/lib/revenuecat.ts, écran achat iOS dans pricing/page.tsx (restore + mentions légales 3.1.2), webhook /api/webhook/revenuecat → profiles, gestion abo iOS dans account/page.tsx (App Store + restore)
- ⏳ RESTE À FAIRE sur Mac : `npm install @revenuecat/purchases-capacitor`, npx cap sync, setup ASC+RevenueCat, archive/upload, soumission → voir IOS-IAP-DEPLOY.md
- Product IDs IAP (codés en dur): fr.mytwinapp.app.essentiel.monthly / fr.mytwinapp.app.premium.monthly ; entitlements RC: essentiel/premium
- Env à ajouter (Vercel): NEXT_PUBLIC_REVENUECAT_IOS_KEY, REVENUECAT_WEBHOOK_AUTH

## Fait dans cette session (Play Store deep links)
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
