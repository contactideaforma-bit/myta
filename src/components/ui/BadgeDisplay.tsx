'use client'

import type { BadgeLevel } from '@/lib/gamification'
import { getNextBadge } from '@/lib/gamification'

interface BadgeDisplayProps {
  badge:  BadgeLevel
  streak: number
  size?:  'sm' | 'md'
}

// Gradient par niveau de badge
const BADGE_GRADIENTS: Record<string, string> = {
  stagiaire: 'linear-gradient(135deg, #f59e0b 0%, #ef8c1a 100%)',
  acolyte:   'linear-gradient(135deg, #64748b 0%, #475569 100%)',
  heros:     'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
  waty:      'linear-gradient(135deg, #4B47A0 0%, #2BA8B0 100%)',
}

export function BadgeDisplay({ badge, streak, size = 'md' }: BadgeDisplayProps) {
  const next     = getNextBadge(streak)
  const gradient = BADGE_GRADIENTS[badge.key] ?? BADGE_GRADIENTS.waty
  const pctNext  = next ? Math.min(100, Math.round((streak / next.minStreak) * 100)) : 100

  return (
    <div className="flex flex-col gap-3">

      {/* ── Carte badge principale ── */}
      <div className="relative overflow-hidden rounded-3xl p-5" style={{ background: gradient }}>

        {/* Déco fond */}
        <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        {/* Ligne principale */}
        <div className="flex items-center gap-4 relative z-10">
          {/* Emoji dans un cercle */}
          <div className="w-16 h-16 rounded-2xl bg-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="text-3xl leading-none">{badge.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold text-base leading-tight">
              {badge.label}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xl">🔥</span>
              <span className="text-white/90 font-bold text-sm">
                {streak} jour{streak > 1 ? 's' : ''} de série
              </span>
            </div>
          </div>
          {/* Waty miniature */}
          <img
            src="/waty-nutrition.png"
            alt="Waty"
            className="w-10 h-10 object-contain opacity-80 flex-shrink-0"
          />
        </div>

        {/* Citation Waty */}
        <p className="relative z-10 text-white/80 text-xs italic leading-relaxed mt-3 border-t border-white/20 pt-3">
          💬 &ldquo;{badge.watyMessage}&rdquo;
        </p>

        {/* Barre progression vers badge suivant */}
        {next && (
          <div className="relative z-10 mt-3">
            <div className="flex justify-between text-white/60 text-[10px] mb-1.5">
              <span>Prochain : <span className="font-semibold text-white/80">{next.label} {next.emoji}</span></span>
              <span className="font-bold">{streak}/{next.minStreak}j</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${pctNext}%` }}
              />
            </div>
          </div>
        )}

        {/* Badge max */}
        {!next && (
          <div className="relative z-10 mt-3 flex items-center justify-center gap-2 bg-white/20 rounded-2xl py-2">
            <span className="text-sm">🏆</span>
            <p className="text-white text-xs font-bold">Niveau maximum atteint !</p>
          </div>
        )}
      </div>

    </div>
  )
}
