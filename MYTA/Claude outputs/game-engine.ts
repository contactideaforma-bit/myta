'use client'

/**
 * Moteur commun des mini-jeux Waty v2 :
 *  - RNG à graine (défi du jour : même partie pour tout le monde)
 *  - clé de semaine ISO (classement amis)
 *  - sons synthétisés (Web Audio, aucun fichier) + vibration
 *  - secousse d'écran et particules
 *  - fin de partie : RPC game_finish_run (parties, record, points, série)
 *  - classement hebdo, défi du jour, tenues de Waty
 */

import { createClient } from '@/lib/supabase/client'
import type { GameKey } from './games'

// ─── RNG à graine (mulberry32) ───────────────────────────────────────────────
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Graine du jour pour un jeu : identique pour tous les joueurs le même jour. */
export function dailySeed(game: GameKey, day = todayKey()): number {
  let h = 2166136261
  for (const ch of `${game}:${day}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Clé de semaine ISO 'YYYY-Www' (lundi → dimanche). */
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// ─── Défi du jour ────────────────────────────────────────────────────────────
export interface DailyChallenge {
  game:      GameKey
  day:       string
  seed:      number
  /** Durée de la manche en secondes (défi = manche courte et fixe) */
  seconds:   number
  /** Objectif de score à atteindre */
  target:    number
  label:     string
  reward:    number   // points si réussi
}

export function getDailyChallenge(game: GameKey, day = todayKey()): DailyChallenge {
  const seed = dailySeed(game, day)
  const r = seededRandom(seed)
  // Objectif variable selon le jour, dans une fourchette atteignable mais tendue
  const base: Record<GameKey, [number, number, string]> = {
    tri:    [220, 420, 'points en 60 s'],
    lava:   [3, 5, 'tours'],
    runner: [250, 600, 'mètres'],
  }
  const [lo, hi, unit] = base[game]
  const target = Math.round(lo + r() * (hi - lo))
  const rounded = game === 'tri' ? Math.round(target / 10) * 10 : target
  return { game, day, seed, seconds: 60, target: rounded, label: `${rounded} ${unit}`, reward: 50 }
}

// ─── Tenues de Waty ──────────────────────────────────────────────────────────
export type SkinKey = 'classic' | 'cap' | 'glasses' | 'headband' | 'crown' | 'ninja'
export interface Skin { key: SkinKey; label: string; cost: number; desc: string }
export const SKINS: Skin[] = [
  { key: 'classic',  label: 'Waty',          cost: 0,    desc: 'La tenue de tous les jours' },
  { key: 'headband', label: 'Sportif',       cost: 150,  desc: 'Bandeau éponge, prêt pour le cardio' },
  { key: 'cap',      label: 'Casquette',     cost: 300,  desc: 'Visière à l\'envers, style street' },
  { key: 'glasses',  label: 'Lunettes',      cost: 500,  desc: 'Soleil de Marseille' },
  { key: 'ninja',    label: 'Ninja',         cost: 900,  desc: 'Rapide comme une graine' },
  { key: 'crown',    label: 'Couronne',      cost: 1500, desc: 'Pour les champions du Grand Tri' },
]

// ─── Audio synthétisé ────────────────────────────────────────────────────────
type SoundName = 'pop' | 'miss' | 'combo' | 'power' | 'levelup' | 'over' | 'tick' | 'win'

class GameAudioEngine {
  private ctx: AudioContext | null = null
  private muted = false

  constructor() {
    if (typeof window !== 'undefined') {
      try { this.muted = localStorage.getItem('myta_game_mute') === '1' } catch { /* noop */ }
    }
  }
  get isMuted() { return this.muted }
  setMuted(m: boolean) {
    this.muted = m
    try { localStorage.setItem('myta_game_mute', m ? '1' : '0') } catch { /* noop */ }
  }
  /** À appeler sur un geste utilisateur (iOS exige un tap pour démarrer l'audio). */
  unlock() {
    if (typeof window === 'undefined') return
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (this.ctx.state === 'suspended') this.ctx.resume()
    } catch { /* pas d'audio */ }
  }
  private tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, slideTo?: number) {
    if (this.muted || !this.ctx) return
    const c = this.ctx
    const o = c.createOscillator(), g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, c.currentTime)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur)
    g.gain.setValueAtTime(gain, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
    o.connect(g).connect(c.destination)
    o.start(); o.stop(c.currentTime + dur)
  }
  play(name: SoundName, pitch = 1) {
    switch (name) {
      case 'pop':     this.tone(520 * pitch, 0.09, 'triangle', 0.07, 880 * pitch); break
      case 'combo':   this.tone(660 * pitch, 0.12, 'square', 0.05, 1320 * pitch); break
      case 'miss':    this.tone(180, 0.22, 'sawtooth', 0.07, 70); break
      case 'power':   this.tone(440, 0.08, 'triangle', 0.06, 880); setTimeout(() => this.tone(880, 0.14, 'triangle', 0.06, 1320), 70); break
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'triangle', 0.06), i * 60)); break
      case 'over':    [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sine', 0.07), i * 140)); break
      case 'tick':    this.tone(900, 0.04, 'square', 0.03); break
      case 'win':     [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.07), i * 80)); break
    }
  }
}
export const gameAudio = new GameAudioEngine()

// ─── Vibration ───────────────────────────────────────────────────────────────
export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  if (typeof window === 'undefined') return
  try {
    const H = (window as any).Capacitor?.Plugins?.Haptics
    if (H) {
      if (kind === 'success' || kind === 'error') H.notification({ type: kind === 'success' ? 'SUCCESS' : 'ERROR' })
      else H.impact({ style: kind.toUpperCase() })
      return
    }
    const ms = { light: 8, medium: 15, heavy: 30, success: [10, 40, 10], error: [40, 30, 40] }[kind]
    navigator.vibrate?.(ms as any)
  } catch { /* noop */ }
}

// ─── Particules + secousse ───────────────────────────────────────────────────
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number }

export function burst(list: Particle[], x: number, y: number, color: string, n = 10, speed = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random())
    list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 28, max: 28, color, r: 2 + Math.random() * 2.5 })
  }
}
export function stepParticles(list: Particle[]): Particle[] {
  for (const p of list) { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life-- }
  return list.filter(p => p.life > 0)
}
export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  for (const p of list) {
    ctx.globalAlpha = p.life / p.max
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}
/** Décalage de secousse (à appliquer en translate avant de dessiner la scène). */
export function shakeOffset(power: number): [number, number] {
  if (power <= 0) return [0, 0]
  return [(Math.random() - 0.5) * power, (Math.random() - 0.5) * power]
}

// ─── Persistance ─────────────────────────────────────────────────────────────
export interface FinishResult { newRecord: boolean; points: number; streak: number; earned: number }

/** Points gagnés pour une partie : 1 point / 10 de score + bonus défi. */
export function pointsFor(game: GameKey, score: number, defiOk: boolean, reward = 50): number {
  const base = game === 'tri' ? Math.round(score / 10) : game === 'runner' ? Math.round(score / 20) : score * 15
  return Math.max(1, base) + (defiOk ? reward : 0)
}

export async function finishRun(game: GameKey, mode: 'libre' | 'defi', score: number, defiOk: boolean, reward = 50): Promise<FinishResult> {
  const earned = pointsFor(game, score, defiOk, reward)
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('game_finish_run', {
      p_game: game, p_mode: mode, p_score: Math.round(score), p_points: earned, p_defi_ok: defiOk, p_week: weekKey(),
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return { newRecord: !!row?.new_record, points: row?.game_points ?? 0, streak: row?.game_streak ?? 0, earned }
  } catch (e) {
    console.warn('[game] finishRun', e)
    return { newRecord: false, points: 0, streak: 0, earned }
  }
}

export interface LeaderRow { user_id: string; full_name: string | null; best: number; runs: number; me: boolean }

export async function fetchWeekLeaderboard(game: GameKey): Promise<LeaderRow[]> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.rpc('game_week_leaderboard', { p_game: game, p_week: weekKey() })
    if (error) throw error
    return (data ?? []).map((r: any) => ({ user_id: r.user_id, full_name: r.full_name, best: r.best, runs: r.runs, me: r.user_id === user?.id }))
  } catch { return [] }
}

export interface GameMeta { points: number; streak: number; skin: SkinKey; defiDone: Partial<Record<GameKey, boolean>> }

export async function fetchGameMeta(): Promise<GameMeta> {
  const meta: GameMeta = { points: 0, streak: 0, skin: 'classic', defiDone: {} }
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return meta
    const [{ data: p }, { data: runs }] = await Promise.all([
      supabase.from('profiles').select('game_points, game_streak, waty_skin, game_last_day').eq('id', user.id).single(),
      supabase.from('game_runs').select('game_key, defi_ok').eq('user_id', user.id).eq('mode', 'defi').eq('day', todayKey()).eq('defi_ok', true),
    ])
    if (p) {
      meta.points = p.game_points ?? 0
      meta.skin = (p.waty_skin as SkinKey) ?? 'classic'
      // la série tombe à 0 si on n'a pas joué hier ni aujourd'hui
      const last = p.game_last_day as string | null
      const y = new Date(); y.setDate(y.getDate() - 1)
      const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
      meta.streak = last === todayKey() || last === yKey ? (p.game_streak ?? 0) : 0
    }
    for (const r of runs ?? []) meta.defiDone[r.game_key as GameKey] = true
  } catch { /* best effort */ }
  return meta
}

export async function setSkin(skin: SkinKey): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.rpc('game_set_skin', { p_skin: skin })
    return !error
  } catch { return false }
}
