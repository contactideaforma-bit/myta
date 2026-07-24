'use client'

/**
 * 🥗 Le Grand Tri — mini-jeu Waty (palier 14 jours).
 * Sain ou plaisir ? Trie un maximum d'aliments en 45 secondes.
 * +2 par bonne réponse (+ bonus de série), -1 si erreur.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Play, RotateCcw, Trophy, Loader2 } from 'lucide-react'
import { saveBestScore, useGameUnlocks } from '@/lib/games'

const DURATION = 45 // secondes

interface Food { e: string; n: string; sain: boolean }

const FOODS: Food[] = [
  { e: '🥦', n: 'Brocoli',            sain: true  },
  { e: '🍩', n: 'Donut',              sain: false },
  { e: '🍎', n: 'Pomme',              sain: true  },
  { e: '🍟', n: 'Frites',             sain: false },
  { e: '🥕', n: 'Carotte',            sain: true  },
  { e: '🍔', n: 'Burger',             sain: false },
  { e: '🐟', n: 'Saumon',             sain: true  },
  { e: '🍕', n: 'Pizza 4 fromages',   sain: false },
  { e: '🥑', n: 'Avocat',             sain: true  },
  { e: '🥤', n: 'Soda',               sain: false },
  { e: '🍳', n: 'Œufs',               sain: true  },
  { e: '🍫', n: 'Barre chocolatée',   sain: false },
  { e: '🍌', n: 'Banane',             sain: true  },
  { e: '🌭', n: 'Hot-dog',            sain: false },
  { e: '🥬', n: 'Épinards',           sain: true  },
  { e: '🍰', n: 'Part de gâteau',     sain: false },
  { e: '🍓', n: 'Fraises',            sain: true  },
  { e: '🍪', n: 'Cookies',            sain: false },
  { e: '🫘', n: 'Lentilles',          sain: true  },
  { e: '🧁', n: 'Cupcake',            sain: false },
  { e: '🍗', n: 'Poulet grillé',      sain: true  },
  { e: '🥓', n: 'Bacon frit',         sain: false },
  { e: '🥜', n: 'Amandes',            sain: true  },
  { e: '🍭', n: 'Sucette',            sain: false },
  { e: '🍅', n: 'Tomate',             sain: true  },
  { e: '🍦', n: 'Glace',              sain: false },
  { e: '🥣', n: "Flocons d'avoine",   sain: true  },
  { e: '🥐', n: 'Croissant',          sain: false },
  { e: '🍊', n: 'Orange',             sain: true  },
  { e: '🍿', n: 'Pop-corn beurré',    sain: false },
  { e: '🫐', n: 'Myrtilles',          sain: true  },
  { e: '🥞', n: 'Pancakes au sirop',  sain: false },
  { e: '🍚', n: 'Riz complet',        sain: true  },
  { e: '🧀', n: 'Raclette',           sain: false },
  { e: '🥗', n: 'Salade composée',    sain: true  },
  { e: '🍺', n: 'Bière',              sain: false },
  { e: '🍠', n: 'Patate douce',       sain: true  },
  { e: '🍬', n: 'Bonbons',            sain: false },
  { e: '🥒', n: 'Concombre',          sain: true  },
  { e: '🥧', n: 'Tarte au sucre',     sain: false },
  { e: '🍇', n: 'Raisin',             sain: true  },
  { e: '🧋', n: 'Bubble tea',         sain: false },
  { e: '🌽', n: 'Maïs nature',        sain: true  },
  { e: '🍜', n: 'Nouilles instant.',  sain: false },
  { e: '🍋', n: 'Citron',             sain: true  },
  { e: '🥛', n: 'Milkshake',          sain: false },
  { e: '🫑', n: 'Poivron',            sain: true  },
  { e: '🍧', n: 'Granité sirop',      sain: false },
  { e: '🍉', n: 'Pastèque',           sain: true  },
  { e: '🥟', n: 'Beignet frit',       sain: false },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Phase = 'intro' | 'play' | 'over'

export default function TriGamePage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()

  const [phase, setPhase]     = useState<Phase>('intro')
  const [deck, setDeck]       = useState<Food[]>([])
  const [idx, setIdx]         = useState(0)
  const [score, setScore]     = useState(0)
  const [streak, setStreak]   = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [best, setBest]       = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [flash, setFlash]     = useState<'good' | 'bad' | null>(null)

  const scoreRef = useRef(0)

  useEffect(() => {
    if (bestScores.tri !== undefined) setBest(bestScores.tri)
  }, [bestScores.tri])

  // Chrono
  useEffect(() => {
    if (phase !== 'play') return
    if (timeLeft <= 0) { endGame(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    setDeck(shuffle(FOODS))
    setIdx(0)
    setScore(0); scoreRef.current = 0
    setStreak(0)
    setTimeLeft(DURATION)
    setNewRecord(false)
    setPhase('play')
  }

  async function endGame() {
    setPhase('over')
    const record = await saveBestScore('tri', scoreRef.current)
    if (record) { setBest(scoreRef.current); setNewRecord(true) }
  }

  function answer(saidSain: boolean) {
    if (phase !== 'play') return
    const food = deck[idx % deck.length]
    const correct = food.sain === saidSain

    if (correct) {
      const newStreak = streak + 1
      const bonus = newStreak > 0 && newStreak % 5 === 0 ? 3 : 0 // bonus série ×5
      const pts = 2 + bonus
      scoreRef.current += pts
      setScore(scoreRef.current)
      setStreak(newStreak)
      setFlash('good')
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 1)
      setScore(scoreRef.current)
      setStreak(0)
      setFlash('bad')
    }
    setTimeout(() => setFlash(null), 250)
    setIdx(i => i + 1)
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

  const food = deck.length ? deck[idx % deck.length] : null

  return (
    <div className="page select-none">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/games')} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600">
          <ArrowLeft size={15} /> Mini-jeux
        </button>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="text-green-600">🥗 {score}</span>
          <span className="flex items-center gap-1 text-zinc-400"><Trophy size={13} /> {best}</span>
        </div>
      </div>

      {/* ── Intro / Game over ── */}
      {(phase === 'intro' || phase === 'over') && (
        <div className="card flex flex-col items-center gap-4 py-8 text-center">
          <img src="/waty-nutrition.png" alt="Waty" className="w-20 h-20 object-contain" />
          {phase === 'intro' ? (
            <>
              <h1 className="text-xl font-extrabold text-zinc-900">🥗 Le Grand Tri</h1>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                Waty te montre un aliment : à toi de dire s&apos;il est <span className="font-bold text-green-600">sain</span> ou
                <span className="font-bold text-pink-500"> plaisir</span> ! {DURATION} secondes, +2 par bonne réponse,
                +3 de bonus toutes les 5 d&apos;affilée, -1 si erreur.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-zinc-900">
                {newRecord ? '🏆 NOUVEAU RECORD !' : 'Temps écoulé ! ⏰'}
              </h1>
              <p className="text-4xl font-black text-green-600">{score} <span className="text-sm text-zinc-400 font-semibold">points</span></p>
              {!newRecord && best > 0 && <p className="text-xs text-zinc-400">Record : {best} points</p>}
            </>
          )}
          <button onClick={start}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold shadow-lg active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(90deg, #16a34a, #2BA8B0)' }}>
            {phase === 'intro' ? <><Play size={16} fill="currentColor" /> Jouer</> : <><RotateCcw size={16} /> Rejouer</>}
          </button>
        </div>
      )}

      {/* ── Jeu ── */}
      {phase === 'play' && food && (
        <>
          {/* Chrono */}
          <div className="card flex items-center gap-3 py-3">
            <span className={`text-lg font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-zinc-700'}`}>⏱ {timeLeft}s</span>
            <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / DURATION) * 100}%`, background: timeLeft <= 10 ? '#ef4444' : 'linear-gradient(90deg, #16a34a, #2BA8B0)' }} />
            </div>
            {streak >= 2 && <span className="text-xs font-black text-orange-500">🔥×{streak}</span>}
          </div>

          {/* Carte aliment */}
          <div className={`card flex flex-col items-center gap-3 py-10 transition-colors duration-200 ${
            flash === 'good' ? 'bg-green-50' : flash === 'bad' ? 'bg-red-50' : ''
          }`}>
            <span className="text-7xl">{food.e}</span>
            <p className="text-lg font-extrabold text-zinc-900">{food.n}</p>
            <p className="text-xs text-zinc-400">Sain ou plaisir ?</p>
          </div>

          {/* Boutons réponse */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => answer(true)}
              className="py-6 rounded-3xl text-white font-extrabold text-lg shadow-lg active:scale-[0.96] transition-all"
              style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
              🥗 Sain
            </button>
            <button onClick={() => answer(false)}
              className="py-6 rounded-3xl text-white font-extrabold text-lg shadow-lg active:scale-[0.96] transition-all"
              style={{ background: 'linear-gradient(135deg, #ec4899, #f472b6)' }}>
              🍩 Plaisir
            </button>
          </div>
        </>
      )}
    </div>
  )
}
