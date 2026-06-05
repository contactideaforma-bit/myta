'use client'

import type { BadgeLevel } from '@/lib/gamification'
import { getNextBadge } from '@/lib/gamification'

interface BadgeDisplayProps {
  badge:  BadgeLevel
  streak: number
  size?:  'sm' | 'md'
}

export function BadgeDisplay({ badge, streak, size = 'md' }: BadgeDisplayProps) {
  const next    = getNextBadge(streak)
  const isSmall = size === 'sm'

  return (
    <div className={`flex flex-col gap-2 ${isSmall ? '' : ''}`}>
      {/* Badge principal */}
      <div className={`flex items-center gap-3 ${badge.color} rounded-2xl px-4 ${isSmall ? 'py-2.5' : 'py-3'}`}>
        <span className={isSmall ? 'text-2xl' : 'text-3xl'}>{badge.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-extrabold ${badge.textColor} ${isSmall ? 'text-sm' : 'text-base'} leading-tight`}>
            {badge.label}
          </p>
          <p className={`${badge.textColor} opacity-70 ${isSmall ? 'text-[10px]' : 'text-xs'} mt-0.5`}>
            🔥 Série : {streak} jour{streak > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Message Waty */}
      <p className={`text-zinc-500 italic leading-relaxed px-1 ${isSmall ? 'text-[11px]' : 'text-xs'}`}>
        💬 {badge.watyMessage}
      </p>

      {/* Prochain badge */}
      {next && (
        <div className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2">
          <span className="text-base">{next.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-zinc-400">Prochain : <span className="font-bold text-zinc-600">{next.label}</span></p>
            <div className="h-1.5 bg-zinc-200 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-tta-mid rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((streak / next.minStreak) * 100))}%` }}
              />
            </div>
            <p className="text-[9px] text-zinc-400 mt-0.5">
              {streak}/{next.minStreak} jours
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
