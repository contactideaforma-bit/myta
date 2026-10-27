/**
 * Gestion du quota IA par plan d'abonnement.
 *
 * Limites JOURNALIÈRES (forfaits essentiel*) :
 *   - meal   : 3 analyses/jour  (analyze-meal-photo + voice-meal, cumulé)
 *   - sport  : 2 analyses/jour  (voice-session)
 *   - recipe : bloqué (0)
 *   - report : bloqué (0)
 *
 * Limite MENSUELLE (feature 'import' = import de recette lien/capture/photo) :
 *   - essentiel : 3 imports / mois (dégustation)
 *   - essai 3 j : 5 imports / mois (porte d'entrée, pas illimité)
 *   - premium   : illimité
 *   → fail-CLOSED en cas d'erreur technique (un import coûte 1 à 4 ct).
 *
 * Forfaits premium* : illimité sur toutes les features
 * Rôle 'child'      : accès IA bloqué
 * Partenaire famille : hérite du plan du propriétaire
 *
 * Colonnes Supabase utilisées :
 *   ai_daily_key          TEXT     — format "YYYY-MM-DD"
 *   ai_daily_meal_used    INTEGER  — compteur repas du jour
 *   ai_daily_sport_used   INTEGER  — compteur sport du jour
 *   ai_month_key          TEXT     — format "YYYY-MM"      (supabase-recipes-import.sql)
 *   ai_month_import_used  INTEGER  — compteur imports du mois
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PlanId, STRIPE_PLANS } from './stripe-plans'
import { hasActiveAccess, isFreeTrial } from './access'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type AiFeature = 'meal' | 'sport' | 'recipe' | 'report' | 'import'

/** Limites journalières pour les plans essentiel (0 = bloqué) */
const DAILY_LIMITS: Record<Exclude<AiFeature, 'import'>, number> = {
  meal:   3,  // analyze-meal-photo + voice-meal cumulé
  sport:  2,  // voice-session
  recipe: 0,  // réservé Premium
  report: 0,  // réservé Premium
}

/** Limites mensuelles d'import de recettes */
export const IMPORT_MONTHLY_LIMITS = {
  essentiel: 3,
  trial:     5,
}

const FEATURE_LABELS: Record<AiFeature, string> = {
  meal:   'analyses de repas',
  sport:  'analyses de séance',
  recipe: 'recettes IA',
  report: 'rapport IA hebdomadaire',
  import: 'imports de recettes',
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
        'plan, subscription_status, trial_ends_at, family_role, family_owner_id, ai_daily_key, ai_daily_meal_used, ai_daily_sport_used, ai_month_key, ai_month_import_used'
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
    const inTrial    = isFreeTrial(activeStatus, trialEndsAt)
    const isPremium  = planConfig?.tier === 'premium' || inTrial

    // ─── Import de recettes : quota MENSUEL ───────────────────────────────────
    if (feature === 'import') {
      // Premium payant → illimité. Essai → 5/mois. Essentiel → 3/mois.
      if (planConfig?.tier === 'premium') return { allowed: true, remaining: null }

      const limit    = inTrial ? IMPORT_MONTHLY_LIMITS.trial : IMPORT_MONTHLY_LIMITS.essentiel
      const monthKey = new Date().toISOString().slice(0, 7)   // "YYYY-MM"
      const isMonth  = (profile.ai_month_key ?? '') === monthKey
      const used     = isMonth ? (profile.ai_month_import_used ?? 0) : 0

      if (used >= limit) {
        return {
          allowed: false,
          error: NextResponse.json({
            error:      `Tu as utilisé tes ${limit} imports de recettes du mois.`,
            hint:       inTrial
              ? "Abonne-toi en Premium pour importer sans limite."
              : "Passe en Premium pour importer des recettes sans limite.",
            code:       'MONTHLY_QUOTA_EXCEEDED',
            feature,
            limit,
            used,
            upgradeUrl: '/pricing?change=true',
          }, { status: 429 }),
        }
      }

      const { error: upErr } = await supabaseAdmin
        .from('profiles')
        .update({ ai_month_key: monthKey, ai_month_import_used: used + 1 })
        .eq('id', userId)
      if (upErr) throw upErr   // fail-closed (voir catch)

      return { allowed: true, remaining: limit - (used + 1) }
    }

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
    if (feature === 'import') {
      // Fail-CLOSED : un import coûte trop cher pour être offert en cas de panne
      return {
        allowed: false,
        error: NextResponse.json({ error: "Service momentanément indisponible, réessaie dans un instant." }, { status: 503 }),
      }
    }
    // Fail-open en cas d'erreur technique (serverless cold start, DB timeout…)
    return { allowed: true, remaining: null }
  }
}
