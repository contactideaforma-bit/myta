'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/utils'
import type { DailyChallenge } from '@/lib/gamification'

interface ChallengeCardProps {
  challenges:          DailyChallenge[]
  completedKeys:       string[]
  onComplete:          (key: string) => void
}

export function ChallengeCard({ challenges, completedKeys, onComplete }: ChallengeCardProps) {
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  async function complete(challenge: DailyChallenge) {
    if (completedKeys.includes(challenge.key) || saving) return
    setSaving(challenge.key)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Tente l'insert, ignore le conflit si déjà existant
      // Conflit unique = déjà complété, pas d'erreur à remonter
      try {
        await supabase.from('challenge_completions').insert(
          { user_id: user.id, challenge_key: challenge.key, completed_date: todayISO() }
        )
      } catch { /* ignore */ }
    }
    onComplete(challenge.key)
    setSaving(null)
  }

  const allDone = challenges.every(c => completedKeys.includes(c.key))

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-zinc-900 text-sm flex items-center gap-1.5">
          🎯 Challenge du jour
        </h2>
        {allDone && (
          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
            ✓ Complété !
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {challenges.map(challenge => {
          const done = completedKeys.includes(challenge.key)
          const isSaving = saving === challenge.key

          return (
            <button
              key={challenge.key}
              onClick={() => complete(challenge)}
              disabled={done || !!saving}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left
                ${done
                  ? 'bg-green-50 border-green-300'
                  : 'bg-zinc-50 border-zinc-100 hover:border-tta-mid/50 hover:bg-tta-light active:scale-[0.98]'
                }`}
            >
              <span className="text-xl flex-shrink-0">{challenge.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${done ? 'text-green-700' : 'text-zinc-800'}`}>
                  {challenge.label}
                </p>
                {done && (
                  <p className="text-[10px] text-green-600 mt-0.5">
                    💬 {challenge.watyMessage}
                  </p>
                )}
              </div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                ${done ? 'bg-green-500' : 'bg-zinc-200'}`}>
                {isSaving
                  ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : done
                    ? <span className="text-white text-xs font-bold">✓</span>
                    : <span className="text-zinc-400 text-xs">→</span>
                }
              </div>
            </button>
          )
        })}
      </div>

      {allDone && (
        <div className="bg-green-50 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm font-bold text-green-700">
            🎉 Waty est fier de toi aujourd'hui !
          </p>
          <p className="text-xs text-green-600 mt-0.5">Tous les challenges du jour complétés</p>
        </div>
      )}
    </div>
  )
}
