/**
 * Configuration des 6 plans d'abonnement MYTA.
 * Les price IDs Stripe sont à remplir dans les variables d'environnement
 * après création dans le Dashboard Stripe.
 *
 * Variables .env à créer :
 *   STRIPE_PRICE_ESSENTIEL
 *   STRIPE_PRICE_PREMIUM
 *   STRIPE_PRICE_ESSENTIEL_COUPLE
 *   STRIPE_PRICE_PREMIUM_COUPLE
 *   STRIPE_PRICE_ESSENTIEL_FAMILLE
 *   STRIPE_PRICE_PREMIUM_FAMILLE
 */

export type PlanId =
  | 'essentiel'
  | 'premium'
  | 'essentiel_couple'
  | 'premium_couple'
  | 'essentiel_famille'
  | 'premium_famille'

export type PlanTier    = 'essentiel' | 'premium'
export type PlanVariant = 'solo' | 'couple' | 'famille'

export interface StripePlan {
  id:          PlanId
  label:       string        // ex: "Essentiel"
  variant:     PlanVariant
  tier:        PlanTier
  priceMonthly: number       // en euros
  envVar:      string        // nom de la variable d'env pour le price ID Stripe
  aiQuota:     number | null // null = illimité ; 15 = max 15 calls/mois
  maxAdults:   number        // 1 ou 2
  maxChildren: number        // 0 ou 3
  description: string
}

export const STRIPE_PLANS: Record<PlanId, StripePlan> = {
  essentiel: {
    id:           'essentiel',
    label:        'Essentiel',
    variant:      'solo',
    tier:         'essentiel',
    priceMonthly: 2.99,
    envVar:       'STRIPE_PRICE_ESSENTIEL',
    aiQuota:      15,
    maxAdults:    1,
    maxChildren:  0,
    description:  'Journal, sport, sommeil — 3 analyses repas/jour, 2 séances sport/jour',
  },
  premium: {
    id:           'premium',
    label:        'Premium',
    variant:      'solo',
    tier:         'premium',
    priceMonthly: 4.99,
    envVar:       'STRIPE_PRICE_PREMIUM',
    aiQuota:      null,
    maxAdults:    1,
    maxChildren:  0,
    description:  'Tout illimité — recettes IA, analyse photo, coach Waty',
  },
  essentiel_couple: {
    id:           'essentiel_couple',
    label:        'Essentiel Couple',
    variant:      'couple',
    tier:         'essentiel',
    priceMonthly: 5.99,
    envVar:       'STRIPE_PRICE_ESSENTIEL_COUPLE',
    aiQuota:      15,
    maxAdults:    2,
    maxChildren:  0,
    description:  '2 adultes — 3 analyses repas/jour, 2 séances sport/jour chacun',
  },
  premium_couple: {
    id:           'premium_couple',
    label:        'Premium Couple',
    variant:      'couple',
    tier:         'premium',
    priceMonthly: 8.99,
    envVar:       'STRIPE_PRICE_PREMIUM_COUPLE',
    aiQuota:      null,
    maxAdults:    2,
    maxChildren:  0,
    description:  '2 adultes — tout illimité',
  },
  essentiel_famille: {
    id:           'essentiel_famille',
    label:        'Essentiel Famille',
    variant:      'famille',
    tier:         'essentiel',
    priceMonthly: 7.99,
    envVar:       'STRIPE_PRICE_ESSENTIEL_FAMILLE',
    aiQuota:      15,
    maxAdults:    2,
    maxChildren:  3,
    description:  '2 adultes + jusqu\'à 3 enfants — 3 analyses repas/jour, 2 séances sport/jour',
  },
  premium_famille: {
    id:           'premium_famille',
    label:        'Premium Famille',
    variant:      'famille',
    tier:         'premium',
    priceMonthly: 11.95,
    envVar:       'STRIPE_PRICE_PREMIUM_FAMILLE',
    aiQuota:      null,
    maxAdults:    2,
    maxChildren:  3,
    description:  '2 adultes + jusqu\'à 3 enfants — adultes tout illimité',
  },
}

/** Résoudre le price ID Stripe depuis les env vars (runtime) */
export function getPriceId(planId: PlanId): string | null {
  const plan = STRIPE_PLANS[planId]
  if (!plan) return null
  return process.env[plan.envVar] ?? null
}

/** Trouver le planId à partir d'un price ID Stripe (pour le webhook) */
export function getPlanIdFromPriceId(priceId: string): PlanId | null {
  for (const [id, plan] of Object.entries(STRIPE_PLANS)) {
    const envPriceId = process.env[plan.envVar]
    if (envPriceId && envPriceId === priceId) return id as PlanId
  }
  return null
}

export const ALL_PLAN_IDS = Object.keys(STRIPE_PLANS) as PlanId[]
