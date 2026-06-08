import { STRIPE_PLANS, type PlanId } from './stripe-plans'

export function getPlanTier(planId: string | null | undefined): 'essentiel' | 'premium' {
  if (!planId) return 'essentiel'
  return STRIPE_PLANS[planId as PlanId]?.tier ?? 'essentiel'
}

export function getPlanVariant(planId: string | null | undefined): 'solo' | 'couple' | 'famille' {
  if (!planId) return 'solo'
  return STRIPE_PLANS[planId as PlanId]?.variant ?? 'solo'
}

/** L'utilisateur a accès aux features Premium */
export function isPremium(planId: string | null | undefined): boolean {
  return getPlanTier(planId) === 'premium'
}

/** L'utilisateur a un plan couple ou famille → bouton switch profil visible */
export function hasFamilySwitch(planId: string | null | undefined): boolean {
  const v = getPlanVariant(planId)
  return v === 'couple' || v === 'famille'
}

export function isFamille(planId: string | null | undefined): boolean {
  return getPlanVariant(planId) === 'famille'
}

export function getPlanLabel(planId: string | null | undefined): string {
  if (!planId) return 'Essentiel'
  return STRIPE_PLANS[planId as PlanId]?.label ?? planId
}

export function getPlanPrice(planId: string | null | undefined): number {
  if (!planId) return 0
  return STRIPE_PLANS[planId as PlanId]?.priceMonthly ?? 0
}

export function getAiQuota(planId: string | null | undefined): number | null {
  if (!planId) return 15
  return STRIPE_PLANS[planId as PlanId]?.aiQuota ?? 15
}
