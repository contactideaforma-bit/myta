'use client'

/**
 * 🌋 Floor is Lava — mini-jeu Waty (palier 7 jours).
 * La lave engloutit 2 plateformes sur 3 à chaque vague : tape la plateforme
 * sûre pour y déplacer Waty avant l'éruption. Ça accélère à chaque vague !
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Play, RotateCcw, Trophy, Loader2 } from 'lucide-react'
import { saveBestScore, useGameUnlocks } from '@/lib/games'

type Phase = 'intro' | 'warn' | 'boom' | 'over'

const START_DELAY = 2200   // ms pour réagir à la 1re vague
const MIN_DELAY   = 750    // plancher
const STEP        = 70     // accélération par vague

export default function LavaGamePage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()

  const [phase, setPhase]       = useState<Phase>('intro')
  const [watyCol, setWatyCol]   = useState(1)
  const [safeCol, setSafeCol]   = useState(1)
  const [score, setScore]       = useState(0)
  const [best, setBest]         = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [deadline, setDeadline] = useState(START_DELAY)

  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const watyRef   = useRef(1)
  const scoreRef  = useRef(0)

  useEffect(() => {
    if (bestScores.lava !== undefined) setBest(bestScores.lava)
  }, [bestScores.lava])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function startWave(currentScore: number) {
    const safe = Math.floor(Math.random() * 3)
    const delay = Math.max(MIN_DELAY, START_DELAY - currentScore * STEP)
    setSafeCol(safe)
    setDeadline(delay)
    setPhase('warn')

    timerRef.current = setTimeout(() => {
      // Éruption : Waty doit être sur la plateforme sûre
      if (watyRef.current === safe) {
        const next = currentScore + 1
        scoreRef.current = next
        setScore(next)
        setPhase('boom')
        setTimeout(() => startWave(next), 550)
      } else {
        endGame()
      }
    }, delay)
  }

  async function endGame() {
    setPhase('over')
    const finalScore = scoreRef.current
    const record = await saveBestScore('lava', finalScore)
    if (record) { setBest(finalScore); setNewRecord(true) }
  }

  function start() {
    scoreRef.current = 0
    watyRef.current = 1
    setScore(0)
    setWatyCol(1)
    setNewRecord(false)
    startWave(0)
  }

  function moveTo(col: number) {
    if (phase !== 'warn') return
    watyRef.current = col
    setWatyCol(col)
  }

  // ── Garde-fous chargement / verrouillage ────────────────────────────────────
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

  const isPlaying = phase === 'warn' || phase === 'boom'

  return (
    <div className="page select-none">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/games')} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600">
          <ArrowLeft size={15} /> Mini-jeux
        </button>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="text-orange-500">🌋 {score}</span>
          <span className="flex items-center gap-1 text-zinc-400"><Trophy size={13} /> {best}</span>
        </div>
      </div>

      {/* ── Écran intro / game over ── */}
      {(phase === 'intro' || phase === 'over') && (
        <div className="card flex flex-col items-center gap-4 py-8 text-center">
          <img src="/waty-sport.png" alt="Waty" className="w-20 h-20 object-contain" />
          {phase === 'intro' ? (
            <>
              <h1 className="text-xl font-extrabold text-zinc-900">🌋 Floor is Lava</h1>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                La lave engloutit 2 plateformes sur 3 ! <span className="font-bold">Tape la plateforme sûre</span> (celle
                sans 🔥) pour y déplacer Waty avant l&apos;éruption. Chaque vague est plus rapide…
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-zinc-900">
                {newRecord ? '🏆 NOUVEAU RECORD !' : 'Waty a fondu ! 🫠'}
              </h1>
              <p className="text-4xl font-black text-orange-500">{score} <span className="text-sm text-zinc-400 font-semibold">vague{score > 1 ? 's' : ''}</span></p>
              {!newRecord && best > 0 && <p className="text-xs text-zinc-400">Record : {best} vagues</p>}
            </>
          )}
          <button onClick={start}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold shadow-lg active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(90deg, #f97316, #dc2626)' }}>
            {phase === 'intro' ? <><Play size={16} fill="currentColor" /> Jouer</> : <><RotateCcw size={16} /> Rejouer</>}
          </button>
        </div>
      )}

      {/* ── Plateau de jeu ── */}
      {isPlaying && (
        <div className="rounded-3xl overflow-hidden shadow-sm border-2 border-orange-200"
          style={{ background: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 60%, #fdba74 100%)' }}>

          {/* Barre de temps de la vague */}
          <div className="h-2 bg-orange-100">
            {phase === 'warn' && (
              <div key={`${score}-${safeCol}`} className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                style={{ animation: `lavaShrink ${deadline}ms linear forwards` }} />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 pt-6">
            {[0, 1, 2].map(col => {
              const danger = phase === 'warn' && col !== safeCol
              const erupted = phase === 'boom' && col !== safeCol
              return (
                <button key={col} onClick={() => moveTo(col)}
                  className={`relative h-48 rounded-2xl border-2 transition-all flex flex-col items-center justify-end pb-3 ${
                    erupted ? 'bg-gradient-to-t from-red-600 to-orange-500 border-red-600'
                    : danger ? 'bg-orange-50 border-orange-300 animate-pulse'
                    : 'bg-white border-zinc-200'
                  }`}>
                  {/* Waty */}
                  {watyCol === col && !erupted && (
                    <img src="/waty-sport.png" alt="Waty" className="w-14 h-14 object-contain absolute top-1/3 -translate-y-1/2 drop-shadow-md transition-all" />
                  )}
                  {/* Signal de danger / lave */}
                  <span className="text-2xl">
                    {erupted ? '🌋' : danger ? '🔥' : '🟩'}
                  </span>
                  {/* Plateforme */}
                  <div className={`mt-1 h-2.5 w-4/5 rounded-full ${erupted ? 'bg-red-800/60' : danger ? 'bg-orange-300' : 'bg-emerald-400'}`} />
                </button>
              )
            })}
          </div>

          <p className="text-center text-xs font-bold text-orange-700 pb-3">
            {phase === 'boom' ? '✅ Sauvé ! Vague suivante…' : 'Tape la plateforme SANS 🔥 !'}
          </p>
        </div>
      )}

      {/* Animation de la barre de temps */}
      <style jsx global>{`
        @keyframes lavaShrink { from { width: 100% } to { width: 0% } }
      `}</style>
    </div>
  )
}
