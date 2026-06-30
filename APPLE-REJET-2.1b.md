# Rejet Apple MYTA — actions pour resoumettre

Submission ID : `d4c87d04-e540-4914-9ea4-57a56c446538`
Build review : 1.0 (2) — device : iPad Air 11" (M3) — date : 23 juin 2026

Deux sujets distincts à régler :

---

## 1) Guideline 2.1(b) — « cannot locate the In-App Purchases »

### Audit complet réalisé le 30 juin — tout est OK côté consoles :
- ✅ Paid Applications Agreement : **Actif**
- ✅ Compte bancaire QONTO + formulaires fiscaux : Actifs
- ✅ 2 abonnements créés, bons identifiants, **rattachés à la version** (En attente de vérification)
- ✅ Compte démo fourni + vidéo `demo-myta.mp4` + notes de review
- ✅ RevenueCat : offering `default` **active**, 2 packages bien mappés
- ✅ Vercel : `NEXT_PUBLIC_REVENUECAT_IOS_KEY` présente en Production (clé `appl_…`)
- ✅ Plugin natif RevenueCat câblé (SPM, `packageClassList: ["PurchasesPlugin"]`)

### VRAIE cause trouvée : bug de l'écran Pricing (spinner infini)
Test TestFlight (build 3) → l'écran d'offres **tournait sans fin**. Le reviewer
voyait donc un chargement perpétuel = « aucun achat in-app ».

Côté code (`pricing/page.tsx` + `revenuecat.ts`) : aucun `try/finally` ne coupait
l'état de chargement, et l'import dynamique du plugin (chargé depuis le site
distant) n'avait pas de timeout → si le chunk ne répondait pas, spinner infini.

### Correctif appliqué (commits à pousser)
- `revenuecat.ts` : import du plugin borné par un timeout (12 s).
- `pricing/page.tsx` : chargement en `try/finally` (spinner toujours coupé) +
  bouton **« Réessayer »** + log d'erreur exploitable.

> ⚠️ L'app charge `mytwinapp.fr` à distance → un **`git push` (Vercel)** suffit,
> la correction prend effet dans la build TestFlight existante **sans rebuild Xcode**.

### Étapes
- [ ] `git push` (déploiement Vercel auto).
- [ ] Re-tester sur TestFlight build 3 : Compte → « Voir les offres » →
      les 2 abonnements doivent s'afficher avec leur prix.
      - Si OK → resoumettre + répondre à Apple (texte ci-dessous).
      - Si « offres indisponibles » → regarder le log console (erreur RC) :
        produit pas encore propagé en sandbox / compte sandbox / shared secret.

### Réponse à coller dans App Review (App Store Connect → Messages)

> Hello,
>
> Thank you for your review. Here are the steps to locate the in-app purchases:
>
> 1. Launch the app and sign in with the demo account we provided in App Review
>    Information (the subscription screen is only shown to signed-in users):
>    - Email: <À COMPLÉTER>
>    - Password: <À COMPLÉTER>
> 2. Open the menu and tap "Pricing" / "Abonnement" (or go to Account → Upgrade).
> 3. The two auto-renewable subscriptions appear there:
>    - Essentiel (fr.mytwinapp.app.essentiel.monthly)
>    - Premium (fr.mytwinapp.app.premium.monthly)
> 4. Tap a plan to start the StoreKit purchase. A "Restore purchases" button is
>    available on the same screen.
>
> The in-app purchases are managed through RevenueCat and are now configured and
> attached to this version. We have also signed the Paid Applications Agreement.
>
> Please let us know if anything else is needed. Thank you!

*(Réponse en français possible aussi — Apple accepte. Dis-moi si tu la veux en FR.)*

---

## 2) Trader contact info (Digital Services Act)

Mail séparé du 24 juin : coordonnées « trader » non vérifiées.

- [ ] App Store Connect → *Business* (ou *App Information* → Trader status) →
      saisir l'adresse + téléphone + email du trader **exactement** comme sur un
      justificatif officiel (les infos doivent être vérifiables publiquement).
- [ ] Sauvegarder et resoumettre les coordonnées.

Sans ça, l'app ne peut pas être distribuée dans l'UE.

---

## Ordre conseillé
1. Signer Paid Apps Agreement + Trader info.
2. Configurer/attacher les IAP + offering RevenueCat current.
3. Ajouter le compte démo.
4. Resoumettre build 1.0 (3) + répondre au message Apple.
