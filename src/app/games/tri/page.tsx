'use client'

/**
 * 🥗 Le Grand Tri — jeu d'arcade (palier 14 jours).
 * Les aliments tombent du ciel : déplace Waty au doigt (ou aux flèches)
 * pour ATTRAPER les aliments sains et ÉVITER la malbouffe.
 * 3 vies, combos, ça va de plus en plus vite !
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Play, RotateCcw, Trophy, Loader2, X } from 'lucide-react'
import { saveBestScore, useGameUnlocks } from '@/lib/games'
import { GameShell, safeTop } from '@/components/ui/GameShell'

type Phase = 'intro' | 'play' | 'over'

const WATY_W     = 58
const WATY_H     = 58
const FLOOR_PAD  = 14          // marge sous Waty
const BASE_FALL  = 2.1         // vitesse de chute de départ
const BASE_SPAWN = 52          // frames entre 2 spawns au départ

const SAIN = ['🥦', '🍎', '🥕', '🐟', '🥑', '🍌', '🥬', '🍓', '🍳', '🥜', '🍅', '🫐', '🍊', '🥒', '🍇', '🍉', '🥗', '🍋']
const JUNK = ['🍩', '🍟', '🍔', '🥤', '🍕', '🍫', '🌭', '🍰', '🍪', '🧁', '🍭', '🍦', '🍬', '🥐', '🍺', '🧋']

interface Item { x: number; y: number; vy: number; emoji: string; sain: boolean; rot: number; vr: number }
interface Pop  { x: number; y: number; text: string; color: string; life: number }

export default function TriGamePage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()

  const [phase, setPhase]   = useState<Phase>('intro')
  const [score, setScore]   = useState(0)
  const [lives, setLives]   = useState(3)
  const [combo, setCombo]   = useState(0)
  const [best, setBest]     = useState(0)
  const [newRecord, setNewRecord] = useState(false)

  // ── Moteur ──
  const canvasRef  = useRef<HTMLCanvasElement | null>(null)
  const rafRef     = useRef(0)
  const runningRef = useRef(false)
  const phaseRef   = useRef<Phase>('intro')

  const watyXRef   = useRef(150)      // centre de Waty
  const targetXRef = useRef(150)
  const itemsRef   = useRef<Item[]>([])
  const popsRef    = useRef<Pop[]>([])
  const scoreRef   = useRef(0)
  const livesRef   = useRef(3)
  const comboRef   = useRef(0)
  const spawnRef   = useRef(0)
  const tRef       = useRef(0)
  const flashRef   = useRef(0)        // flash rouge quand malbouffe attrapée

  const keysRef    = useRef({ left: false, right: false })
  const watyImgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (bestScores.tri !== undefined) setBest(bestScores.tri)
  }, [bestScores.tri])

  useEffect(() => {
    const img = new Image()
    img.src = '/waty-nutrition.png'
    watyImgRef.current = img

    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  keysRef.current.left = true
      if (e.key === 'ArrowRight') keysRef.current.right = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  keysRef.current.left = false
      if (e.key === 'ArrowRight') keysRef.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function setPhaseBoth(p: Phase) { phaseRef.current = p; setPhase(p) }

  function startGame() {
    const canvas = canvasRef.current
    const w = canvas ? canvas.clientWidth : 300
    watyXRef.current = w / 2
    targetXRef.current = w / 2
    itemsRef.current = []
    popsRef.current = []
    scoreRef.current = 0
    livesRef.current = 3
    comboRef.current = 0
    spawnRef.current = 20
    tRef.current = 0
    setScore(0); setLives(3); setCombo(0); setNewRecord(false)
    setPhaseBoth('play')
    if (!runningRef.current) {
      runningRef.current = true
      rafRef.current = requestAnimationFrame(loop)
    }
  }

  function quit() {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    router.push('/games')
  }

  async function endGame() {
    setPhaseBoth('over')
    const record = await saveBestScore('tri', scoreRef.current)
    if (record) { setBest(scoreRef.current); setNewRecord(true) }
  }

  function loop() {
    if (!runningRef.current) return
    if (phaseRef.current === 'play') update()
    draw()
    rafRef.current = requestAnimationFrame(loop)
  }

  function update() {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.clientWidth
    const VIEW_H = canvas.clientHeight
    const t = ++tRef.current

    // ── Déplacement de Waty (suit le doigt / flèches) ──
    if (keysRef.current.left)  targetXRef.current -= 6.5
    if (keysRef.current.right) targetXRef.current += 6.5
    targetXRef.current = Math.max(WATY_W / 2, Math.min(w - WATY_W / 2, targetXRef.current))
    // lissage
    watyXRef.current += (targetXRef.current - watyXRef.current) * 0.35

    // ── Difficulté progressive ──
    const fallSpeed = BASE_FALL + t * 0.0016
    const spawnEvery = Math.max(22, BASE_SPAWN - Math.floor(t / 180) * 4)

    // ── Spawn ──
    if (--spawnRef.current <= 0) {
      spawnRef.current = spawnEvery
      const sain = Math.random() < 0.62
      const pool = sain ? SAIN : JUNK
      itemsRef.current.push({
        x: 26 + Math.random() * (w - 52),
        y: -30,
        vy: fallSpeed * (0.85 + Math.random() * 0.5),
        emoji: pool[Math.floor(Math.random() * pool.length)],
        sain,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.08,
      })
    }

    // ── Chute + collisions ──
    const watyTop  = VIEW_H - FLOOR_PAD - WATY_H
    const watyL    = watyXRef.current - WATY_W / 2
    const watyR    = watyXRef.current + WATY_W / 2
    const kept: Item[] = []

    for (const it of itemsRef.current) {
      it.y += it.vy
      it.rot += it.vr

      // Attrapé ? (zone = tête/bras de Waty)
      const caught = it.y + 14 >= watyTop && it.y - 6 <= watyTop + WATY_H * 0.7 &&
                     it.x >= watyL - 8 && it.x <= watyR + 8

      if (caught) {
        if (it.sain) {
          comboRef.current += 1
          const bonus = comboRef.current % 5 === 0 ? 15 : 0
          scoreRef.current += 10 + bonus
          popsRef.current.push({ x: it.x, y: watyTop - 8, text: bonus ? `+${10 + bonus} 🔥` : '+10', color: '#16a34a', life: 40 })
        } else {
          livesRef.current -= 1
          comboRef.current = 0
          flashRef.current = 14
          popsRef.current.push({ x: it.x, y: watyTop - 8, text: '💔', color: '#dc2626', life: 40 })
        }
        setScore(scoreRef.current); setLives(livesRef.current); setCombo(comboRef.current)
        if (livesRef.current <= 0) { endGame(); return }
        continue
      }

      // Raté (au sol)
      if (it.y > VIEW_H + 20) {
        if (it.sain && comboRef.current > 0) { comboRef.current = 0; setCombo(0) }
        continue
      }
      kept.push(it)
    }
    itemsRef.current = kept

    // Popups
    popsRef.current = popsRef.current.filter(p => (p.life -= 1) > 0)
    if (flashRef.current > 0) flashRef.current -= 1
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const t = tRef.current

    // Ciel
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#e0f2fe'); bg.addColorStop(0.7, '#f0fdf4'); bg.addColorStop(1, '#dcfce7')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // Nuages
    ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.globalAlpha = 0.7
    ctx.fillText('☁️', ((t * 0.3) % (w + 80)) - 40, 46)
    ctx.fillText('☁️', ((t * 0.18 + 180) % (w + 80)) - 40, 90)
    ctx.globalAlpha = 1

    // Sol herbe
    ctx.fillStyle = '#86efac'
    ctx.fillRect(0, h - FLOOR_PAD, w, FLOOR_PAD)
    ctx.fillStyle = '#4ade80'
    ctx.fillRect(0, h - FLOOR_PAD, w, 3)

    // Aliments
    for (const it of itemsRef.current) {
      ctx.save()
      ctx.translate(it.x, it.y)
      ctx.rotate(it.rot)
      ctx.font = '30px serif'
      ctx.fillText(it.emoji, 0, 0)
      ctx.restore()
    }

    // Waty
    const watyTop = h - FLOOR_PAD - WATY_H
    const img = watyImgRef.current
    if (img && img.complete) {
      // petit balancement de course
      const lean = Math.sin(t / 6) * 0.06 * Math.min(1, Math.abs(targetXRef.current - watyXRef.current) / 8)
      ctx.save()
      ctx.translate(watyXRef.current, watyTop + WATY_H / 2)
      ctx.rotate(lean)
      ctx.drawImage(img, -WATY_W / 2, -WATY_H / 2, WATY_W, WATY_H)
      ctx.restore()
    } else {
      ctx.font = '44px serif'
      ctx.fillText('🍉', watyXRef.current, watyTop + WATY_H / 2)
    }

    // Popups score
    for (const p of popsRef.current) {
      ctx.globalAlpha = Math.min(1, p.life / 25)
      ctx.font = 'bold 17px sans-serif'
      ctx.fillStyle = p.color
      ctx.fillText(p.text, p.x, p.y - (40 - p.life) * 0.8)
      ctx.globalAlpha = 1
    }

    // Flash rouge malbouffe
    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(220,38,38,${flashRef.current / 40})`
      ctx.fillRect(0, 0, w, h)
    }
  }

  // ── Contrôle au doigt / souris ──────────────────────────────────────────────
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    targetXRef.current = e.clientX - rect.left
  }

  // ── Garde-fous ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )
  if (!unlocked('tri')) return (
    <div className="page">
      <div className="card flex flex-col items-center gap-4 py-10 text-center">
        <Lock size={36} className="text-zinc-300" />
        <p className="font-extrabold text-zinc-900">Encore un peu de patience !</p>
        <p className="text-sm text-zinc-500">Utilise MYTA {14 - daysUsed} jour{14 - daysUsed > 1 ? 's' : ''} de plus pour débloquer Le Grand Tri ({daysUsed}/14).</p>
        <button onClick={() => router.push('/games')} className="text-sm font-bold text-tta-mid hover:underline">← Retour aux mini-jeux</button>
      </div>
    </div>
  )

  return (
    <GameShell>
      <div className="relative mx-auto h-full w-full max-w-[520px]">

        {/* ── Zone de jeu ── */}
        {phase === 'play' && (
          <>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-pointer"
              onPointerMove={pointerMove}
              onPointerDown={pointerMove}
            />
            <div className="absolute inset-x-0 top-0 px-3 flex items-center justify-between gap-2" style={safeTop}>
              <button onClick={quit}
                className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center active:scale-95">
                <X size={17} />
              </button>
              <div className="flex items-center gap-2 text-[13px] font-bold text-white">
                <span className="bg-black/35 backdrop-blur rounded-full px-2.5 py-1">🥗 {score}</span>
                <span className="bg-black/35 backdrop-blur rounded-full px-2.5 py-1">
                  {'❤️'.repeat(Math.max(0, lives))}{'🖤'.repeat(Math.max(0, 3 - lives))}
                </span>
              </div>
            </div>
            {combo >= 3 && (
              <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-orange-500 text-white text-sm font-black px-4 py-1.5 rounded-full animate-pulse shadow-lg">
                🔥 COMBO ×{combo}
              </div>
            )}
          </>
        )}

        {/* ── Intro / Game over ── */}
        {(phase === 'intro' || phase === 'over') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
               style={{ background: 'linear-gradient(180deg,#e0f2fe 0%,#f0fdf4 65%,#dcfce7 100%)' }}>
            <button onClick={quit}
              className="absolute left-3 flex items-center gap-1 text-sm text-zinc-400 active:text-zinc-600"
              style={{ ...safeTop, top: 0 }}>
              <ArrowLeft size={15} /> Mini-jeux
            </button>

            <img src="/waty-nutrition.png" alt="Waty" className="w-20 h-20 object-contain" />

            {phase === 'intro' ? (
              <>
                <h1 className="text-2xl font-extrabold text-zinc-900">🥗 Le Grand Tri</h1>
                <p className="text-sm text-zinc-600 leading-relaxed max-w-xs">
                  Les aliments pleuvent ! <span className="font-bold">Glisse ton doigt</span> pour déplacer Waty :
                  attrape les aliments <span className="font-bold text-green-600">sains</span> (+10, combo ×5 = bonus 🔥)
                  et <span className="font-bold text-pink-500">évite la malbouffe</span> (-1 ❤️).
                  Ça tombe de plus en plus vite…
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold text-zinc-900">
                  {newRecord ? '🏆 NOUVEAU RECORD !' : 'Plus de vies ! 💔'}
                </h1>
                <p className="text-5xl font-black text-green-600">{score}</p>
                {!newRecord && best > 0 && <p className="text-xs text-zinc-400">Record : {best} points</p>}
              </>
            )}

            <button onClick={startGame}
              className="flex items-center gap-2 px-9 py-3.5 rounded-2xl text-white font-bold shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(90deg, #16a34a, #2BA8B0)' }}>
              {phase === 'intro' ? <><Play size={16} fill="currentColor" /> Jouer</> : <><RotateCcw size={16} /> Rejouer</>}
            </button>

            <p className="flex items-center gap-1 text-xs text-zinc-400"><Trophy size={12} /> Record : {best}</p>
          </div>
        )}
      </div>
    </GameShell>
  )
}
