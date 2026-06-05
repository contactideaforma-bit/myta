'use client'

import type { BadgeLevel } from '@/lib/gamification'
import { getNextBadge, BADGE_LEVELS } from '@/lib/gamification'

interface BadgeDisplayProps {
  badge:  BadgeLevel
  streak: number
  size?:  'sm' | 'md'
}

export function BadgeDisplay({ badge, streak, size = 'md' }: BadgeDisplayProps) {
  const next    = getNextBadge(streak)
  const pctNext = next ? Math.min(100, Math.round((streak / next.minStreak) * 100)) : 100

  return (
    <div className="flex flex-col gap-3">

      {/* ── Carte badge principale ── */}
      <div className="rounded-3xl border border-zinc-100 bg-white p-4 flex flex-col gap-3">

        <div className="flex items-center gap-3">
          {/* Badge image ou emoji fallback */}
          <div className="w-16 h-16 flex-shrink-0">
            {badge.image ? (
              <img
                src={badge.image}
                alt={badge.label}
                className="w-full h-full object-contain"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                  if (fb) fb.style.display = 'flex'
                }}
              />
            ) : null}
            {/* Fallback emoji visible si image absente */}
            <div
              className="w-full h-full rounded-2xl bg-tta-light flex items-center justify-center text-3xl"
              style={{ display: badge.image ? 'none' : 'flex' }}
            >
              {badge.emoji}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-0.5">
              Badge actuel
            </p>
            <p className="font-extrabold text-zinc-900 text-base leading-tight">
              {badge.label}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span>🔥</span>
              <span className="text-sm font-bold text-orange-500">
                {streak} jour{streak > 1 ? 's' : ''} de série
              </span>
            </div>
          </div>
        </div>

        {/* Citation Waty */}
        <p className="text-xs text-zinc-500 italic leading-relaxed bg-zinc-50 rounded-2xl px-3 py-2.5">
          💬 &ldquo;{badge.watyMessage}&rdquo;
        </p>

        {/* Barre vers le badge suivant */}
        {next && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {next.image
                  ? <img src={next.image} alt={next.label} className="w-4 h-4 object-contain opacity-50" />
                  : <span className="text-sm opacity-50">{next.emoji}</span>
                }
                <span className="text-xs text-zinc-400">
                  Prochain : <span className="font-semibold text-zinc-600">{next.label}</span>
                </span>
              </div>
              <span className="text-xs text-zinc-400 font-bold">{streak}/{next.minStreak}j</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pctNext}%`, background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}
              />
            </div>
          </div>
        )}

        {!next && (
          <div className="flex items-center justify-center gap-2 bg-yellow-50 rounded-2xl py-2">
            <span className="text-sm">🏆</span>
            <p className="text-yellow-700 text-xs font-bold">Niveau maximum atteint !</p>
          </div>
        )}
      </div>

      {/* ── Rangée des 5 badges ── */}
      <div className="flex items-end justify-between gap-2 px-1">
        {BADGE_LEVELS.map((b) => {
          const earned  = streak >= b.minStreak
          const current = b.key === badge.key
          return (
            <div key={b.key} className="flex flex-col items-center gap-1 flex-1">
              <div className={`relative w-10 h-10 transition-all duration-300 ${earned ? '' : 'opacity-30 grayscale'}`}>
                {b.image ? (
                  <img src={b.image} alt={b.label} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-xl">
                    {b.emoji}
                  </div>
                )}
                {/* Cadenas si non déverrouillé */}
                {!earned && (
                  <img
                    src="/badges/badge-locked.png"
                    alt="verrouillé"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}
              </div>
              {/* Point indicateur badge actuel */}
              <div className={`w-1.5 h-1.5 rounded-full transition-all ${current ? 'bg-tta-mid' : 'bg-transparent'}`} />
            </div>
          )
        })}
      </div>

    </div>
  )
}
