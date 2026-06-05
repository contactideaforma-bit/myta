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
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 p-5">

        {/* Fond dégradé discret */}
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse at top right, #4B47A0, transparent 60%)' }} />

        {/* Contenu */}
        <div className="relative z-10 flex items-center gap-4">

          {/* Badge image */}
          <div className="w-20 h-20 flex-shrink-0 drop-shadow-2xl">
            {badge.image ? (
              <img
                src={badge.image}
                alt={badge.label}
                className="w-full h-full object-contain"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-white/10 flex items-center justify-center text-4xl">
                {badge.emoji}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">
              Badge actuel
            </p>
            <p className="text-white font-extrabold text-lg leading-tight">
              {badge.label}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-lg">🔥</span>
              <span className="text-white/80 font-bold text-sm">
                {streak} jour{streak > 1 ? 's' : ''} de série
              </span>
            </div>
          </div>
        </div>

        {/* Citation Waty */}
        <p className="relative z-10 text-white/60 text-xs italic leading-relaxed mt-4 border-t border-white/10 pt-3">
          💬 &ldquo;{badge.watyMessage}&rdquo;
        </p>

        {/* Barre vers le badge suivant */}
        {next && (
          <div className="relative z-10 mt-3">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="flex items-center gap-1.5">
                {next.image && (
                  <img src={next.image} alt={next.label} className="w-5 h-5 object-contain opacity-60" />
                )}
                <span className="text-white/40 text-[10px]">
                  Prochain : <span className="text-white/70 font-semibold">{next.label}</span>
                </span>
              </div>
              <span className="text-white/50 text-[10px] font-bold flex-shrink-0">
                {streak}/{next.minStreak}j
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pctNext}%`,
                  background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)',
                }}
              />
            </div>
          </div>
        )}

        {/* Badge max */}
        {!next && (
          <div className="relative z-10 mt-3 flex items-center justify-center gap-2 bg-white/10 rounded-2xl py-2">
            <span className="text-sm">🏆</span>
            <p className="text-white/80 text-xs font-bold">Niveau maximum — tu es une légende !</p>
          </div>
        )}
      </div>

      {/* ── Tous les badges (progression) ── */}
      <div className="flex items-center justify-between gap-1 px-1">
        {BADGE_LEVELS.map((b) => {
          const earned  = streak >= b.minStreak
          const current = b.key === badge.key
          return (
            <div key={b.key} className="flex flex-col items-center gap-1 flex-1">
              <div className={`relative w-10 h-10 transition-all ${earned ? 'opacity-100' : 'opacity-25 grayscale'}`}>
                {b.image ? (
                  <img src={b.image} alt={b.label} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-200 flex items-center justify-center text-lg">
                    {b.emoji}
                  </div>
                )}
                {/* Badge non déverrouillé */}
                {!earned && (
                  <img
                    src="/badges/badge-locked.png"
                    alt="locked"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}
                {/* Indicateur badge actuel */}
                {current && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-tta-mid" />
                )}
              </div>
              <p className={`text-[8px] text-center leading-tight font-semibold ${current ? 'text-tta-mid' : 'text-zinc-400'}`}>
                {b.minStreak}j
              </p>
            </div>
          )
        })}
      </div>

    </div>
  )
}
