'use client'

/**
 * Mini-jeux Waty — jours d'utilisation, paliers de déblocage, meilleurs scores.
 * Tables : activity_days + game_scores (cf. supabase-minigames.sql).
 * Paliers (jours d'utilisation NON consécutifs) : 7 → lava, 14 → tri, 30 → runner.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/utils'

export type GameKey = 'lava' | 'tri' | 'runner'

export interface GameDef {
  key:        GameKey
  title:      string
  emoji:      string
  desc:       string
  unlockDays: number
  href:       string
  scoreUnit:  string
  color:      string
}

export const GAMES: GameDef[] = [
  {
    key: 'lava', title: 'Floor is Lava', emoji: '🌋',
    desc: 'Un vrai platformer ! 5 niveaux au-dessus de la lave : saute, ramasse les étoiles et atteins le drapeau.',
    unlockDays: 7, href: '/games/lava', scoreUnit: '⭐', color: '#f97316',
  },
  {
    key: 'tri', title: 'Le Grand Tri', emoji: '🥗',
    desc: 'Les aliments pleuvent ! Déplace Waty au doigt : attrape les sains, évite la malbouffe.',
    unlockDays: 14, href: '/games/tri', scoreUnit: 'points', color: '#22c55e',
  },
  {
    key: 'runner', title: 'Waty Runner', emoji: '🏃',
    desc: 'Waty court ! Saute par-dessus la malbouffe et tiens la distance le plus longtemps possible.',
    unlockDays: 30, href: '/games/runner', scoreUnit: 'mètres', color: '#4B47A0',
  },
]

/**
 * Enregistre le jour d'utilisation courant (1 fois par jour max —
 * guard localStorage pour éviter les upserts répétés).
 * Appelé depuis la Navbar → couvre toutes les pages connectées.
 */
export async function logActivityToday(userId: string): Promise<void> {
  const today = todayISO()
  const guard = `myta_activity_${today}`
  try {
    if (localStorage.getItem(guard)) return
    const supabase = createClient()
    await supabase.from('activity_days').upsert(
      { user_id: userId, day: today },
      { onConflict: 'user_id,day', ignoreDuplicates: true }
    )
    localStorage.setItem(guard, '1')
  } catch { /* best effort */ }
}

/** Sauvegarde le score si c'est un nouveau record. Renvoie true si record battu. */
export async function saveBestScore(gameKey: GameKey, score: number): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || score <= 0) return false

    const { data: existing } = await supabase
      .from('game_scores').select('best_score')
      .eq('user_id', user.id).eq('game_key', gameKey).maybeSingle()

    if (existing && existing.best_score >= score) return false

    await supabase.from('game_scores').upsert(
      { user_id: user.id, game_key: gameKey, best_score: score, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,game_key' }
    )
    return true
  } catch { return false }
}

export interface GameUnlocks {
  loading:   boolean
  daysUsed:  number
  /** true si le palier du jeu est atteint */
  unlocked:  (key: GameKey) => boolean
  bestScores: Partial<Record<GameKey, number>>
}

/** Hook : jours d'utilisation + état de déblocage + meilleurs scores. */
export function useGameUnlocks(): GameUnlocks {
  const [loading, setLoading]       = useState(true)
  const [daysUsed, setDaysUsed]     = useState(0)
  const [bestScores, setBestScores] = useState<Partial<Record<GameKey, number>>>({})

  useEffect(() => {
    let active = true
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (!user) { setLoading(false); return }

      // S'assurer que le jour courant est compté avant de lire
      await logActivityToday(user.id)

      const [{ count }, { data: scores }] = await Promise.all([
        supabase.from('activity_days')
          .select('day', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase.from('game_scores')
          .select('game_key, best_score')
          .eq('user_id', user.id),
      ])
      if (!active) return

      setDaysUsed(count ?? 0)
      const map: Partial<Record<GameKey, number>> = {}
      for (const s of scores ?? []) map[s.game_key as GameKey] = s.best_score
      setBestScores(map)
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const unlocked = (key: GameKey) => {
    const def = GAMES.find(g => g.key === key)
    return !!def && daysUsed >= def.unlockDays
  }

  return { loading, daysUsed, unlocked, bestScores }
}
