'use client'

/**
 * Parcours d'onboarding guidé par Waty.
 * Progression stockée dans profiles.onboarding_step (cf. supabase-onboarding.sql).
 * Ordre : profile → journal → sport → sleep → account → done
 */

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type OnboardingStep =
  | 'profile' | 'journal' | 'sport' | 'sleep' | 'account' | 'done'

export const ONBOARDING_ORDER: OnboardingStep[] =
  ['profile', 'journal', 'sport', 'sleep', 'account', 'done']

/** Page « hub » de chaque étape (là où Waty guide l'action). */
export const ONBOARDING_ROUTE: Record<OnboardingStep, string> = {
  profile: '/profile',
  journal: '/nutrition/journal',
  sport:   '/sport/session',
  sleep:   '/sleep',
  account: '/account',
  done:    '/dashboard',
}

export function nextStep(step: OnboardingStep): OnboardingStep {
  const i = ONBOARDING_ORDER.indexOf(step)
  if (i < 0 || i >= ONBOARDING_ORDER.length - 1) return 'done'
  return ONBOARDING_ORDER[i + 1]
}

/** True tant que le parcours n'est pas terminé. */
export function tourActive(step: OnboardingStep | null): boolean {
  return !!step && step !== 'done'
}

/**
 * Avance à l'étape suivante — uniquement si le profil est encore sur `from`
 * (garde idempotente : évite les sauts/régressions et les doubles-clics).
 */
export async function advanceOnboarding(userId: string, from: OnboardingStep): Promise<OnboardingStep> {
  const to = nextStep(from)
  const supabase = createClient()
  await supabase.from('profiles')
    .update({ onboarding_step: to })
    .eq('id', userId)
    .eq('onboarding_step', from)
  return to
}

/** Termine / passe entièrement le guide. */
export async function skipOnboarding(userId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('profiles').update({ onboarding_step: 'done' }).eq('id', userId)
}

/**
 * Hook partagé par chaque page du parcours.
 * Renvoie l'étape courante + helpers. `loading` évite tout flash.
 */
export function useOnboarding() {
  const [step, setStep]       = useState<OnboardingStep | null>(null)
  const [userId, setUserId]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      if (!session) { setLoading(false); return }
      setUserId(session.user.id)
      const { data } = await supabase
        .from('profiles').select('onboarding_step').eq('id', session.user.id).single()
      if (!active) return
      setStep(((data?.onboarding_step as OnboardingStep) ?? 'done'))
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  /** Avance depuis l'étape `from` et met à jour l'état local. */
  const advance = useCallback(async (from: OnboardingStep): Promise<OnboardingStep | undefined> => {
    if (!userId) return
    const to = await advanceOnboarding(userId, from)
    setStep(to)
    return to
  }, [userId])

  /** Passe tout le guide. */
  const skip = useCallback(async () => {
    if (!userId) return
    await skipOnboarding(userId)
    setStep('done')
  }, [userId])

  return { step, userId, loading, advance, skip }
}
