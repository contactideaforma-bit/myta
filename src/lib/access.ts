/**
 * Source de vérité unique pour l'accès à l'app (modèle "Netflix").
 *
 * Statuts d'abonnement (profiles.subscription_status) :
 *   - 'active' | 'vip'  → accès permanent
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
): boolean {
  if (!status) return false
  if (status === 'active' || status === 'vip') return true
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
