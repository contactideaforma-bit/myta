'use client'

/**
 * 🌋 Floor is Lava — vrai platformer (palier 7 jours).
 * Waty saute de plateforme en plateforme au-dessus de la lave, ramasse les
 * étoiles et rejoint le drapeau FINISH. 5 niveaux, 3 vies, plateformes
 * mobiles à partir du niveau 3. Contrôles : boutons tactiles ◀ ▶ SAUT
 * (+ flèches / espace au clavier).
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Play, RotateCcw, Trophy, Loader2, ArrowUp } from 'lucide-react'
import { saveBestScore, useGameUnlocks } from '@/lib/games'

type Phase = 'intro' | 'play' | 'clear' | 'over' | 'win'

// ─── Monde ────────────────────────────────────────────────────────────────────
const VIEW_H   = 420          // hauteur canvas (px CSS)
const LAVA_Y   = 372          // surface de la lave (monde)
const GRAVITY  = 0.62
const JUMP_VY  = -12.2
const RUN_VX   = 3.4
const WATY     = 42           // taille de Waty
const PLAT_H   = 26

interface PlatDef  { x: number; y: number; w: number; mx?: number; my?: number; sp?: number }
interface Plat     extends PlatDef { x0: number; y0: number; dir: number; dx: number; dy: number }
interface StarDef  { x: number; y: number }
interface LevelDef { width: number; plats: PlatDef[]; stars: StarDef[]; finishX: number }

// ─── Niveaux (gaps ≤ ~105 px, marches ≤ ~85 px) ───────────────────────────────
const LEVELS: LevelDef[] = [
  { // Niveau 1 — découverte
    width: 2300, finishX: 2130,
    plats: [
      { x: 0,    y: 330, w: 270 }, { x: 340,  y: 330, w: 150 }, { x: 560,  y: 300, w: 130 },
      { x: 760,  y: 262, w: 120 }, { x: 950,  y: 300, w: 130 }, { x: 1150, y: 252, w: 120 },
      { x: 1340, y: 212, w: 120 }, { x: 1530, y: 252, w: 130 }, { x: 1720, y: 296, w: 150 },
      { x: 1950, y: 330, w: 350 },
    ],
    stars: [
      { x: 400, y: 288 }, { x: 615, y: 258 }, { x: 812, y: 220 }, { x: 1006, y: 258 },
      { x: 1202, y: 210 }, { x: 1392, y: 170 }, { x: 1586, y: 210 }, { x: 1786, y: 254 }, { x: 2040, y: 288 },
    ],
  },
  { // Niveau 2 — plateformes plus petites
    width: 2600, finishX: 2430,
    plats: [
      { x: 0,    y: 330, w: 220 }, { x: 300,  y: 318, w: 110 }, { x: 490,  y: 280, w: 100 },
      { x: 670,  y: 236, w: 95  }, { x: 850,  y: 280, w: 100 }, { x: 1030, y: 320, w: 110 },
      { x: 1220, y: 272, w: 95  }, { x: 1395, y: 226, w: 90  }, { x: 1565, y: 184, w: 90  },
      { x: 1745, y: 226, w: 95  }, { x: 1920, y: 272, w: 100 }, { x: 2100, y: 318, w: 110 },
      { x: 2290, y: 330, w: 310 },
    ],
    stars: [
      { x: 350, y: 276 }, { x: 538, y: 238 }, { x: 715, y: 194 }, { x: 898, y: 238 },
      { x: 1082, y: 278 }, { x: 1265, y: 230 }, { x: 1438, y: 184 }, { x: 1608, y: 142 },
      { x: 1790, y: 184 }, { x: 1968, y: 230 }, { x: 2150, y: 276 }, { x: 2380, y: 288 },
    ],
  },
  { // Niveau 3 — plateformes mobiles horizontales
    width: 2700, finishX: 2530,
    plats: [
      { x: 0,    y: 330, w: 200 }, { x: 280,  y: 310, w: 105 },
      { x: 480,  y: 268, w: 95, mx: 70, sp: 1.1 },
      { x: 760,  y: 300, w: 100 }, { x: 950,  y: 250, w: 90, mx: 80, sp: 1.3 },
      { x: 1240, y: 290, w: 100 }, { x: 1430, y: 240, w: 90 },
      { x: 1610, y: 196, w: 90, mx: 75, sp: 1.4 },
      { x: 1900, y: 240, w: 95 }, { x: 2080, y: 290, w: 100, mx: 60, sp: 1.2 },
      { x: 2360, y: 330, w: 340 },
    ],
    stars: [
      { x: 330, y: 268 }, { x: 527, y: 226 }, { x: 810, y: 258 }, { x: 995, y: 208 },
      { x: 1290, y: 248 }, { x: 1475, y: 198 }, { x: 1655, y: 154 }, { x: 1947, y: 198 },
      { x: 2130, y: 248 }, { x: 2450, y: 288 },
    ],
  },
  { // Niveau 4 — ascenseurs verticaux
    width: 2800, finishX: 2630,
    plats: [
      { x: 0,    y: 330, w: 190 }, { x: 270,  y: 316, w: 100 },
      { x: 460,  y: 270, w: 90, my: 55, sp: 1.1 },
      { x: 650,  y: 230, w: 90 }, { x: 830,  y: 270, w: 85, my: 65, sp: 1.3 },
      { x: 1020, y: 310, w: 95 }, { x: 1210, y: 262, w: 85, mx: 70, sp: 1.4 },
      { x: 1490, y: 300, w: 90 }, { x: 1670, y: 250, w: 85, my: 60, sp: 1.5 },
      { x: 1860, y: 208, w: 85 }, { x: 2040, y: 252, w: 90, mx: 75, sp: 1.5 },
      { x: 2320, y: 300, w: 95 }, { x: 2500, y: 330, w: 300 },
    ],
    stars: [
      { x: 318, y: 274 }, { x: 503, y: 210 }, { x: 693, y: 188 }, { x: 870, y: 205 },
      { x: 1066, y: 268 }, { x: 1252, y: 220 }, { x: 1533, y: 258 }, { x: 1710, y: 190 },
      { x: 1901, y: 166 }, { x: 2083, y: 210 }, { x: 2365, y: 258 }, { x: 2580, y: 288 },
    ],
  },
  { // Niveau 5 — le boss : tout mélangé
    width: 3100, finishX: 2930,
    plats: [
      { x: 0,    y: 330, w: 180 }, { x: 260,  y: 312, w: 95 },
      { x: 440,  y: 268, w: 85, mx: 65, sp: 1.5 },
      { x: 710,  y: 300, w: 90 }, { x: 890,  y: 252, w: 80, my: 60, sp: 1.5 },
      { x: 1070, y: 208, w: 80 }, { x: 1250, y: 252, w: 80, mx: 75, sp: 1.6 },
      { x: 1530, y: 296, w: 85 }, { x: 1710, y: 248, w: 78, my: 65, sp: 1.6 },
      { x: 1890, y: 204, w: 78 }, { x: 2070, y: 160, w: 78, mx: 70, sp: 1.6 },
      { x: 2350, y: 204, w: 80 }, { x: 2530, y: 252, w: 85, my: 55, sp: 1.5 },
      { x: 2710, y: 300, w: 90 }, { x: 2860, y: 330, w: 240 },
    ],
    stars: [
      { x: 306, y: 270 }, { x: 482, y: 226 }, { x: 753, y: 258 }, { x: 928, y: 210 },
      { x: 1108, y: 166 }, { x: 1288, y: 210 }, { x: 1571, y: 254 }, { x: 1747, y: 206 },
      { x: 1927, y: 162 }, { x: 2107, y: 118 }, { x: 2388, y: 162 }, { x: 2570, y: 210 },
      { x: 2753, y: 258 }, { x: 2940, y: 288 },
    ],
  },
]

const TOTAL_STARS = LEVELS.reduce((s, l) => s + l.stars.length, 0)

export default function LavaGamePage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()

  const [phase, setPhase]   = useState<Phase>('intro')
  const [stars, setStars]   = useState(0)
  const [lives, setLives]   = useState(3)
  const [level, setLevel]   = useState(0)
  const [best, setBest]     = useState(0)
  const [newRecord, setNewRecord] = useState(false)

  // ── Moteur (refs, pas de re-render dans la boucle) ──
  const canvasRef  = useRef<HTMLCanvasElement | null>(null)
  const wrapRef    = useRef<HTMLDivElement | null>(null)
  const rafRef     = useRef(0)
  const runningRef = useRef(false)
  const phaseRef   = useRef<Phase>('intro')

  const playerRef  = useRef({ x: 60, y: 0, vx: 0, vy: 0, onGround: false, groundIdx: -1, face: 1 })
  const platsRef   = useRef<Plat[]>([])
  const starsRef   = useRef<(StarDef & { got: boolean })[]>([])
  const levelRef   = useRef(0)
  const scoreRef   = useRef(0)
  const livesRef   = useRef(3)
  const camRef     = useRef(0)
  const tRef       = useRef(0)

  const leftRef  = useRef(false)
  const rightRef = useRef(false)
  const jumpRef  = useRef(0)       // buffer de saut (frames restantes)

  const watyImgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (bestScores.lava !== undefined) setBest(bestScores.lava)
  }, [bestScores.lava])

  // Charger l'image Waty + clavier
  useEffect(() => {
    const img = new Image()
    img.src = '/waty-sport.png'
    watyImgRef.current = img

    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  leftRef.current = true
      if (e.key === 'ArrowRight') rightRef.current = true
      if (e.key === ' ' || e.key === 'ArrowUp') { jumpRef.current = 9; e.preventDefault() }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  leftRef.current = false
      if (e.key === 'ArrowRight') rightRef.current = false
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

  function loadLevel(idx: number) {
    const def = LEVELS[idx]
    levelRef.current = idx
    platsRef.current = def.plats.map(p => ({ ...p, x0: p.x, y0: p.y, dir: 1, dx: 0, dy: 0 }))
    starsRef.current = def.stars.map(s => ({ ...s, got: false }))
    playerRef.current = { x: 60, y: LEVELS[idx].plats[0].y - WATY, vx: 0, vy: 0, onGround: true, groundIdx: 0, face: 1 }
    camRef.current = 0
    setLevel(idx)
  }

  function startGame() {
    scoreRef.current = 0
    livesRef.current = 3
    setStars(0); setLives(3); setNewRecord(false)
    loadLevel(0)
    setPhaseBoth('play')
    if (!runningRef.current) {
      runningRef.current = true
      rafRef.current = requestAnimationFrame(loop)
    }
  }

  async function endGame(win: boolean) {
    const bonus = win ? livesRef.current * 5 : 0
    scoreRef.current += bonus
    setStars(scoreRef.current)
    setPhaseBoth(win ? 'win' : 'over')
    const record = await saveBestScore('lava', scoreRef.current)
    if (record) { setBest(scoreRef.current); setNewRecord(true) }
  }

  function die() {
    livesRef.current -= 1
    setLives(livesRef.current)
    if (livesRef.current <= 0) { endGame(false); return }
    // Respawn au début du niveau (les étoiles déjà prises restent acquises)
    const idx = levelRef.current
    playerRef.current = { x: 60, y: LEVELS[idx].plats[0].y - WATY, vx: 0, vy: 0, onGround: true, groundIdx: 0, face: 1 }
    camRef.current = 0
  }

  function levelClear() {
    if (levelRef.current >= LEVELS.length - 1) { endGame(true); return }
    setPhaseBoth('clear')
    setTimeout(() => {
      loadLevel(levelRef.current + 1)
      setPhaseBoth('play')
    }, 1300)
  }

  // ── Boucle principale ─────────────────────────────────────────────────────
  function loop() {
    if (!runningRef.current) return
    tRef.current++
    if (phaseRef.current === 'play') update()
    draw()
    rafRef.current = requestAnimationFrame(loop)
  }

  function update() {
    const p   = playerRef.current
    const def = LEVELS[levelRef.current]

    // Plateformes mobiles
    for (const pl of platsRef.current) {
      pl.dx = 0; pl.dy = 0
      if (pl.mx) {
        const nx = pl.x + pl.dir * (pl.sp ?? 1)
        if (nx > pl.x0 + pl.mx || nx < pl.x0 - pl.mx) pl.dir *= -1
        else { pl.dx = nx - pl.x; pl.x = nx }
      }
      if (pl.my) {
        const ny = pl.y + pl.dir * (pl.sp ?? 1)
        if (ny > pl.y0 + pl.my || ny < pl.y0 - pl.my) pl.dir *= -1
        else { pl.dy = ny - pl.y; pl.y = ny }
      }
    }

    // Porté par une plateforme mobile
    if (p.onGround && p.groundIdx >= 0) {
      const gp = platsRef.current[p.groundIdx]
      if (gp) { p.x += gp.dx; p.y += gp.dy }
    }

    // Entrées
    p.vx = (leftRef.current ? -RUN_VX : 0) + (rightRef.current ? RUN_VX : 0)
    if (p.vx !== 0) p.face = p.vx > 0 ? 1 : -1
    if (jumpRef.current > 0) {
      jumpRef.current--
      if (p.onGround) {
        p.vy = JUMP_VY; p.onGround = false; p.groundIdx = -1
        jumpRef.current = 0
      }
    }

    // Physique
    const prevBottom = p.y + WATY
    p.vy += GRAVITY
    p.x += p.vx
    p.y += p.vy
    p.x = Math.max(0, Math.min(def.width - WATY, p.x))

    // Atterrissage (plateformes traversables par dessous)
    p.onGround = false
    if (p.vy >= 0) {
      const newBottom = p.y + WATY
      for (let i = 0; i < platsRef.current.length; i++) {
        const pl = platsRef.current[i]
        if (p.x + WATY - 8 > pl.x && p.x + 8 < pl.x + pl.w &&
            prevBottom <= pl.y + Math.max(2, pl.dy + 2) && newBottom >= pl.y) {
          p.y = pl.y - WATY
          p.vy = 0
          p.onGround = true
          p.groundIdx = i
          break
        }
      }
    }

    // Étoiles
    for (const s of starsRef.current) {
      if (!s.got && Math.abs(p.x + WATY / 2 - s.x) < 30 && Math.abs(p.y + WATY / 2 - s.y) < 34) {
        s.got = true
        scoreRef.current += 1
        setStars(scoreRef.current)
      }
    }

    // Lave
    if (p.y + WATY > LAVA_Y + 6) { die(); return }

    // Arrivée
    if (p.x + WATY / 2 > def.finishX) { levelClear(); return }

    // Caméra
    const canvas = canvasRef.current
    const viewW = canvas ? canvas.clientWidth : 360
    camRef.current = Math.max(0, Math.min(def.width - viewW, p.x - viewW * 0.38))
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth, h = VIEW_H
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cam = camRef.current
    const def = LEVELS[levelRef.current]
    const t   = tRef.current

    // Fond caverne
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#3b0d0d'); bg.addColorStop(0.55, '#7f1d1d'); bg.addColorStop(1, '#b45309')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // Stalactites (parallax léger)
    ctx.fillStyle = 'rgba(30,7,7,0.55)'
    for (let i = 0; i < 10; i++) {
      const sx = ((i * 230 - cam * 0.4) % (w + 300)) - 150
      const sh = 34 + (i * 37) % 40
      ctx.beginPath()
      ctx.moveTo(sx, 0); ctx.lineTo(sx + 26, 0); ctx.lineTo(sx + 13, sh)
      ctx.closePath(); ctx.fill()
    }

    // Plateformes en briques
    for (const pl of platsRef.current) {
      const x = pl.x - cam
      if (x + pl.w < -20 || x > w + 20) continue
      ctx.fillStyle = '#e7cfc0'
      ctx.fillRect(x, pl.y, pl.w, PLAT_H)
      ctx.strokeStyle = '#b08968'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 0.5, pl.y + 0.5, pl.w - 1, PLAT_H - 1)
      // joints de briques
      ctx.beginPath()
      ctx.moveTo(x, pl.y + PLAT_H / 2); ctx.lineTo(x + pl.w, pl.y + PLAT_H / 2)
      for (let bx = 18; bx < pl.w; bx += 36) {
        ctx.moveTo(x + bx, pl.y); ctx.lineTo(x + bx, pl.y + PLAT_H / 2)
        ctx.moveTo(x + bx + 18, pl.y + PLAT_H / 2); ctx.lineTo(x + bx + 18, pl.y + PLAT_H)
      }
      ctx.stroke()
    }

    // Étoiles (petit flottement)
    ctx.font = '26px serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const s of starsRef.current) {
      if (s.got) continue
      const x = s.x - cam
      if (x < -30 || x > w + 30) continue
      ctx.fillText('⭐', x, s.y + Math.sin(t / 18 + s.x) * 3)
    }

    // Arrivée : poteau + drapeau + trophée
    const fx = def.finishX - cam
    if (fx > -80 && fx < w + 80) {
      ctx.fillStyle = '#27272a'
      ctx.fillRect(fx, 330 - 118, 5, 118)
      ctx.font = '30px serif'
      ctx.fillText('🏁', fx + 22, 330 - 104)
      ctx.font = '26px serif'
      ctx.fillText('🏆', fx + 2, 330 - 138 + Math.sin(t / 15) * 2)
    }

    // Waty
    const p = playerRef.current
    const img = watyImgRef.current
    const px = p.x - cam
    if (img && img.complete) {
      ctx.save()
      if (p.face === -1) {
        ctx.translate(px + WATY, p.y); ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, WATY, WATY)
      } else {
        ctx.drawImage(img, px, p.y, WATY, WATY)
      }
      ctx.restore()
    } else {
      ctx.font = '34px serif'; ctx.fillText('🍉', px + WATY / 2, p.y + WATY / 2)
    }

    // Lave animée (par-dessus, pour l'effet de chute dedans)
    const lg = ctx.createLinearGradient(0, LAVA_Y, 0, h)
    lg.addColorStop(0, '#fb923c'); lg.addColorStop(0.35, '#ea580c'); lg.addColorStop(1, '#9a3412')
    ctx.fillStyle = lg
    ctx.beginPath()
    ctx.moveTo(0, h); ctx.lineTo(0, LAVA_Y)
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, LAVA_Y + Math.sin((x + cam) * 0.045 + t / 9) * 5)
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill()
    // vaguelettes brillantes
    ctx.strokeStyle = 'rgba(254,240,138,0.75)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let x = 0; x <= w; x += 8) {
      const y = LAVA_Y + Math.sin((x + cam) * 0.045 + t / 9) * 5
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    // bulles
    ctx.font = '13px serif'
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 173 + t * (1 + i * 0.3)) % (w + 60)) - 30
      const by = LAVA_Y + 14 + (i * 29) % 26 + Math.sin(t / 12 + i) * 3
      ctx.fillText('🔥', bx, by)
    }
  }

  // ── Boutons tactiles ──────────────────────────────────────────────────────
  function bindHold(ref: React.MutableRefObject<boolean>) {
    return {
      onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); ref.current = true },
      onPointerUp:     () => { ref.current = false },
      onPointerLeave:  () => { ref.current = false },
      onPointerCancel: () => { ref.current = false },
    }
  }

  // ── Garde-fous ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )
  if (!unlocked('lava')) return (
    <div className="page">
      <div className="card flex flex-col items-center gap-4 py-10 text-center">
        <Lock size={36} className="text-zinc-300" />
        <p className="font-extrabold text-zinc-900">Encore un peu de patience !</p>
        <p className="text-sm text-zinc-500">Utilise MYTA {7 - daysUsed} jour{7 - daysUsed > 1 ? 's' : ''} de plus pour débloquer Floor is Lava ({daysUsed}/7).</p>
        <button onClick={() => router.push('/games')} className="text-sm font-bold text-tta-mid hover:underline">← Retour aux mini-jeux</button>
      </div>
    </div>
  )

  const inGame = phase === 'play' || phase === 'clear'

  return (
    <div className="page select-none">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/games')} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600">
          <ArrowLeft size={15} /> Mini-jeux
        </button>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="text-amber-500">⭐ {stars}</span>
          <span className="text-red-500">{'❤️'.repeat(Math.max(0, lives))}{'🖤'.repeat(Math.max(0, 3 - lives))}</span>
          <span className="flex items-center gap-1 text-zinc-400"><Trophy size={13} /> {best}</span>
        </div>
      </div>

      {/* ── Intro / Game over / Victoire ── */}
      {(phase === 'intro' || phase === 'over' || phase === 'win') && (
        <div className="card flex flex-col items-center gap-4 py-8 text-center">
          <img src="/waty-sport.png" alt="Waty" className="w-20 h-20 object-contain" />
          {phase === 'intro' && (
            <>
              <h1 className="text-xl font-extrabold text-zinc-900">🌋 Floor is Lava</h1>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                Saute de plateforme en plateforme au-dessus de la lave, ramasse les ⭐
                et atteins le drapeau 🏁. <span className="font-bold">5 niveaux</span>, 3 vies,
                et des plateformes mobiles t&apos;attendent…
              </p>
              <p className="text-[11px] text-zinc-400">◀ ▶ pour courir · SAUT pour sauter (ou flèches + espace)</p>
            </>
          )}
          {phase === 'over' && (
            <>
              <h1 className="text-xl font-extrabold text-zinc-900">
                {newRecord ? '🏆 NOUVEAU RECORD !' : 'Waty a fondu ! 🫠'}
              </h1>
              <p className="text-4xl font-black text-amber-500">{stars} <span className="text-sm text-zinc-400 font-semibold">⭐ / {TOTAL_STARS}</span></p>
              <p className="text-xs text-zinc-400">Niveau atteint : {level + 1}/5{!newRecord && best > 0 ? ` · Record : ${best} ⭐` : ''}</p>
            </>
          )}
          {phase === 'win' && (
            <>
              <h1 className="text-xl font-extrabold text-zinc-900">🏆 VICTOIRE ! 🎉</h1>
              <p className="text-sm text-zinc-500">Waty a traversé les 5 niveaux sans finir en grillade !</p>
              <p className="text-4xl font-black text-amber-500">{stars} <span className="text-sm text-zinc-400 font-semibold">points</span></p>
              <p className="text-xs text-zinc-400">(⭐ ramassées + 5 pts par ❤️ restante){newRecord ? ' · NOUVEAU RECORD 🏆' : ''}</p>
            </>
          )}
          <button onClick={startGame}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold shadow-lg active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(90deg, #f97316, #dc2626)' }}>
            {phase === 'intro' ? <><Play size={16} fill="currentColor" /> Jouer</> : <><RotateCcw size={16} /> Rejouer</>}
          </button>
        </div>
      )}

      {/* ── Zone de jeu ── */}
      {inGame && (
        <>
          <div ref={wrapRef} className="relative rounded-3xl overflow-hidden shadow-md border-2 border-orange-300 touch-none">
            <canvas ref={canvasRef} className="block w-full" style={{ height: VIEW_H }} />

            {/* Badge niveau */}
            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold px-3 py-1 rounded-full">
              Niveau {level + 1}/5
            </div>

            {/* Transition de niveau */}
            {phase === 'clear' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-2">
                <p className="text-3xl">🏆</p>
                <p className="text-white font-extrabold text-xl">Niveau {level + 1} terminé !</p>
                <p className="text-orange-200 text-sm font-bold">Niveau {level + 2}, c&apos;est parti…</p>
              </div>
            )}
          </div>

          {/* Contrôles tactiles */}
          <div className="grid grid-cols-3 gap-3 touch-none">
            <button {...bindHold(leftRef)}
              className="py-5 rounded-2xl bg-white shadow-sm border-2 border-zinc-200 text-2xl font-black text-zinc-600 active:bg-orange-50 active:border-orange-300 transition-colors">
              ◀
            </button>
            <button {...bindHold(rightRef)}
              className="py-5 rounded-2xl bg-white shadow-sm border-2 border-zinc-200 text-2xl font-black text-zinc-600 active:bg-orange-50 active:border-orange-300 transition-colors">
              ▶
            </button>
            <button
              onPointerDown={e => { e.preventDefault(); jumpRef.current = 9 }}
              className="py-5 rounded-2xl text-white font-extrabold shadow-lg active:scale-[0.97] transition-all flex items-center justify-center gap-1"
              style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}>
              <ArrowUp size={22} strokeWidth={3} /> SAUT
            </button>
          </div>
        </>
      )}
    </div>
  )
}
