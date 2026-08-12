'use client'

/**
 * 🌋 Floor is Lava — ASCENSION (palier 7 jours).
 *
 * Waty grimpe une tour de plateformes de basalte pendant que la lave monte
 * sous ses pieds. 5 tours, difficulté crescendo : les paliers s'écartent, les
 * plateformes rétrécissent, la lave accélère, puis arrivent les plateformes
 * qui s'effritent, les mobiles, les chutes de pierres et les boules de feu.
 *
 * Fruits magiques : 🍌 double saut · 🫐 lave ralentie · 🍎 bouclier · 🍍 aimant.
 *
 * Rendu plein écran (GameShell). Contrôles : ◀ ▶ SAUT + clavier.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Play, RotateCcw, Trophy, Loader2, ArrowUp, X } from 'lucide-react'
import { saveBestScore, useGameUnlocks } from '@/lib/games'
import { GameShell, safeTop, safeBottom } from '@/components/ui/GameShell'

type Phase = 'intro' | 'play' | 'clear' | 'over' | 'win'

// ─── Physique ─────────────────────────────────────────────────────────────────
const GRAVITY = 0.62
const JUMP_VY = -12.4          // hauteur de saut max ≈ 124 px
const RUN_VX  = 3.6
const WATY    = 40
const PLAT_H  = 18
const COYOTE  = 6              // frames de tolérance après avoir quitté le sol

// ─── Pouvoirs ─────────────────────────────────────────────────────────────────
type PowerKey = 'double' | 'slow' | 'shield' | 'magnet'

const FRUITS: Record<PowerKey, { emoji: string; label: string; frames: number; color: string }> = {
  double: { emoji: '🍌', label: 'Double saut',   frames: 8 * 60, color: '#facc15' },
  slow:   { emoji: '🫐', label: 'Lave ralentie', frames: 6 * 60, color: '#818cf8' },
  shield: { emoji: '🍎', label: 'Bouclier',      frames: 0,      color: '#f87171' },
  magnet: { emoji: '🍍', label: 'Aimant',        frames: 8 * 60, color: '#fbbf24' },
}
const FRUIT_ORDER: PowerKey[] = ['double', 'slow', 'shield', 'magnet']

// ─── Paramètres de difficulté (crescendo sur 5 tours) ─────────────────────────
interface LevelParams {
  steps:    number   // nombre de paliers
  gapMin:   number   // écart vertical entre paliers
  gapMax:   number
  wMin:     number   // largeur des plateformes
  wMax:     number
  lavaV0:   number   // vitesse initiale de la lave (px/frame)
  lavaAcc:  number   // accélération de la lave (px/frame²)
  moving:   number   // proba plateforme mobile
  crumble:  number   // proba plateforme qui s'effrite
  rocks:    number   // chutes de pierres par seconde
  fire:     number   // boules de feu par seconde
  fruits:   number   // nombre de fruits magiques
}

const PARAMS: LevelParams[] = [
  { steps: 24, gapMin: 58, gapMax: 72, wMin: 92, wMax: 150, lavaV0: 0.30, lavaAcc: 0.00016, moving: 0,    crumble: 0,    rocks: 0,    fire: 0,    fruits: 2 },
  { steps: 28, gapMin: 64, gapMax: 78, wMin: 80, wMax: 132, lavaV0: 0.38, lavaAcc: 0.00020, moving: 0.14, crumble: 0.10, rocks: 0.30, fire: 0,    fruits: 3 },
  { steps: 32, gapMin: 70, gapMax: 84, wMin: 72, wMax: 118, lavaV0: 0.46, lavaAcc: 0.00024, moving: 0.26, crumble: 0.18, rocks: 0.55, fire: 0.25, fruits: 3 },
  { steps: 36, gapMin: 76, gapMax: 90, wMin: 64, wMax: 106, lavaV0: 0.54, lavaAcc: 0.00028, moving: 0.36, crumble: 0.26, rocks: 0.80, fire: 0.45, fruits: 4 },
  { steps: 42, gapMin: 80, gapMax: 96, wMin: 58, wMax: 96,  lavaV0: 0.64, lavaAcc: 0.00032, moving: 0.46, crumble: 0.34, rocks: 1.05, fire: 0.65, fruits: 5 },
]

// ─── Entités ──────────────────────────────────────────────────────────────────
interface Plat {
  x: number; y: number; w: number
  x0: number; mx: number; sp: number; dir: number; dx: number
  crumble: boolean; timer: number; falling: boolean; vy: number; dead: boolean
}
interface Star  { x: number; y: number; got: boolean }
interface Fruit { x: number; y: number; kind: PowerKey; got: boolean }
interface Rock  { x: number; y: number; vy: number; r: number; spin: number }
interface Fire  { x: number; y: number; vy: number; life: number }

interface Level {
  towerH:  number         // hauteur totale du monde (px)
  plats:   Plat[]
  stars:   Star[]
  fruits:  Fruit[]
  portalY: number         // y du portail d'arrivée
  portalX: number
  startX:  number
  startY:  number
}

// ─── Génération procédurale ───────────────────────────────────────────────────
/** RNG déterministe : même niveau à chaque partie, pour un apprentissage possible. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Distance horizontale franchissable en l'air pour une montée de `h` px.
 * Résout h = |v0|·t − ½·g·t² et prend la racine descendante.
 */
function maxAir(h: number): number {
  const disc = JUMP_VY * JUMP_VY - 2 * GRAVITY * h
  if (disc <= 0) return 0
  const t = (Math.abs(JUMP_VY) + Math.sqrt(disc)) / GRAVITY
  return RUN_VX * t
}

function buildLevel(idx: number, worldW: number): Level {
  const P = PARAMS[idx]
  const rng = mulberry32(1337 + idx * 7919)

  const margin = 10
  const groundW = Math.min(worldW - 2 * margin, 240)

  interface Step { a: number; cx: number; w: number; moving: boolean; crumble: boolean }
  const steps: Step[] = [{ a: 0, cx: worldW / 2, w: groundW, moving: false, crumble: false }]

  for (let i = 1; i <= P.steps; i++) {
    const gap = P.gapMin + rng() * (P.gapMax - P.gapMin)
    const w   = Math.round(P.wMin + rng() * (P.wMax - P.wMin))
    const prev = steps[steps.length - 1]

    // Portée sûre : 80 % de la portée théorique + les demi-largeurs des deux
    // plateformes (on peut s'élancer du bord et atterrir sur le bord opposé).
    const reach = 0.8 * maxAir(gap) + prev.w / 2 + w / 2
    const lo = Math.max(w / 2 + margin, prev.cx - reach)
    const hi = Math.min(worldW - w / 2 - margin, prev.cx + reach)
    const cx = hi > lo ? lo + rng() * (hi - lo) : Math.min(Math.max(prev.cx, w / 2 + margin), worldW - w / 2 - margin)

    // Pas de piège sur les deux premiers paliers : on laisse respirer.
    const canTrap  = i > 2
    const moving   = canTrap && rng() < P.moving
    const crumble  = canTrap && !moving && rng() < P.crumble

    steps.push({ a: prev.a + gap, cx, w, moving, crumble })
  }

  // Palier final : large, sûr, sous le portail.
  const last = steps[steps.length - 1]
  steps.push({ a: last.a + P.gapMin, cx: Math.min(Math.max(last.cx, 90), worldW - 90), w: Math.min(worldW - 2 * margin, 170), moving: false, crumble: false })

  const topA   = steps[steps.length - 1].a
  const towerH = topA + 150            // marge au-dessus pour le portail
  const toY    = (a: number) => towerH - a - 60   // 60 px de marge sous le sol

  const plats: Plat[] = steps.map(s => {
    const w = s.w
    const amp = s.moving ? 34 + rng() * 46 : 0
    const x = s.cx - w / 2
    return {
      x, y: toY(s.a), w,
      x0: x, mx: Math.min(amp, Math.max(0, (worldW - w) / 2 - 6)), sp: 0.7 + rng() * 1.1,
      dir: rng() < 0.5 ? -1 : 1, dx: 0,
      crumble: s.crumble, timer: 0, falling: false, vy: 0, dead: false,
    }
  })

  // ⭐ au-dessus d'un palier sur deux (jamais sur le sol de départ)
  const stars: Star[] = []
  for (let i = 1; i < steps.length; i++) {
    if (i % 2 === 0 || rng() < 0.35) {
      stars.push({ x: steps[i].cx, y: toY(steps[i].a) - 34, got: false })
    }
  }

  // 🍌🫐🍎🍍 répartis régulièrement dans la montée
  const fruits: Fruit[] = []
  for (let f = 0; f < PARAMS[idx].fruits; f++) {
    const si = Math.round(((f + 1) / (PARAMS[idx].fruits + 1)) * (steps.length - 2)) + 1
    const s  = steps[Math.min(si, steps.length - 2)]
    fruits.push({ x: s.cx, y: toY(s.a) - 62, kind: FRUIT_ORDER[(f + idx) % FRUIT_ORDER.length], got: false })
  }

  const ground = plats[0]
  return {
    towerH,
    plats, stars, fruits,
    portalX: steps[steps.length - 1].cx,
    portalY: toY(topA) - 72,
    startX: ground.x + ground.w / 2 - WATY / 2,
    startY: ground.y - WATY,
  }
}

export default function LavaGamePage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()

  const [phase, setPhase] = useState<Phase>('intro')
  const [stars, setStars] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(0)
  const [best,  setBest]  = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [hudPowers, setHudPowers] = useState<{ k: PowerKey; pct: number }[]>([])
  const [danger, setDanger] = useState(0)      // 0 → 1 : proximité de la lave
  const [climb,  setClimb]  = useState(0)      // 0 → 1 : progression dans la tour

  // ── Moteur ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef   = useRef<HTMLDivElement | null>(null)
  const rafRef    = useRef(0)
  const runningRef = useRef(false)
  const phaseRef  = useRef<Phase>('intro')

  const worldRef  = useRef<Level | null>(null)
  const playerRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, onGround: false, groundIdx: -1, face: 1, coyote: 0, airJumps: 0, inv: 0 })
  const rocksRef  = useRef<Rock[]>([])
  const firesRef  = useRef<Fire[]>([])
  const lavaRef   = useRef({ y: 0, v: 0 })
  const powersRef = useRef<Record<PowerKey, number>>({ double: 0, slow: 0, shield: 0, magnet: 0 })
  const shakeRef  = useRef(0)

  const levelRef = useRef(0)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const camRef   = useRef(0)
  const tRef     = useRef(0)
  const sizeRef  = useRef({ w: 360, h: 640 })

  const leftRef  = useRef(false)
  const rightRef = useRef(false)
  const jumpRef  = useRef(0)

  const watyImgRef = useRef<HTMLImageElement | null>(null)
  const bgImgRef   = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (bestScores.lava !== undefined) setBest(bestScores.lava)
  }, [bestScores.lava])

  // Images + clavier
  useEffect(() => {
    const waty = new Image(); waty.src = '/waty-sport.png'; watyImgRef.current = waty
    const bg   = new Image(); bg.src   = '/lava-bg.jpg';    bgImgRef.current   = bg

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

  // Taille du canvas = taille du conteneur plein écran
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const sync = () => {
      const r = el.getBoundingClientRect()
      sizeRef.current = { w: Math.max(240, Math.round(r.width)), h: Math.max(320, Math.round(r.height)) }
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [phase])

  function setPhaseBoth(p: Phase) { phaseRef.current = p; setPhase(p) }

  function loadLevel(idx: number) {
    const { w, h } = sizeRef.current
    const lvl = buildLevel(idx, w)
    worldRef.current = lvl
    levelRef.current = idx

    playerRef.current = {
      x: lvl.startX, y: lvl.startY, vx: 0, vy: 0,
      onGround: true, groundIdx: 0, face: 1, coyote: 0, airJumps: 0, inv: 0,
    }
    // La lave démarre juste sous le sol et remonte.
    lavaRef.current = { y: lvl.towerH + 30, v: PARAMS[idx].lavaV0 }
    rocksRef.current = []
    firesRef.current = []
    powersRef.current = { double: 0, slow: 0, shield: 0, magnet: 0 }
    camRef.current = Math.max(0, Math.min(lvl.towerH - h, lvl.startY - h * 0.58))
    setLevel(idx)
    setHudPowers([])
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

  function quit() {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    router.push('/games')
  }

  async function endGame(win: boolean) {
    const bonus = win ? livesRef.current * 5 : 0
    scoreRef.current += bonus
    setStars(scoreRef.current)
    setPhaseBoth(win ? 'win' : 'over')
    const record = await saveBestScore('lava', scoreRef.current)
    if (record) { setBest(scoreRef.current); setNewRecord(true) }
  }

  /** Dégâts : le bouclier absorbe et propulse Waty vers le haut. */
  function hit() {
    const p = playerRef.current
    if (p.inv > 0) return
    if (powersRef.current.shield > 0) {
      powersRef.current.shield = 0
      p.inv = 70
      p.vy = JUMP_VY * 0.75
      shakeRef.current = 10
      // On repousse la lave, sinon Waty replonge dedans dès la fin de l'invincibilité.
      lavaRef.current.y = Math.max(lavaRef.current.y, p.y + WATY + 150)
      return
    }
    livesRef.current -= 1
    setLives(livesRef.current)
    shakeRef.current = 16
    if (livesRef.current <= 0) { endGame(false); return }
    respawn()
  }

  /** Respawn : on redescend sur le dernier palier franchi, la lave recule un peu. */
  function respawn() {
    const lvl = worldRef.current
    if (!lvl) return
    const p = playerRef.current
    const alive = lvl.plats.filter(pl => !pl.dead && !pl.falling && pl.y > p.y - 40)
    const target = alive.length ? alive.reduce((a, b) => (a.y < b.y ? a : b)) : lvl.plats[0]
    playerRef.current = {
      x: target.x + target.w / 2 - WATY / 2, y: target.y - WATY,
      vx: 0, vy: 0, onGround: true, groundIdx: lvl.plats.indexOf(target),
      face: 1, coyote: 0, airJumps: 0, inv: 90,
    }
    lavaRef.current.y = Math.max(lavaRef.current.y, target.y + 190)
    lavaRef.current.v = PARAMS[levelRef.current].lavaV0
    rocksRef.current = []
    firesRef.current = []
  }

  function levelClear() {
    if (levelRef.current >= PARAMS.length - 1) { endGame(true); return }
    setPhaseBoth('clear')
    setTimeout(() => {
      if (!runningRef.current) return
      loadLevel(levelRef.current + 1)
      setPhaseBoth('play')
    }, 1300)
  }

  // ── Boucle ────────────────────────────────────────────────────────────────
  function loop() {
    if (!runningRef.current) return
    tRef.current++
    if (phaseRef.current === 'play') update()
    draw()
    rafRef.current = requestAnimationFrame(loop)
  }

  function update() {
    const lvl = worldRef.current
    if (!lvl) return
    const p = playerRef.current
    const P = PARAMS[levelRef.current]
    const { w: viewW, h: viewH } = sizeRef.current
    const pw = powersRef.current

    // Pouvoirs (décompte)
    for (const k of FRUIT_ORDER) if (k !== 'shield' && pw[k] > 0) pw[k]--
    if (p.inv > 0) p.inv--
    if (shakeRef.current > 0) shakeRef.current--

    // ── La lave monte ──
    const lava = lavaRef.current
    lava.v += P.lavaAcc
    lava.y -= lava.v * (pw.slow > 0 ? 0.32 : 1)

    // ── Plateformes ──
    lvl.plats.forEach((pl, i) => {
      pl.dx = 0
      if (pl.mx > 0 && !pl.falling) {
        const nx = pl.x + pl.dir * pl.sp
        if (nx > pl.x0 + pl.mx || nx < pl.x0 - pl.mx) pl.dir *= -1
        else { pl.dx = nx - pl.x; pl.x = nx }
      }
      if (pl.crumble && pl.timer > 0 && !pl.falling) {
        pl.timer--
        if (pl.timer === 0) { pl.falling = true; if (p.groundIdx === i) { p.onGround = false; p.groundIdx = -1 } }
      }
      if (pl.falling) {
        pl.vy += 0.45
        pl.y += pl.vy
        if (pl.y > lava.y + 60) pl.dead = true
      }
    })

    // Porté par une plateforme mobile
    if (p.onGround && p.groundIdx >= 0) {
      const gp = lvl.plats[p.groundIdx]
      if (gp && !gp.falling) p.x += gp.dx
    }

    // ── Entrées ──
    p.vx = (leftRef.current ? -RUN_VX : 0) + (rightRef.current ? RUN_VX : 0)
    if (p.vx !== 0) p.face = p.vx > 0 ? 1 : -1

    if (p.onGround) { p.coyote = COYOTE; p.airJumps = pw.double > 0 ? 1 : 0 }
    else if (p.coyote > 0) p.coyote--

    if (jumpRef.current > 0) {
      jumpRef.current--
      if (p.onGround || p.coyote > 0) {
        p.vy = JUMP_VY; p.onGround = false; p.groundIdx = -1; p.coyote = 0
        jumpRef.current = 0
      } else if (p.airJumps > 0 && pw.double > 0) {
        p.vy = JUMP_VY * 0.94
        p.airJumps--
        jumpRef.current = 0
      }
    }

    // ── Physique ──
    const prevBottom = p.y + WATY
    p.vy = Math.min(p.vy + GRAVITY, 16)
    p.x += p.vx
    p.y += p.vy
    p.x = Math.max(0, Math.min(viewW - WATY, p.x))

    // Atterrissage (plateformes traversables par-dessous)
    p.onGround = false
    if (p.vy >= 0) {
      const newBottom = p.y + WATY
      for (let i = 0; i < lvl.plats.length; i++) {
        const pl = lvl.plats[i]
        if (pl.dead || pl.falling) continue
        if (p.x + WATY - 8 > pl.x && p.x + 8 < pl.x + pl.w &&
            prevBottom <= pl.y + 4 && newBottom >= pl.y) {
          p.y = pl.y - WATY
          p.vy = 0
          p.onGround = true
          p.groundIdx = i
          if (pl.crumble && pl.timer === 0) pl.timer = 42
          break
        }
      }
    }

    // ── Étoiles (aimant 🍍) ──
    const magnet = pw.magnet > 0
    for (const s of lvl.stars) {
      if (s.got) continue
      const dx = (p.x + WATY / 2) - s.x
      const dy = (p.y + WATY / 2) - s.y
      const d  = Math.hypot(dx, dy)
      if (magnet && d < 150) {
        s.x += (dx / d) * 4.2
        s.y += (dy / d) * 4.2
      }
      if (d < 30) { s.got = true; scoreRef.current += 1; setStars(scoreRef.current) }
    }

    // ── Fruits magiques ──
    for (const f of lvl.fruits) {
      if (f.got) continue
      if (Math.abs(p.x + WATY / 2 - f.x) < 30 && Math.abs(p.y + WATY / 2 - f.y) < 32) {
        f.got = true
        if (f.kind === 'shield') pw.shield = 1
        else pw[f.kind] = FRUITS[f.kind].frames
        if (f.kind === 'double') p.airJumps = 1
        scoreRef.current += 2
        setStars(scoreRef.current)
      }
    }

    // ── Chutes de pierres ──
    if (P.rocks > 0 && Math.random() < P.rocks / 60) {
      rocksRef.current.push({
        x: 20 + Math.random() * (viewW - 40),
        y: camRef.current - 40,
        vy: 2.4 + Math.random() * 2.2,
        r: 9 + Math.random() * 8,
        spin: Math.random() * Math.PI,
      })
    }
    let damaged = false
    const nextRocks: Rock[] = []
    for (const r of rocksRef.current) {
      r.vy += 0.06
      r.y += r.vy
      if (r.y > lava.y + 20) continue
      if (!damaged && p.inv <= 0 &&
          Math.abs(r.x - (p.x + WATY / 2)) < r.r + 13 &&
          Math.abs(r.y - (p.y + WATY / 2)) < r.r + 15) { damaged = true; continue }
      nextRocks.push(r)
    }
    rocksRef.current = nextRocks
    if (damaged) { hit(); return }

    // ── Boules de feu qui jaillissent de la lave ──
    if (P.fire > 0 && Math.random() < P.fire / 60) {
      firesRef.current.push({
        x: 20 + Math.random() * (viewW - 40),
        y: lava.y,
        vy: -(3.2 + Math.random() * 1.6),
        life: 150,
      })
    }
    let burned = false
    const nextFires: Fire[] = []
    for (const f of firesRef.current) {
      f.vy += 0.05
      f.y += f.vy
      f.life--
      if (f.life <= 0 || f.y > lava.y + 30) continue
      if (!burned && p.inv <= 0 &&
          Math.abs(f.x - (p.x + WATY / 2)) < 20 &&
          Math.abs(f.y - (p.y + WATY / 2)) < 22) { burned = true; continue }
      nextFires.push(f)
    }
    firesRef.current = nextFires
    if (burned) { hit(); return }

    // ── Lave : contact ──
    if (p.y + WATY > lava.y) { hit(); return }

    // ── Arrivée : le portail ──
    if (p.y + WATY / 2 < lvl.portalY + 46 && Math.abs(p.x + WATY / 2 - lvl.portalX) < 60) {
      levelClear(); return
    }

    // ── Caméra (suit Waty, un peu bas pour voir vers le haut) ──
    const target = Math.max(0, Math.min(lvl.towerH - viewH, p.y - viewH * 0.58))
    camRef.current += (target - camRef.current) * 0.16

    // ── HUD ──
    if (tRef.current % 6 === 0) {
      const list: { k: PowerKey; pct: number }[] = []
      for (const k of FRUIT_ORDER) {
        if (k === 'shield') { if (pw.shield > 0) list.push({ k, pct: 1 }) }
        else if (pw[k] > 0) list.push({ k, pct: pw[k] / FRUITS[k].frames })
      }
      setHudPowers(list)
      const gapToLava = lava.y - (p.y + WATY)
      setDanger(Math.max(0, Math.min(1, 1 - gapToLava / (viewH * 0.9))))
      setClimb(Math.max(0, Math.min(1, 1 - (p.y - lvl.portalY) / (lvl.startY - lvl.portalY))))
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  function draw() {
    const canvas = canvasRef.current
    const lvl = worldRef.current
    if (!canvas || !lvl) return
    const { w, h } = sizeRef.current
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cam = camRef.current
    const t   = tRef.current
    const lava = lavaRef.current
    const pw   = powersRef.current

    // Tremblement d'écran quand Waty encaisse
    ctx.save()
    if (shakeRef.current > 0) {
      const s = shakeRef.current * 0.5
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s)
    }

    // ── Décor (parallax vertical, tuilé) ──
    const bg = bgImgRef.current
    if (bg && bg.complete && bg.naturalWidth) {
      const scale = w / bg.naturalWidth
      const bh = bg.naturalHeight * scale
      let off = (-cam * 0.28) % bh
      if (off > 0) off -= bh
      for (let y = off; y < h; y += bh) ctx.drawImage(bg, 0, y, w, bh)
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#2b0a0a'); g.addColorStop(0.6, '#7f1d1d'); g.addColorStop(1, '#c2410c')
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
    }
    // Voile sombre : le décor est très chargé, il faut que le jeu reste lisible.
    ctx.fillStyle = 'rgba(12,2,2,0.34)'
    ctx.fillRect(0, 0, w, h)

    // ── Portail d'arrivée ──
    const poy = lvl.portalY - cam
    if (poy > -140 && poy < h + 140) {
      const px = lvl.portalX
      const pulse = 1 + Math.sin(t / 14) * 0.06
      ctx.save()
      ctx.translate(px, poy)
      ctx.scale(pulse, pulse)
      const pg = ctx.createRadialGradient(0, 0, 4, 0, 0, 52)
      pg.addColorStop(0, 'rgba(233,213,255,0.95)')
      pg.addColorStop(0.45, 'rgba(168,85,247,0.75)')
      pg.addColorStop(1, 'rgba(88,28,135,0)')
      ctx.fillStyle = pg
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 50, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(233,213,255,0.9)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 42, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
      ctx.font = '600 12px system-ui, sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillText('SORTIE', px, poy + 62)
    }

    // ── Plateformes de basalte ──
    for (const pl of lvl.plats) {
      if (pl.dead) continue
      const y = pl.y - cam
      if (y < -60 || y > h + 60) continue
      const shake = pl.crumble && pl.timer > 0 && pl.timer < 24 ? (Math.random() - 0.5) * 3 : 0
      const x = pl.x + shake

      const g = ctx.createLinearGradient(0, y, 0, y + PLAT_H)
      g.addColorStop(0, pl.crumble ? '#5b2a1e' : '#4a3330')
      g.addColorStop(1, '#1c0f0e')
      ctx.fillStyle = g
      roundRect(ctx, x, y, pl.w, PLAT_H, 7)
      ctx.fill()

      // arête supérieure chauffée
      ctx.strokeStyle = pl.crumble ? 'rgba(251,146,60,0.95)' : 'rgba(120,72,56,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x + 5, y + 1.5); ctx.lineTo(x + pl.w - 5, y + 1.5); ctx.stroke()

      // fissures incandescentes
      ctx.strokeStyle = 'rgba(249,115,22,0.55)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let cx2 = 12; cx2 < pl.w - 8; cx2 += 22) {
        ctx.moveTo(x + cx2, y + 5); ctx.lineTo(x + cx2 + 5, y + PLAT_H - 4)
      }
      ctx.stroke()

      if (pl.mx > 0) {
        ctx.fillStyle = 'rgba(253,224,71,0.9)'
        ctx.font = '11px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('↔', x + pl.w / 2, y - 5)
      }
    }

    // ── Étoiles ──
    ctx.font = '24px serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const s of lvl.stars) {
      if (s.got) continue
      const y = s.y - cam
      if (y < -40 || y > h + 40) continue
      ctx.fillText('⭐', s.x, y + Math.sin(t / 18 + s.x) * 3)
    }

    // ── Fruits magiques ──
    for (const f of lvl.fruits) {
      if (f.got) continue
      const y = f.y - cam
      if (y < -50 || y > h + 50) continue
      const bob = Math.sin(t / 15 + f.x) * 4
      const halo = ctx.createRadialGradient(f.x, y + bob, 2, f.x, y + bob, 26)
      halo.addColorStop(0, FRUITS[f.kind].color + 'cc')
      halo.addColorStop(1, FRUITS[f.kind].color + '00')
      ctx.fillStyle = halo
      ctx.beginPath(); ctx.arc(f.x, y + bob, 26, 0, Math.PI * 2); ctx.fill()
      ctx.font = '28px serif'
      ctx.fillText(FRUITS[f.kind].emoji, f.x, y + bob)
    }

    // ── Pierres ──
    for (const r of rocksRef.current) {
      const y = r.y - cam
      if (y < -40 || y > h + 40) continue
      ctx.save()
      ctx.translate(r.x, y); ctx.rotate(r.spin + t / 22)
      ctx.fillStyle = '#3f2a25'
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const rr = r.r * (0.8 + ((i * 37) % 10) / 30)
        i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(249,115,22,0.6)'; ctx.lineWidth = 1.4; ctx.stroke()
      ctx.restore()
    }

    // ── Boules de feu ──
    for (const f of firesRef.current) {
      const y = f.y - cam
      if (y < -40 || y > h + 40) continue
      const g = ctx.createRadialGradient(f.x, y, 2, f.x, y, 18)
      g.addColorStop(0, 'rgba(254,249,195,0.95)')
      g.addColorStop(0.4, 'rgba(249,115,22,0.85)')
      g.addColorStop(1, 'rgba(220,38,38,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(f.x, y, 18, 0, Math.PI * 2); ctx.fill()
    }

    // ── Waty ──
    const p = playerRef.current
    const py = p.y - cam
    const img = watyImgRef.current
    ctx.save()
    if (p.inv > 0 && Math.floor(t / 4) % 2 === 0) ctx.globalAlpha = 0.45
    if (pw.shield > 0) {
      ctx.strokeStyle = 'rgba(248,113,113,0.9)'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(p.x + WATY / 2, py + WATY / 2, WATY * 0.72, 0, Math.PI * 2); ctx.stroke()
    }
    if (img && img.complete && img.naturalWidth) {
      if (p.face === -1) {
        ctx.translate(p.x + WATY, py); ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, WATY, WATY)
      } else {
        ctx.drawImage(img, p.x, py, WATY, WATY)
      }
    } else {
      ctx.font = '32px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('🍉', p.x + WATY / 2, py + WATY / 2)
    }
    ctx.restore()

    // ── La lave ──
    const ly = lava.y - cam
    if (ly < h + 40) {
      const lg = ctx.createLinearGradient(0, ly, 0, h)
      lg.addColorStop(0, '#fed7aa'); lg.addColorStop(0.12, '#fb923c')
      lg.addColorStop(0.5, '#ea580c'); lg.addColorStop(1, '#7c2d12')
      ctx.fillStyle = lg
      ctx.beginPath()
      ctx.moveTo(0, h + 4)
      ctx.lineTo(0, ly)
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, ly + Math.sin(x * 0.045 + t / 9) * 5)
      ctx.lineTo(w, h + 4)
      ctx.closePath(); ctx.fill()

      ctx.strokeStyle = 'rgba(254,240,138,0.85)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      for (let x = 0; x <= w; x += 8) {
        const y = ly + Math.sin(x * 0.045 + t / 9) * 5
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()

      // lueur au-dessus de la surface
      const glow = ctx.createLinearGradient(0, ly - 70, 0, ly)
      glow.addColorStop(0, 'rgba(249,115,22,0)')
      glow.addColorStop(1, 'rgba(249,115,22,0.34)')
      ctx.fillStyle = glow
      ctx.fillRect(0, ly - 70, w, 70)
    }

    ctx.restore()
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
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
    <GameShell>
      <div ref={wrapRef} className="relative mx-auto h-full w-full max-w-[520px]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* ── HUD ── */}
        {inGame && (
          <>
            <div className="absolute inset-x-0 top-0 px-3 flex items-center justify-between gap-2" style={safeTop}>
              <button onClick={quit}
                className="w-9 h-9 rounded-full bg-black/45 backdrop-blur text-white/90 flex items-center justify-center active:scale-95">
                <X size={17} />
              </button>
              <div className="flex items-center gap-2 text-[13px] font-bold text-white">
                <span className="bg-black/45 backdrop-blur rounded-full px-2.5 py-1">Tour {level + 1}/5</span>
                <span className="bg-black/45 backdrop-blur rounded-full px-2.5 py-1 text-amber-300">⭐ {stars}</span>
                <span className="bg-black/45 backdrop-blur rounded-full px-2.5 py-1">
                  {'❤️'.repeat(Math.max(0, lives))}{'🖤'.repeat(Math.max(0, 3 - lives))}
                </span>
              </div>
            </div>

            {/* Progression de l'ascension */}
            <div className="absolute right-2 top-24 bottom-40 w-1.5 rounded-full bg-black/40 overflow-hidden">
              <div className="absolute left-0 right-0 bottom-0 rounded-full bg-gradient-to-t from-orange-500 to-amber-300 transition-all duration-200"
                   style={{ height: `${Math.round(climb * 100)}%` }} />
            </div>

            {/* Pouvoirs actifs */}
            {hudPowers.length > 0 && (
              <div className="absolute left-3 top-16 flex flex-col gap-1.5">
                {hudPowers.map(({ k, pct }) => (
                  <div key={k} className="flex items-center gap-1.5 bg-black/45 backdrop-blur rounded-full pl-1.5 pr-2 py-1">
                    <span className="text-base leading-none">{FRUITS[k].emoji}</span>
                    <span className="w-10 h-1.5 rounded-full bg-white/25 overflow-hidden">
                      <span className="block h-full rounded-full transition-all duration-150"
                            style={{ width: `${Math.round(pct * 100)}%`, background: FRUITS[k].color }} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Alerte lave */}
            {danger > 0.55 && (
              <div className="absolute inset-0 pointer-events-none"
                   style={{ boxShadow: `inset 0 -120px 90px -60px rgba(249,115,22,${(danger - 0.55) * 1.6})` }} />
            )}

            {/* Transition de niveau */}
            {phase === 'clear' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 gap-2">
                <p className="text-4xl">🏆</p>
                <p className="text-white font-extrabold text-xl">Tour {level + 1} franchie !</p>
                <p className="text-orange-200 text-sm font-bold">Tour {level + 2}, ça chauffe…</p>
              </div>
            )}

            {/* Contrôles */}
            <div className="absolute inset-x-0 bottom-0 px-3 grid grid-cols-3 gap-2.5" style={safeBottom}>
              <button {...bindHold(leftRef)}
                className="py-5 rounded-2xl bg-white/15 backdrop-blur border border-white/25 text-2xl font-black text-white active:bg-white/30">
                ◀
              </button>
              <button {...bindHold(rightRef)}
                className="py-5 rounded-2xl bg-white/15 backdrop-blur border border-white/25 text-2xl font-black text-white active:bg-white/30">
                ▶
              </button>
              <button
                onPointerDown={e => { e.preventDefault(); jumpRef.current = 9 }}
                className="py-5 rounded-2xl text-white font-extrabold shadow-lg active:scale-[0.97] transition-transform flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}>
                <ArrowUp size={22} strokeWidth={3} /> SAUT
              </button>
            </div>
          </>
        )}

        {/* ── Intro / Game over / Victoire ── */}
        {(phase === 'intro' || phase === 'over' || phase === 'win') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center overflow-y-auto"
               style={{ background: 'linear-gradient(180deg,#1b0705 0%,#4a1207 55%,#7c2d12 100%)' }}>
            <button onClick={quit}
              className="absolute left-3 flex items-center gap-1 text-sm text-white/60 active:text-white"
              style={{ ...safeTop, top: 0 }}>
              <ArrowLeft size={15} /> Mini-jeux
            </button>

            <img src="/waty-sport.png" alt="Waty" className="w-20 h-20 object-contain drop-shadow-lg" />

            {phase === 'intro' && (
              <>
                <h1 className="text-2xl font-extrabold text-white">🌋 Floor is Lava</h1>
                <p className="text-sm text-orange-100/85 leading-relaxed max-w-xs">
                  La lave monte. <span className="font-bold text-white">Grimpe</span> de plateforme en
                  plateforme jusqu&apos;au portail, ramasse les ⭐ et attrape les fruits magiques.
                  <br />5 tours, 3 vies — et ça va de plus en plus vite.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-orange-100/80 max-w-xs">
                  {FRUIT_ORDER.map(k => (
                    <div key={k} className="flex items-center gap-1.5 bg-black/30 rounded-xl px-2 py-1.5">
                      <span className="text-base">{FRUITS[k].emoji}</span>
                      <span className="font-semibold">{FRUITS[k].label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-white/45">◀ ▶ pour se déplacer · SAUT pour sauter (ou flèches + espace)</p>
              </>
            )}

            {phase === 'over' && (
              <>
                <h1 className="text-2xl font-extrabold text-white">
                  {newRecord ? '🏆 NOUVEAU RECORD !' : 'La lave a eu Waty ! 🫠'}
                </h1>
                <p className="text-5xl font-black text-amber-400">{stars}</p>
                <p className="text-xs text-orange-100/70">
                  Tour atteinte : {level + 1}/5{!newRecord && best > 0 ? ` · Record : ${best} ⭐` : ''}
                </p>
              </>
            )}

            {phase === 'win' && (
              <>
                <h1 className="text-2xl font-extrabold text-white">🏆 VICTOIRE ! 🎉</h1>
                <p className="text-sm text-orange-100/85">Waty a grimpé les 5 tours sans finir en grillade !</p>
                <p className="text-5xl font-black text-amber-400">{stars}</p>
                <p className="text-xs text-orange-100/70">
                  (⭐ + fruits + 5 pts par ❤️ restante){newRecord ? ' · NOUVEAU RECORD 🏆' : ''}
                </p>
              </>
            )}

            <button onClick={startGame}
              className="flex items-center gap-2 px-9 py-3.5 rounded-2xl text-white font-bold shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(90deg, #f97316, #dc2626)' }}>
              {phase === 'intro' ? <><Play size={16} fill="currentColor" /> Jouer</> : <><RotateCcw size={16} /> Rejouer</>}
            </button>

            <p className="flex items-center gap-1 text-xs text-white/45"><Trophy size={12} /> Record : {best}</p>
          </div>
        )}
      </div>
    </GameShell>
  )
}
