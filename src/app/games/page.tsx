'use client'

/**
 * Hub Mini-jeux Waty — 3 jeux à débloquer selon les jours d'utilisation
 * de l'app (non consécutifs) : 7 j → Floor is Lava, 14 j → Le Grand Tri,
 * 30 j → Waty Runner.
 */

import { useRouter } from 'next/navigation'
import { Lock, Play, Trophy, Loader2 } from 'lucide-react'
import { GAMES, useGameUnlocks } from '@/lib/games'

export default function GamesPage() {
  const router = useRouter()
  const { loading, daysUsed, unlocked, bestScores } = useGameUnlocks()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  const nextLocked = GAMES.find(g => !unlocked(g.key))

  return (
    <div className="page">

      {/* ── Header Waty ── */}
      <div className="rounded-3xl p-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #e8fbf8 100%)', border: '2px solid #c7d2fe' }}>
        <img src="/waty-sport.png" alt="Waty" className="w-16 h-16 object-contain drop-shadow-sm" />
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-zinc-900">Mini-jeux Waty 🎮</h1>
          <p className="text-sm text-zinc-500 leading-snug mt-0.5">
            Utilise MYTA régulièrement pour débloquer les jeux — pas besoin de jours consécutifs !
          </p>
        </div>
      </div>

      {/* ── Progression ── */}
      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-zinc-900">📅 Tes jours d&apos;utilisation</p>
          <p className="text-xl font-black text-tta-mid">{daysUsed} <span className="text-xs font-semibold text-zinc-400">jour{daysUsed > 1 ? 's' : ''}</span></p>
        </div>
        {nextLocked ? (
          <>
            <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.round((daysUsed / nextLocked.unlockDays) * 100))}%`,
                  background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)',
                }} />
            </div>
            <p className="text-xs text-zinc-400">
              Plus que <span className="font-bold text-zinc-600">{nextLocked.unlockDays - daysUsed} jour{nextLocked.unlockDays - daysUsed > 1 ? 's' : ''}</span> pour
              débloquer <span className="font-bold text-zinc-600">{nextLocked.emoji} {nextLocked.title}</span>
            </p>
          </>
        ) : (
          <p className="text-xs text-zinc-500">🏆 Tous les jeux sont débloqués — bravo pour ta régularité !</p>
        )}
      </div>

      {/* ── Liste des jeux ── */}
      <div className="flex flex-col gap-3">
        {GAMES.map(game => {
          const isUnlocked = unlocked(game.key)
          const best = bestScores[game.key]
          return (
            <button key={game.key}
              onClick={() => isUnlocked && router.push(game.href)}
              disabled={!isUnlocked}
              className={`w-full text-left rounded-3xl p-5 shadow-sm border-2 transition-all ${
                isUnlocked
                  ? 'bg-white border-transparent hover:shadow-md active:scale-[0.98]'
                  : 'bg-zinc-50 border-zinc-100 opacity-80'
              }`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: isUnlocked ? `${game.color}1a` : '#f4f4f5' }}>
                  {isUnlocked ? game.emoji : <Lock size={22} className="text-zinc-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-zinc-900">{game.title}</p>
                    {!isUnlocked && (
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {Math.min(daysUsed, game.unlockDays)}/{game.unlockDays} j
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{game.desc}</p>
                  {isUnlocked && best !== undefined && (
                    <p className="flex items-center gap-1 text-xs font-bold mt-1.5" style={{ color: game.color }}>
                      <Trophy size={12} /> Record : {best} {game.scoreUnit}
                    </p>
                  )}
                </div>
                {isUnlocked && (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${game.color}, #2BA8B0)` }}>
                    <Play size={16} fill="currentColor" />
                  </div>
                )}
              </div>

              {/* Barre de progression du palier (jeu verrouillé) */}
              {!isUnlocked && (
                <div className="mt-3 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((daysUsed / game.unlockDays) * 100))}%`,
                      background: `${game.color}66`,
                    }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-center text-[10px] text-zinc-300 pb-4">
        Un jour d&apos;utilisation = un jour où tu ouvres MYTA. Tes repas et séances passés comptent déjà !
      </p>
    </div>
  )
}
