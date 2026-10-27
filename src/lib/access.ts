/**
 * Source de vérité unique pour l'accès à l'app (modèle "Netflix").
 *
 * Statuts d'abonnement (profiles.subscription_status) :
 *   - 'active'          → accès permanent (Stripe / stores)
 *   - 'vip'             → accès offert : permanent si access_until est NULL,
 *                         sinon TANT QUE now < access_until (partenaires, codes promo)
 *   - 'trialing'        → accès pendant l'essai :
 *        • trial_ends_at renseigné (essai 3 j sans CB) → accès TANT QUE now < trial_ends_at
 *        • trial_ends_at NULL (essai géré par Stripe)  → accès (Stripe gère la transition)
 *   - autre ('free', 'canceled', 'past_due', essai expiré) → pas d'accès
 *
 * L'expiration est calculée à la volée → aucun cron nécessaire.
 * Fonctions pures : utilisables côté client ET serveur (middleware, API).
 */

export function hasActiveAccess(
  status?: string | null,
  trialEndsAt?: string | null,
  accessUntil?: string | null,
): boolean {
  if (!status) return false
  if (status === 'active') return true
  if (status === 'vip') {
    if (!accessUntil) return true
    return new Date(accessUntil).getTime() > Date.now()
  }
  if (status === 'trialing') {
    if (!trialEndsAt) return true // essai géré par Stripe
    return new Date(trialEndsAt).getTime() > Date.now()
  }
  return false
}

/** True si l'utilisateur est dans son essai gratuit 3 jours (accès Premium offert). */
export function isFreeTrial(
  status?: string | null,
  trialEndsAt?: string | null,
): boolean {
  return (
    status === 'trialing' &&
    !!trialEndsAt &&
    new Date(trialEndsAt).getTime() > Date.now()
  )
}

/** Jours entiers restants d'essai (0 si terminé / pas d'essai). */
export function trialDaysLeft(trialEndsAt?: string | null): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0
}

/** Jours entiers restants d'accès offert (statut 'vip' à durée limitée). */
export function accessDaysLeft(accessUntil?: string | null): number | null {
  if (!accessUntil) return null
  const ms = new Date(accessUntil).getTime() - Date.now()
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0
}
