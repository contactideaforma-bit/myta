'use client'

/**
 * 🏃 Waty Runner — mini-jeu Waty (palier 30 jours).
 * Runner infini : Waty court, tape l'écran pour sauter par-dessus la
 * malbouffe. La vitesse augmente avec la distance. Score = mètres parcourus.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Play, RotateCcw, Trophy, Loader2, X } from 'lucide-react'
import { saveBestScore, useGameUnlocks } from '@/lib/games'
import { GameShell, safeTop } from '@/components/ui/GameShell'

type Phase = 'intro' | 'play' | 'over'

// ── Constantes physiques (unités : px, 60 fps de référence) ──────────────────
const GROUND_Y0  = 180   // y du sol par défaut (avant mesure de l'écran)
const WATY_X     = 48    // position horizontale fixe de Waty
const WATY_SIZE  = 44
const GRAVITY    = 0.62
const JUMP_VY    = -11.5
const BASE_SPEED = 3.2   // px/frame au départ
const SPEED_GAIN = 0.00045 // accélération par mètre

const OBSTACLES = ['🍔', '🍩', '🥤', '🍟', '🍕', '🛋️']

interface Obstacle { x: number; emoji: string; size: number }

export default function RunnerGamePage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()

  const [phase, setPhase] = useState<Phase>('intro')
  const [best, setBest]   = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  // Rendu : on ne garde en state que ce qui s'affiche
  const [meters, setMeters]   = useState(0)
  const [watyY, setWatyY]     = useState(GROUND_Y0 - WATY_SIZE)
  const [groundY, setGroundY] = useState(GROUND_Y0)
  const [obs, setObs]         = useState<Obstacle[]>([])

  // ── Refs moteur (pas de re-render pendant la boucle) ──
  const yRef        = useRef(GROUND_Y0 - WATY_SIZE)
  const groundYRef  = useRef(GROUND_Y0)
  const vyRef       = useRef(0)
  const onGroundRef = useRef(true)
  const obsRef      = useRef<Obstacle[]>([])
  const distRef     = useRef(0)
  const nextSpawnRef = useRef(0)
  const rafRef      = useRef<number>(0)
  const runningRef  = useRef(false)
  const worldRef    = useRef<HTMLDivElement | null>(null)
  const worldWRef   = useRef(360) // largeur réelle mesurée au lancement

  useEffect(() => {
    if (bestScores.runner !== undefined) setBest(bestScores.runner)
  }, [bestScores.runner])

  useEffect(() => () => { runningRef.current = false; cancelAnimationFrame(rafRef.current) }, [])

  function jump() {
    if (!runningRef.current) return
    if (onGroundRef.current) {
      vyRef.current = JUMP_VY
      onGroundRef.current = false
    }
  }

  function start() {
    yRef.current = groundYRef.current - WATY_SIZE
    vyRef.current = 0
    onGroundRef.current = true
    obsRef.current = []
    distRef.current = 0
    nextSpawnRef.current = 240
    setMeters(0)
    setObs([])
    setWatyY(groundYRef.current - WATY_SIZE)
    setNewRecord(false)
    setPhase('play')
    runningRef.current = true
    requestAnimationFrame(() => {
      const el = worldRef.current
      worldWRef.current = el?.clientWidth || 360
      // Le sol se cale en bas de l'écran : plus de ciel, même hauteur de saut.
      const g = Math.max(140, (el?.clientHeight || 220) - 46)
      groundYRef.current = g
      setGroundY(g)
      yRef.current = g - WATY_SIZE
      setWatyY(g - WATY_SIZE)
      rafRef.current = requestAnimationFrame(tick)
    })
  }

  function tick() {
    if (!runningRef.current) return

    const speed = BASE_SPEED + distRef.current * SPEED_GAIN
    distRef.current += speed / 10 // ≈ mètres

    // ── Physique Waty ──
    vyRef.current += GRAVITY
    yRef.current += vyRef.current
    if (yRef.current >= groundYRef.current - WATY_SIZE) {
      yRef.current = groundYRef.current - WATY_SIZE
      vyRef.current = 0
      onGroundRef.current = true
    }

    // ── Obstacles ──
    obsRef.current = obsRef.current
      .map(o => ({ ...o, x: o.x - speed }))
      .filter(o => o.x > -50)

    // Spawn : espacement aléatoire qui se resserre avec la vitesse
    nextSpawnRef.current -= speed
    if (nextSpawnRef.current <= 0) {
      const size = 26 + Math.random() * 10
      obsRef.current.push({
        x: worldWRef.current + 20,
        emoji: OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)],
        size,
      })
      const gapMin = Math.max(150, 320 - distRef.current * 0.08)
      nextSpawnRef.current = gapMin + Math.random() * 160
    }

    // ── Collisions (AABB avec marge de tolérance) ──
    const wx1 = WATY_X + 8,          wx2 = WATY_X + WATY_SIZE - 8
    const wy1 = yRef.current + 6,    wy2 = yRef.current + WATY_SIZE - 2
    for (const o of obsRef.current) {
      const ox1 = o.x + 5, ox2 = o.x + o.size - 5
      const oy1 = groundYRef.current - o.size + 4, oy2 = groundYRef.current
      if (wx1 < ox2 && wx2 > ox1 && wy1 < oy2 && wy2 > oy1) {
        gameOver()
        return
      }
    }

    // ── Pousser vers le rendu ──
    setWatyY(yRef.current)
    setObs([...obsRef.current])
    setMeters(Math.floor(distRef.current))

    rafRef.current = requestAnimationFrame(tick)
  }

  function quit() {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    router.push('/games')
  }

  async function gameOver() {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    setPhase('over')
    const finalScore = Math.floor(distRef.current)
    const record = await saveBestScore('runner', finalScore)
    if (record) { setBest(finalScore); setNewRecord(true) }
  }

  // ── Garde-fous ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )
  if (!unlocked('runner')) return (
    <div className="page">
      <div className="card flex flex-col items-center gap-4 py-10 text-center">
        <Lock size={36} className="text-zinc-300" />
        <p className="font-extrabold text-zinc-900">Le boss final des mini-jeux ! 👑</p>
        <p className="text-sm text-zinc-500">Utilise MYTA {30 - daysUsed} jour{30 - daysUsed > 1 ? 's' : ''} de plus pour débloquer Waty Runner ({daysUsed}/30).</p>
        <button onClick={() => router.push('/games')} className="text-sm font-bold text-tta-mid hover:underline">← Retour aux mini-jeux</button>
      </div>
    </div>
  )

  return (
    <GameShell>
      <div className="relative mx-auto h-full w-full max-w-[520px]">

        {/* ── Monde du jeu ── */}
        {phase === 'play' && (
          <div
            ref={worldRef}
            onPointerDown={jump}
            className="absolute inset-0 overflow-hidden cursor-pointer touch-none"
            style={{ background: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 65%, #dcfce7 100%)' }}>

            {/* Décor */}
            <span className="absolute text-3xl" style={{ left: '78%', top: '10%' }}>☀️</span>
            <span className="absolute text-xl opacity-70" style={{ left: '18%', top: '18%' }}>☁️</span>
            <span className="absolute text-lg opacity-60" style={{ left: '55%', top: '28%' }}>☁️</span>

            {/* Sol */}
            <div className="absolute left-0 right-0 bg-emerald-300/70 border-t-2 border-emerald-400"
              style={{ top: groundY, bottom: 0 }} />

            {/* Waty */}
            <img src="/waty-sport.png" alt="Waty"
              className="absolute object-contain drop-shadow-md"
              style={{ left: WATY_X, top: watyY, width: WATY_SIZE, height: WATY_SIZE }} />

            {/* Obstacles */}
            {obs.map((o, i) => (
              <span key={i} className="absolute leading-none"
                style={{ left: o.x, top: groundY - o.size, fontSize: o.size }}>
                {o.emoji}
              </span>
            ))}

            {/* HUD */}
            <div className="absolute inset-x-0 top-0 px-3 flex items-center justify-between gap-2" style={safeTop}>
              <button onPointerDown={e => e.stopPropagation()} onClick={quit}
                className="w-9 h-9 rounded-full bg-white/75 backdrop-blur text-zinc-600 flex items-center justify-center active:scale-95">
                <X size={17} />
              </button>
              <div className="flex items-center gap-2 text-[13px] font-bold">
                <span className="bg-white/75 backdrop-blur rounded-full px-2.5 py-1 text-tta-mid">🏃 {meters} m</span>
                <span className="bg-white/75 backdrop-blur rounded-full px-2.5 py-1 text-zinc-500">🏆 {best} m</span>
              </div>
            </div>

            {meters < 15 && (
              <p className="absolute inset-x-0 text-center text-sm font-bold text-indigo-400 animate-pulse" style={{ top: '42%' }}>
                👆 Tape pour sauter !
              </p>
            )}
          </div>
        )}

        {/* ── Intro / Game over ── */}
        {(phase === 'intro' || phase === 'over') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
               style={{ background: 'linear-gradient(180deg,#e0f2fe 0%,#f0f9ff 60%,#dcfce7 100%)' }}>
            <button onClick={quit}
              className="absolute left-3 flex items-center gap-1 text-sm text-zinc-400 active:text-zinc-600"
              style={{ ...safeTop, top: 0 }}>
              <ArrowLeft size={15} /> Mini-jeux
            </button>

            <img src="/waty-sport.png" alt="Waty" className="w-20 h-20 object-contain" />

            {phase === 'intro' ? (
              <>
                <h1 className="text-2xl font-extrabold text-zinc-900">🏃 Waty Runner</h1>
                <p className="text-sm text-zinc-600 leading-relaxed max-w-xs">
                  Waty court vers ses objectifs ! <span className="font-bold">Tape l&apos;écran pour sauter</span> par-dessus
                  la malbouffe. Ça va de plus en plus vite… jusqu&apos;où iras-tu ?
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold text-zinc-900">
                  {newRecord ? '🏆 NOUVEAU RECORD !' : 'Aïe, un obstacle ! 💥'}
                </h1>
                <p className="text-5xl font-black text-tta-mid">{meters} <span className="text-sm text-zinc-400 font-semibold">m</span></p>
                {!newRecord && best > 0 && <p className="text-xs text-zinc-400">Record : {best} m</p>}
              </>
            )}

            <button onClick={start}
              className="flex items-center gap-2 px-9 py-3.5 rounded-2xl text-white font-bold shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              {phase === 'intro' ? <><Play size={16} fill="currentColor" /> Jouer</> : <><RotateCcw size={16} /> Rejouer</>}
            </button>

            <p className="flex items-center gap-1 text-xs text-zinc-400"><Trophy size={12} /> Record : {best} m</p>
          </div>
        )}
      </div>
    </GameShell>
  )
}
