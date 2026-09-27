# MYTA iOS — Déploiement App Store + Achats in-app (RevenueCat)

Guide pour finir la mise en ligne. Le code est déjà fait (RevenueCat solo : Essentiel + Premium).
Les Couple/Famille restent gérés sur le web.

---

## 0. Pré-requis
- Compte Apple Developer actif ($99/an).
- Dans App Store Connect → **Agreements, Tax, and Banking** : signer le **Paid Apps Agreement**
  et remplir banque + fiscalité. ⚠️ Sans ça, les produits IAP ne se chargent JAMAIS (offering vide).

---

## 1. Code & build local (sur ton Mac)
```bash
cd MYTA
npm install @revenuecat/purchases-capacitor   # le plugin (bloqué dans le sandbox, à faire ici)
npm run build                                  # vérifie que le build Next passe
npx cap sync ios                               # ajoute le pod natif RevenueCat à Xcode
```

Variables d'env à ajouter (Vercel **et** `.env.local`) :
```
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx   # clé publique SDK (étape 3)
REVENUECAT_WEBHOOK_AUTH=un_secret_au_hasard
```
Redéploie le web sur Vercel après ajout (l'app iOS charge mytwinapp.fr).

---

## 2. App Store Connect — Abonnements
App Store Connect → ton app → **Monetization → Subscriptions**.

1. Créer un **Subscription Group** : `MYTA` (les deux plans doivent être dans le même groupe
   pour permettre l'upgrade/downgrade Essentiel ↔ Premium).
2. Créer 2 abonnements auto-renouvelables (Product IDs **exactement** ceux-ci, ils sont codés en dur) :

   | Plan      | Product ID                              | Prix       | Essai |
   |-----------|-----------------------------------------|------------|-------|
   | Essentiel | `fr.mytwinapp.app.essentiel.monthly`    | 2,99 €/mois| —     |
   | Premium   | `fr.mytwinapp.app.premium.monthly`      | 4,99 €/mois| 3 j   |

3. Premium → **Introductory Offer** → *Free trial*, durée **3 jours**, sur tous les territoires.
4. Pour chaque produit : nom localisé (FR), description, et **capture d'écran de review** (obligatoire).
5. Statut visé : *Ready to Submit* (les produits seront attachés à la version à l'étape 7).

---

## 3. RevenueCat
1. Crée un projet → **Add app → App Store**, renseigne le bundle `fr.mytwinapp.app`.
2. **App Store Connect Shared Secret** : ASC → ton app → App Information → copie le *App-Specific Shared Secret*, colle-le dans RevenueCat.
3. **Products** : ajoute les 2 product IDs ci-dessus.
4. **Entitlements** : crée `essentiel` (→ produit essentiel) et `premium` (→ produit premium).
   ⚠️ Les identifiants `essentiel` / `premium` sont attendus par le code (`revenuecat.ts`).
5. **Offerings** : crée l'offering **Current** `default` avec 2 packages :
   - package `essentiel` → produit essentiel
   - package `premium` → produit premium
6. **API keys** → copie la clé publique **Apple** (`appl_…`) → `NEXT_PUBLIC_REVENUECAT_IOS_KEY`.
7. **Integrations → Webhooks** :
   - URL : `https://mytwinapp.fr/api/webhook/revenuecat`
   - **Authorization header** : la même valeur que `REVENUECAT_WEBHOOK_AUTH`.

---

## 4. Xcode — signing & version
Ouvre `ios/App/App.xcworkspace` (pas le `.xcodeproj`).
- Target App → **Signing & Capabilities** : coche *Automatically manage signing*, choisis ton **Team**.
- Vérifie **Bundle Identifier** = `fr.mytwinapp.app`.
- General → **Version** 1.0, **Build** 1 (incrémente le build à chaque upload).
- L'`In-App Purchase` est géré par StoreKit (aucune capability à ajouter manuellement).

---

## 5. Archive & upload
1. En haut : sélectionne **Any iOS Device (arm64)** (pas un simulateur).
2. **Product → Archive**.
3. Dans l'Organizer : **Distribute App → App Store Connect → Upload**.
4. Attends le traitement (~5–15 min) → le build apparaît dans ASC → TestFlight.

---

## 6. Test Sandbox (avant soumission)
- ASC → **Users and Access → Sandbox → Testers** : crée un compte sandbox (email bidon).
- Sur un iPhone réel : Réglages → App Store → connecte le compte sandbox (section *Sandbox*).
- Lance l'app via TestFlight, va sur Pricing → l'achat doit afficher Essentiel/Premium et passer en sandbox.
- Vérifie que `profiles.subscription_status` passe à `trialing`/`active` dans Supabase (= webhook OK).
- Teste **Restaurer mes achats**.

---

## 7. Fiche + soumission
Dans la version iOS (ASC → ton app → version 1.0) :
- **Screenshots** iPhone 6.7" (obligatoire) — tu as déjà des screenshots tablette, il faut les formats iPhone.
- Description, mots-clés, catégorie (Santé & Forme), URL support + confidentialité.
- **In-App Purchases / Subscriptions** : attache les 2 abonnements à cette version.
- **App Privacy** : déclare email, données de santé/forme, identifiants.
- **App Review Information** :
  - ⚠️ **Compte démo** obligatoire (l'app est derrière login). Crée un compte test avec un abonnement actif et mets login/mdp ici.
  - Notes : préciser que les fonctions micro/caméra servent au journal vocal et à l'analyse photo des repas.
- **Submit for Review**.

---

## Points de vigilance review
- **3.1.1** : ✅ plus aucun lien/incitation de paiement externe sur iOS (flux email supprimé), achat via StoreKit.
- **3.1.2** : ✅ mentions légales auto-renouvellement + liens CGU/Confidentialité présents sur l'écran d'achat.
- **4.2 (thin wrapper)** : risque modéré (app charge le site distant). Atténué par micro/caméra natifs. Si soulevé, mettre en avant les fonctionnalités natives dans les notes de review.
- **5.1.1(v)** : ✅ suppression de compte in-app déjà présente.
- **Permissions** : ✅ NSMicrophone/NSCamera/NSPhotoLibrary ajoutées à l'Info.plist.
