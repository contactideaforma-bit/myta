/**
 * Gestion du quota IA par plan d'abonnement — limites journalières par feature.
 *
 * Forfaits essentiel* :
 *   - meal   : 3 analyses/jour  (analyze-meal-photo + voice-meal, cumulé)
 *   - sport  : 2 analyses/jour  (voice-session)
 *   - recipe : bloqué (0)
 *   - report : bloqué (0)
 *
 * Forfaits premium* : illimité sur toutes les features
 * Rôle 'child'      : accès IA bloqué
 * Partenaire famille : hérite du plan du propriétaire
 *
 * Colonnes Supabase utilisées :
 *   ai_daily_key        TEXT     — format "YYYY-MM-DD"
 *   ai_daily_meal_used  INTEGER  — compteur repas du jour
 *   ai_daily_sport_used INTEGER  — compteur sport du jour
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PlanId, STRIPE_PLANS } from './stripe-plans'
import { hasActiveAccess, isFreeTrial } from './access'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type AiFeature = 'meal' | 'sport' | 'recipe' | 'report'

/** Limites journalières pour les plans essentiel (0 = bloqué) */
const DAILY_LIMITS: Record<AiFeature, number> = {
  meal:   3,  // analyze-meal-photo + voice-meal cumulé
  sport:  2,  // voice-session
  recipe: 0,  // réservé Premium
  report: 0,  // réservé Premium
}

const FEATURE_LABELS: Record<AiFeature, string> = {
  meal:   'analyses de repas',
  sport:  'analyses de séance',
  recipe: 'recettes IA',
  report: 'rapport IA hebdomadaire',
}

export interface AiGuardResult {
  allowed:    boolean
  error?:     NextResponse
  remaining?: number | null  // null = illimité
}

export async function checkAiQuota(userId: string, feature: AiFeature): Promise<AiGuardResult> {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(
        'plan, subscription_status, trial_ends_at, family_role, family_owner_id, ai_daily_key, ai_daily_meal_used, ai_daily_sport_used'
      )
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return {
        allowed: false,
        error: NextResponse.json({ error: 'Profil introuvable' }, { status: 401 }),
      }
    }

    // Enfant : pas d'accès IA
    if (profile.family_role === 'child') {
      return {
        allowed: false,
        error: NextResponse.json({
          error: "Les comptes enfant n'ont pas accès aux fonctionnalités IA.",
          code:  'CHILD_NO_AI',
        }, { status: 403 }),
      }
    }

    // Plan effectif : partenaire famille → hérite du propriétaire
    let effectivePlan: string | null = profile.plan ?? null
    let activeStatus = profile.subscription_status ?? ''
    let trialEndsAt: string | null = profile.trial_ends_at ?? null

    if (profile.family_role === 'partner' && profile.family_owner_id) {
      const { data: owner } = await supabaseAdmin
        .from('profiles')
        .select('plan, subscription_status, trial_ends_at')
        .eq('id', profile.family_owner_id)
        .single()
      if (owner) {
        effectivePlan = owner.plan ?? effectivePlan
        activeStatus  = owner.subscription_status ?? activeStatus
        trialEndsAt   = owner.trial_ends_at ?? trialEndsAt
      }
    }

    // Accès requis (abonné OU essai 3 jours en cours). L'essai expiré est refusé.
    if (!hasActiveAccess(activeStatus, trialEndsAt)) {
      return {
        allowed: false,
        error: NextResponse.json({
          error: "Un abonnement actif est requis pour utiliser l'IA.",
          code:  'SUBSCRIPTION_REQUIRED',
        }, { status: 403 }),
      }
    }

    // Détecter le tier (premium vs essentiel).
    // Pendant l'essai gratuit 3 jours → accès Premium complet offert.
    const planConfig = effectivePlan ? STRIPE_PLANS[effectivePlan as PlanId] : null
    const isPremium  = planConfig?.tier === 'premium' || isFreeTrial(activeStatus, trialEndsAt)

    // Premium → illimité
    if (isPremium) {
      return { allowed: true, remaining: null }
    }

    // ─── Essentiel : vérifier la limite journalière ───────────────────────────

    const limit = DAILY_LIMITS[feature]

    // Feature bloquée pour essentiel
    if (limit === 0) {
      return {
        allowed: false,
        error: NextResponse.json({
          error:      `Les ${FEATURE_LABELS[feature]} sont réservées au forfait Premium.`,
          hint:       "Passe en Premium pour accéder à cette fonctionnalité sans limite.",
          code:       'FEATURE_NOT_INCLUDED',
          feature,
          upgradeUrl: '/pricing?change=true',
        }, { status: 403 }),
      }
    }

    // Calculer les usages du jour (reset si nouveau jour)
    const todayKey  = new Date().toISOString().slice(0, 10)  // "YYYY-MM-DD"
    const isToday   = (profile.ai_daily_key ?? '') === todayKey
    const usedMeal  = isToday ? (profile.ai_daily_meal_used  ?? 0) : 0
    const usedSport = isToday ? (profile.ai_daily_sport_used ?? 0) : 0
    const usedCount = feature === 'meal' ? usedMeal : usedSport

    if (usedCount >= limit) {
      return {
        allowed: false,
        error: NextResponse.json({
          error:      `Limite journalière atteinte pour les ${FEATURE_LABELS[feature]} (${limit}/${limit} aujourd'hui).`,
          hint:       "Reviens demain ou passe en Premium pour un accès illimité.",
          code:       'DAILY_QUOTA_EXCEEDED',
          feature,
          limit,
          used:       usedCount,
          upgradeUrl: '/pricing?change=true',
        }, { status: 429 }),
      }
    }

    // Incrémenter le bon compteur
    const newMeal  = feature === 'meal'  ? usedMeal  + 1 : usedMeal
    const newSport = feature === 'sport' ? usedSport + 1 : usedSport

    await supabaseAdmin
      .from('profiles')
      .update({
        ai_daily_key:        todayKey,
        ai_daily_meal_used:  newMeal,
        ai_daily_sport_used: newSport,
      })
      .eq('id', userId)

    const remaining = limit - (feature === 'meal' ? newMeal : newSport)
    return { allowed: true, remaining }

  } catch (err) {
    console.error('[ai-guard] Erreur:', err)
    // Fail-open en cas d'erreur technique (serverless cold start, DB timeout…)
    return { allowed: true, remaining: null }
  }
}
