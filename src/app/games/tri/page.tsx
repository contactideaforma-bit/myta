'use client'

/**
 * Le Grand Tri v2 — jeu d'arcade (palier 14 jours).
 * Les aliments tombent : déplace Waty au doigt pour ATTRAPER les sains et
 * ÉVITER la malbouffe.
 *
 * v2 (27/10/2026) : sprites vectoriels, défi du jour (60 s, même graine pour
 * tous, objectif fixe), partie libre, combos avec multiplicateur, power-ups
 * (aimant, ralenti, ×2, cœur), esquives, niveaux, sons synthétisés, vibration,
 * secousse d'écran, particules, rejouer instantané, points Waty et tenues,
 * classement amis de la semaine.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveBestScore, useGameUnlocks } from '@/lib/games'
import { GameShell, safeTop, safeBottom } from '@/components/ui/GameShell'
import { MytaIcon } from '@/components/ui/MytaIcon'
import { SpriteSvg } from '@/components/ui/SpriteSvg'
import {
  HEALTHY, JUNK, POWER, HEALTHY_KEYS, JUNK_KEYS, watySprite, drawSprite, type Sprite,
} from '@/lib/game-sprites'
import {
  seededRandom, getDailyChallenge, gameAudio, haptic, burst, stepParticles, drawParticles, shakeOffset,
  finishRun, fetchWeekLeaderboard, fetchGameMeta, type Particle, type LeaderRow, type SkinKey, type DailyChallenge,
} from '@/lib/game-engine'

type Phase = 'intro' | 'play' | 'over'
type Mode  = 'libre' | 'defi'
type PowerKind = 'aimant' | 'ralenti' | 'double' | 'coeur'

const WATY_SIZE  = 62
const FLOOR_PAD  = 16
const BASE_FALL  = 2.2
const BASE_SPAWN = 48
const MAX_LIVES  = 4
const DEFI_SECONDS = 60

interface Item { x: number; y: number; vy: number; sprite: Sprite; kind: 'sain' | 'junk' | 'power'; power?: PowerKind; rot: number; vr: number; near?: boolean }
interface Pop  { x: number; y: number; text: string; color: string; life: number; big?: boolean }

export default function TriGamePage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()

  const [phase, setPhase]     = useState<Phase>('intro')
  const [mode, setMode]       = useState<Mode>('defi')
  const [score, setScore]     = useState(0)
  const [lives, setLives]     = useState(3)
  const [combo, setCombo]     = useState(0)
  const [mult, setMult]       = useState(1)
  const [level, setLevel]     = useState(1)
  const [timeLeft, setTimeLeft] = useState(DEFI_SECONDS)
  const [best, setBest]       = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [muted, setMuted]     = useState(gameAudio.isMuted)
  const [skin, setSkin]       = useState<SkinKey>('classic')
  const [defi, setDefi]       = useState<DailyChallenge>(() => getDailyChallenge('tri'))
  const [defiDone, setDefiDone] = useState(false)
  const [activePower, setActivePower] = useState<{ kind: PowerKind; until: number } | null>(null)
  const [result, setResult]   = useState<{ earned: number; points: number; streak: number; defiOk: boolean } | null>(null)
  const [board, setBoard]     = useState<LeaderRow[] | null>(null)
  const [banner, setBanner]   = useState<string | null>(null)

  // ── Moteur ──
  const canvasRef  = useRef<HTMLCanvasElement | null>(null)
  const rafRef     = useRef(0)
  const runningRef = useRef(false)
  const phaseRef   = useRef<Phase>('intro')
  const modeRef    = useRef<Mode>('defi')
  const rngRef     = useRef<() => number>(Math.random)

  const watyXRef   = useRef(150)
  const targetXRef = useRef(150)
  const itemsRef   = useRef<Item[]>([])
  const popsRef    = useRef<Pop[]>([])
  const partsRef   = useRef<Particle[]>([])
  const scoreRef   = useRef(0)
  const livesRef   = useRef(3)
  const comboRef   = useRef(0)
  const spawnRef   = useRef(0)
  const tRef       = useRef(0)            // frames
  const startRef   = useRef(0)            // timestamp ms
  const flashRef   = useRef(0)
  const shakeRef   = useRef(0)
  const faceRef    = useRef<{ face: 'ok' | 'ouch' | 'wow'; until: number }>({ face: 'ok', until: 0 })
  const powerRef   = useRef<{ kind: PowerKind; until: number } | null>(null)
  const levelRef   = useRef(1)
  const lastTickRef = useRef(0)
  const skinRef    = useRef<SkinKey>('classic')
  const bestRef    = useRef(0)
  const keysRef    = useRef({ left: false, right: false })

  useEffect(() => { if (bestScores.tri !== undefined) { setBest(bestScores.tri); bestRef.current = bestScores.tri } }, [bestScores.tri])
  useEffect(() => {
    fetchGameMeta().then(m => { setSkin(m.skin); skinRef.current = m.skin; setDefiDone(!!m.defiDone.tri) })
    const down = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') keysRef.current.left = true; if (e.key === 'ArrowRight') keysRef.current.right = true }
    const up   = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') keysRef.current.left = false; if (e.key === 'ArrowRight') keysRef.current.right = false }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up)
      runningRef.current = false; cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function setPhaseBoth(p: Phase) { phaseRef.current = p; setPhase(p) }
  function showBanner(text: string) { setBanner(text); setTimeout(() => setBanner(null), 1100) }

  // ── Démarrage ──────────────────────────────────────────────────────────────
  function startGame(m: Mode) {
    gameAudio.unlock()
    haptic('light')
    modeRef.current = m; setMode(m)
    rngRef.current = m === 'defi' ? seededRandom(defi.seed) : Math.random
    const canvas = canvasRef.current
    const w = canvas ? canvas.clientWidth : 300
    watyXRef.current = w / 2; targetXRef.current = w / 2
    itemsRef.current = []; popsRef.current = []; partsRef.current = []
    scoreRef.current = 0; livesRef.current = 3; comboRef.current = 0
    spawnRef.current = 30; tRef.current = 0; startRef.current = performance.now()
    flashRef.current = 0; shakeRef.current = 0; powerRef.current = null; levelRef.current = 1; lastTickRef.current = DEFI_SECONDS
    setScore(0); setLives(3); setCombo(0); setMult(1); setLevel(1); setTimeLeft(DEFI_SECONDS)
    setNewRecord(false); setResult(null); setBoard(null); setActivePower(null)
    setPhaseBoth('play')
    if (!runningRef.current) { runningRef.current = true; rafRef.current = requestAnimationFrame(loop) }
  }

  function quit() {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    router.push('/games')
  }

  async function endGame(reason: 'lives' | 'time') {
    setPhaseBoth('over')
    gameAudio.play(reason === 'time' ? 'win' : 'over')
    haptic(reason === 'time' ? 'success' : 'error')
    const sc = scoreRef.current
    const m = modeRef.current
    const ok = m === 'defi' && sc >= defi.target
    // Record local (compat) + RPC v2 (parties, points, série)
    const [, res] = await Promise.all([saveBestScore('tri', sc), finishRun('tri', m, sc, ok, defi.reward)])
    const prevBest = bestRef.current
    if (sc > prevBest) { bestRef.current = sc; setBest(sc); setNewRecord(true) }
    setResult({ earned: res.earned, points: res.points, streak: res.streak, defiOk: ok })
    if (ok) setDefiDone(true)
    fetchWeekLeaderboard('tri').then(setBoard)
  }

  // ── Boucle ────────────────────────────────────────────────────────────────
  function loop() {
    if (!runningRef.current) return
    if (phaseRef.current === 'play') update()
    draw()
    rafRef.current = requestAnimationFrame(loop)
  }

  function elapsedSec() { return (performance.now() - startRef.current) / 1000 }

  function givePower(kind: PowerKind, x: number, y: number) {
    gameAudio.play('power'); haptic('medium')
    faceRef.current = { face: 'wow', until: tRef.current + 40 }
    burst(partsRef.current, x, y, '#A855F7', 16, 4)
    if (kind === 'coeur') {
      if (livesRef.current < MAX_LIVES) { livesRef.current += 1; setLives(livesRef.current) }
      popsRef.current.push({ x, y, text: '+1 vie', color: '#F43F5E', life: 50, big: true })
      return
    }
    const dur = kind === 'aimant' ? 6 : kind === 'ralenti' ? 5 : 8
    powerRef.current = { kind, until: performance.now() + dur * 1000 }
    setActivePower({ kind, until: powerRef.current.until })
    popsRef.current.push({ x, y, text: kind === 'aimant' ? 'Aimant !' : kind === 'ralenti' ? 'Ralenti !' : 'Score ×2 !', color: '#7C3AED', life: 50, big: true })
  }

  function update() {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.clientWidth, VIEW_H = canvas.clientHeight
    const t = ++tRef.current
    const rng = rngRef.current
    const sec = elapsedSec()

    // power-up expiré ?
    if (powerRef.current && performance.now() > powerRef.current.until) { powerRef.current = null; setActivePower(null) }
    const pw = powerRef.current?.kind ?? null

    // ── Défi : chrono ──
    if (modeRef.current === 'defi') {
      const left = Math.max(0, Math.ceil(DEFI_SECONDS - sec))
      if (left !== lastTickRef.current) {
        lastTickRef.current = left; setTimeLeft(left)
        if (left <= 5 && left > 0) gameAudio.play('tick')
      }
      if (sec >= DEFI_SECONDS) { endGame('time'); return }
    }

    // ── Niveau : toutes les 20 s ──
    const lvl = 1 + Math.floor(sec / 20)
    if (lvl !== levelRef.current) {
      levelRef.current = lvl; setLevel(lvl)
      gameAudio.play('levelup'); haptic('medium'); showBanner(`Niveau ${lvl}`)
    }

    // ── Waty suit le doigt ──
    if (keysRef.current.left)  targetXRef.current -= 7
    if (keysRef.current.right) targetXRef.current += 7
    targetXRef.current = Math.max(WATY_SIZE / 2, Math.min(w - WATY_SIZE / 2, targetXRef.current))
    watyXRef.current += (targetXRef.current - watyXRef.current) * 0.4

    // ── Difficulté ──
    const slow = pw === 'ralenti' ? 0.55 : 1
    const fallSpeed = (BASE_FALL + sec * 0.075) * slow
    const spawnEvery = Math.max(16, BASE_SPAWN - Math.floor(sec / 6) * 4)

    // ── Spawn ──
    if (--spawnRef.current <= 0) {
      spawnRef.current = spawnEvery
      const roll = rng()
      const isPower = sec > 8 && roll < 0.05
      if (isPower) {
        const kinds: PowerKind[] = livesRef.current < 3 ? ['aimant', 'ralenti', 'double', 'coeur'] : ['aimant', 'ralenti', 'double']
        const kind = kinds[Math.floor(rng() * kinds.length)]
        itemsRef.current.push({ x: 30 + rng() * (w - 60), y: -34, vy: fallSpeed * 0.9, sprite: POWER[kind], kind: 'power', power: kind, rot: 0, vr: 0.03 })
      } else {
        const junkRate = Math.min(0.5, 0.34 + sec * 0.004)
        const sain = roll >= junkRate
        const key = sain ? HEALTHY_KEYS[Math.floor(rng() * HEALTHY_KEYS.length)] : JUNK_KEYS[Math.floor(rng() * JUNK_KEYS.length)]
        itemsRef.current.push({
          x: 28 + rng() * (w - 56), y: -34,
          vy: fallSpeed * (0.85 + rng() * 0.5),
          sprite: sain ? HEALTHY[key] : JUNK[key], kind: sain ? 'sain' : 'junk',
          rot: rng() * Math.PI, vr: (rng() - 0.5) * 0.07,
        })
      }
    }

    // ── Chute + collisions ──
    const watyTop = VIEW_H - FLOOR_PAD - WATY_SIZE
    const watyCx  = watyXRef.current
    const halfW   = WATY_SIZE / 2
    const kept: Item[] = []
    const multiplier = 1 + Math.min(4, Math.floor(comboRef.current / 5))
    const dbl = pw === 'double' ? 2 : 1

    for (const it of itemsRef.current) {
      // aimant : les sains dérivent vers Waty
      if (pw === 'aimant' && it.kind === 'sain' && it.y > VIEW_H * 0.35) it.x += (watyCx - it.x) * 0.08
      it.y += it.vy
      it.rot += it.vr

      const inY = it.y + 16 >= watyTop && it.y - 8 <= watyTop + WATY_SIZE * 0.75
      const dx  = Math.abs(it.x - watyCx)
      const caught = inY && dx <= halfW + 6

      if (caught) {
        if (it.kind === 'power' && it.power) { givePower(it.power, it.x, watyTop - 10); continue }
        if (it.kind === 'sain') {
          comboRef.current += 1
          const gain = 10 * multiplier * dbl
          scoreRef.current += gain
          const m2 = 1 + Math.min(4, Math.floor(comboRef.current / 5))
          if (m2 !== multiplier) { gameAudio.play('combo', 1 + m2 * 0.15); haptic('medium'); showBanner(`Combo ×${m2}`) }
          else { gameAudio.play('pop', 1 + Math.min(10, comboRef.current) * 0.04); haptic('light') }
          burst(partsRef.current, it.x, watyTop, '#22C55E', 8, 3)
          popsRef.current.push({ x: it.x, y: watyTop - 10, text: `+${gain}`, color: '#15803D', life: 40 })
          setMult(m2)
        } else {
          livesRef.current -= 1
          comboRef.current = 0
          flashRef.current = 16; shakeRef.current = 12
          faceRef.current = { face: 'ouch', until: t + 30 }
          gameAudio.play('miss'); haptic('error')
          burst(partsRef.current, it.x, watyTop, '#F43F5E', 12, 4)
          popsRef.current.push({ x: it.x, y: watyTop - 10, text: '-1 vie', color: '#DC2626', life: 45, big: true })
          setMult(1)
        }
        setScore(scoreRef.current); setLives(livesRef.current); setCombo(comboRef.current)
        if (livesRef.current <= 0) { endGame('lives'); return }
        continue
      }

      // Esquive de justesse : malbouffe qui passe à côté de Waty
      if (it.kind === 'junk' && !it.near && inY && dx > halfW + 6 && dx < halfW + 26) {
        it.near = true
        scoreRef.current += 5 * dbl
        popsRef.current.push({ x: it.x, y: watyTop - 4, text: 'esquive +5', color: '#0E7490', life: 36 })
        setScore(scoreRef.current)
      }

      // Au sol
      if (it.y > VIEW_H + 20) {
        if (it.kind === 'sain' && comboRef.current > 0) { comboRef.current = 0; setCombo(0); setMult(1) }
        continue
      }
      kept.push(it)
    }
    itemsRef.current = kept

    popsRef.current = popsRef.current.filter(p => (p.life -= 1) > 0)
    partsRef.current = stepParticles(partsRef.current)
    if (flashRef.current > 0) flashRef.current -= 1
    if (shakeRef.current > 0) shakeRef.current -= 1
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const t = tRef.current
    const pw = powerRef.current?.kind ?? null

    // Ciel (teinte selon le power-up / le combo)
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    if (pw === 'double')       { bg.addColorStop(0, '#EDE9FE'); bg.addColorStop(1, '#F5F3FF') }
    else if (pw === 'ralenti') { bg.addColorStop(0, '#E0F2FE'); bg.addColorStop(1, '#F0F9FF') }
    else if (comboRef.current >= 10) { bg.addColorStop(0, '#FEF3C7'); bg.addColorStop(1, '#F0FDF4') }
    else { bg.addColorStop(0, '#E0F2FE'); bg.addColorStop(0.7, '#F0FDF4'); bg.addColorStop(1, '#DCFCE7') }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

    const [sx, sy] = shakeOffset(shakeRef.current)
    ctx.save(); ctx.translate(sx, sy)

    // Nuages vectoriels
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    const cloud = (cx: number, cy: number, s: number) => {
      ctx.beginPath()
      ctx.ellipse(cx, cy, 26 * s, 12 * s, 0, 0, Math.PI * 2)
      ctx.ellipse(cx - 12 * s, cy + 2 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 14 * s, cy + 2 * s, 16 * s, 11 * s, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    cloud(((t * 0.3) % (w + 100)) - 50, 52, 1)
    cloud(((t * 0.18 + 200) % (w + 100)) - 50, 96, 0.75)

    // Sol
    ctx.fillStyle = '#86EFAC'; ctx.fillRect(0, h - FLOOR_PAD, w, FLOOR_PAD)
    ctx.fillStyle = '#4ADE80'; ctx.fillRect(0, h - FLOOR_PAD, w, 3)

    // Aimant : halo autour de Waty
    const watyTop = h - FLOOR_PAD - WATY_SIZE
    if (pw === 'aimant') {
      ctx.strokeStyle = 'rgba(239,68,68,0.35)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(watyXRef.current, watyTop + WATY_SIZE / 2, 60 + Math.sin(t / 5) * 4, 0, Math.PI * 2); ctx.stroke()
    }

    // Aliments
    for (const it of itemsRef.current) drawSprite(ctx, it.sprite, it.x, it.y, it.kind === 'power' ? 40 : 36, it.rot)

    // Waty
    const face = t < faceRef.current.until ? faceRef.current.face : 'ok'
    const lean = Math.sin(t / 6) * 0.07 * Math.min(1, Math.abs(targetXRef.current - watyXRef.current) / 8)
    const squash = face === 'ouch' ? 0.92 : 1
    ctx.save()
    ctx.translate(watyXRef.current, watyTop + WATY_SIZE / 2)
    ctx.rotate(lean); ctx.scale(1 / squash, squash)
    drawSprite(ctx, watySprite(skinRef.current, face), 0, 0, WATY_SIZE)
    ctx.restore()

    drawParticles(ctx, partsRef.current)

    // Popups
    for (const p of popsRef.current) {
      ctx.globalAlpha = Math.min(1, p.life / 20)
      ctx.font = `800 ${p.big ? 20 : 16}px Manrope, system-ui, sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      const yy = p.y - (45 - p.life) * 0.9
      ctx.strokeText(p.text, p.x, yy)
      ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, yy)
      ctx.globalAlpha = 1
    }
    ctx.restore()

    if (flashRef.current > 0) { ctx.fillStyle = `rgba(244,63,94,${flashRef.current / 45})`; ctx.fillRect(0, 0, w, h) }
  }

  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    targetXRef.current = e.clientX - rect.left
  }

  function toggleMute() { const m = !muted; gameAudio.setMuted(m); setMuted(m) }

  async function share() {
    const text = mode === 'defi'
      ? `Le Grand Tri · défi du jour : ${score} points (objectif ${defi.target}) sur MYTA. Tu fais mieux ?`
      : `Le Grand Tri : ${score} points sur MYTA. Tu fais mieux ?`
    try {
      if (navigator.share) await navigator.share({ text, url: 'https://mytwinapp.fr' })
      else { await navigator.clipboard.writeText(`${text} https://mytwinapp.fr`); showBanner('Copié') }
    } catch { /* annulé */ }
  }

  // ── Garde-fous ────────────────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-nutri/30 border-t-nutri rounded-full animate-spin" /></div>
  if (!unlocked('tri')) return (
    <div className="page">
      <div className="card flex flex-col items-center gap-4 py-10 text-center">
        <SpriteSvg sprite={watySprite('classic', 'ouch')} size={64} />
        <p className="font-extrabold t-text">Encore un peu de patience</p>
        <p className="text-sm t-muted">Utilise MYTA {14 - daysUsed} jour{14 - daysUsed > 1 ? 's' : ''} de plus pour débloquer Le Grand Tri ({daysUsed}/14).</p>
        <button onClick={() => router.push('/games')} className="text-sm font-bold text-tta-mid">Retour aux mini-jeux</button>
      </div>
    </div>
  )

  const heart = (filled: boolean, i: number) => (
    <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21S3 15 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12-9 12z" fill={filled ? '#F43F5E' : 'rgba(255,255,255,0.35)'} />
    </svg>
  )

  return (
    <GameShell>
      <div className="relative mx-auto h-full w-full max-w-[520px]">

        {phase === 'play' && (
          <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-pointer" onPointerMove={pointerMove} onPointerDown={pointerMove} />

            {/* HUD */}
            <div className="absolute inset-x-0 top-0 px-3 flex items-center justify-between gap-2" style={safeTop}>
              <button onClick={quit} aria-label="Quitter" className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center active:scale-95">
                <MytaIcon name="close" size={16} />
              </button>
              <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-white">
                <span className="bg-black/35 backdrop-blur rounded-full px-3 py-1 tabular-nums">{score}</span>
                {mult > 1 && <span className="bg-orange-500 rounded-full px-2.5 py-1">×{mult}</span>}
                <span className="bg-black/35 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-0.5">
                  {Array.from({ length: Math.max(3, lives) }, (_, i) => heart(i < lives, i))}
                </span>
                <span className="bg-black/35 backdrop-blur rounded-full px-2.5 py-1 tabular-nums">
                  {mode === 'defi' ? `${timeLeft}s` : `N${level}`}
                </span>
              </div>
            </div>

            {/* Défi : objectif */}
            {mode === 'defi' && (
              <div className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold text-white/90 bg-black/30 backdrop-blur rounded-full px-3 py-1" style={{ top: 'calc(max(env(safe-area-inset-top), 10px) + 44px)' }}>
                Objectif {defi.target} · {score >= defi.target ? 'atteint' : `encore ${defi.target - score}`}
              </div>
            )}

            {/* Power-up actif */}
            {activePower && (
              <div className="absolute right-3 bottom-24 bg-violet-600 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <SpriteSvg sprite={POWER[activePower.kind]} size={16} />
                {activePower.kind === 'aimant' ? 'Aimant' : activePower.kind === 'ralenti' ? 'Ralenti' : '×2'}
              </div>
            )}

            {banner && (
              <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 text-3xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] animate-myta-fadeup pointer-events-none" style={{ WebkitTextStroke: '1px rgba(0,0,0,0.15)' }}>
                {banner}
              </div>
            )}
          </>
        )}

        {/* ── Intro / Fin ── */}
        {(phase === 'intro' || phase === 'over') && (
          <div className="absolute inset-0 overflow-y-auto" style={{ background: 'linear-gradient(180deg,#E0F2FE 0%,#F0FDF4 65%,#DCFCE7 100%)' }}>
            <div className="min-h-full flex flex-col items-center gap-4 px-5 pb-8 text-center" style={safeTop}>
              <div className="w-full flex items-center justify-between pt-1">
                <button onClick={quit} className="flex items-center gap-1 text-sm font-bold text-zinc-500 active:text-zinc-700"><MytaIcon name="back" size={15} /> Mini-jeux</button>
                <button onClick={toggleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'} className="w-9 h-9 rounded-full bg-white/70 text-zinc-600 flex items-center justify-center">
                  <MytaIcon name={muted ? 'mute' : 'sound'} size={16} />
                </button>
              </div>

              <SpriteSvg sprite={watySprite(skin, phase === 'over' && lives <= 0 ? 'ouch' : 'wow')} size={92} />

              {phase === 'intro' ? (
                <>
                  <h1 className="text-2xl font-extrabold text-zinc-900">Le Grand Tri</h1>
                  <p className="text-sm text-zinc-600 leading-relaxed max-w-xs">
                    Glisse ton doigt pour déplacer Waty. Attrape les aliments <b className="text-green-700">sains</b>, évite la <b className="text-pink-600">malbouffe</b>.
                    Enchaîne les prises pour faire monter le multiplicateur, attrape les power-ups.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {[HEALTHY.pomme, HEALTHY.brocoli, HEALTHY.poisson].map((s, i) => <SpriteSvg key={i} sprite={s} size={30} />)}
                    <span className="text-zinc-300 mx-1">vs</span>
                    {[JUNK.donut, JUNK.frites, JUNK.soda].map((s, i) => <SpriteSvg key={i} sprite={s} size={30} />)}
                  </div>

                  {/* Défi du jour */}
                  <button onClick={() => startGame('defi')}
                    className="w-full max-w-xs rounded-3xl p-4 text-left text-white shadow-lg active:scale-[0.98] transition-transform"
                    style={{ background: 'linear-gradient(135deg,#2D2A5E,#4B47A0 60%,#5C60C0)' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">Défi du jour · 60 s</p>
                      {defiDone && <span className="text-[11px] font-extrabold bg-white/20 rounded-full px-2 py-0.5 flex items-center gap-1"><MytaIcon name="check" size={11} />réussi</span>}
                    </div>
                    <p className="text-lg font-extrabold mt-0.5">Atteins {defi.target} points</p>
                    <p className="text-xs opacity-85 mt-0.5">Même partie pour tout le monde aujourd'hui · +{defi.reward} points Waty si réussi</p>
                  </button>

                  <button onClick={() => startGame('libre')}
                    className="w-full max-w-xs rounded-3xl p-4 bg-white/80 text-left shadow-sm active:scale-[0.98] transition-transform">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Partie libre</p>
                    <p className="text-base font-extrabold text-zinc-900 mt-0.5">Jusqu'à la dernière vie</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Record : <b>{best}</b> points</p>
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-extrabold text-zinc-900">
                    {newRecord ? 'Nouveau record' : mode === 'defi' ? (result?.defiOk ? 'Défi réussi' : 'Temps écoulé') : 'Plus de vies'}
                  </h1>
                  <p className="text-6xl font-black text-green-600 tabular-nums leading-none">{score}</p>
                  {mode === 'defi' && <p className="text-sm font-bold text-zinc-600">Objectif {defi.target} · {result?.defiOk ? 'atteint' : `il manquait ${Math.max(0, defi.target - score)}`}</p>}
                  {!newRecord && best > 0 && <p className="text-xs text-zinc-400">Record : {best} points</p>}

                  {result && (
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="bg-white/80 rounded-full px-3 py-1.5 text-tta-mid">+{result.earned} points Waty</span>
                      {result.streak > 1 && <span className="bg-orange-50 text-orange-700 rounded-full px-3 py-1.5 flex items-center gap-1"><MytaIcon name="flame" size={12} />{result.streak} jours de jeu</span>}
                    </div>
                  )}

                  <div className="flex gap-2 w-full max-w-xs">
                    <button onClick={() => startGame(mode)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-extrabold shadow-lg active:scale-[0.98] transition-transform"
                      style={{ background: 'linear-gradient(90deg, #16A34A, #2BA8B0)' }}>
                      <MytaIcon name="history" size={16} /> Rejouer
                    </button>
                    <button onClick={share} aria-label="Partager" className="w-12 rounded-2xl bg-white/80 text-zinc-700 flex items-center justify-center active:scale-95"><MytaIcon name="share" size={18} /></button>
                  </div>
                  <button onClick={() => startGame(mode === 'defi' ? 'libre' : 'defi')} className="text-xs font-bold text-tta-mid">
                    {mode === 'defi' ? 'Passer en partie libre' : 'Tenter le défi du jour'}
                  </button>

                  {/* Classement amis de la semaine */}
                  <div className="w-full max-w-xs bg-white/80 rounded-3xl p-4 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Cette semaine · amis</p>
                    {board === null ? (
                      <p className="text-xs text-zinc-400">Chargement…</p>
                    ) : board.length <= 1 ? (
                      <p className="text-xs text-zinc-500">Rejoins un groupe dans Amis pour comparer vos scores.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {board.slice(0, 5).map((r, i) => (
                          <div key={r.user_id} className={`flex items-center gap-2 text-sm rounded-xl px-2 py-1 ${r.me ? 'bg-tta-light font-extrabold text-tta-mid' : 'text-zinc-700'}`}>
                            <span className="w-5 text-xs font-bold text-zinc-400">{i + 1}</span>
                            <span className="flex-1 truncate">{r.me ? 'Toi' : (r.full_name?.split(' ')[0] ?? 'Ami')}</span>
                            <span className="tabular-nums font-bold">{r.best}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              <div style={safeBottom} />
            </div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
