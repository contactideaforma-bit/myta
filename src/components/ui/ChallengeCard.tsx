'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/utils'
import type { DailyChallenge } from '@/lib/gamification'

const CUSTOM_CHALLENGE_KEY = 'myta_custom_challenge'

interface CustomChallenge {
  label: string
  emoji: string
}

interface ChallengeCardProps {
  challenges:          DailyChallenge[]
  completedKeys:       string[]
  onComplete:          (key: string) => void
}

const EMOJI_OPTIONS = ['💪','🏃','🚴','🧘','🎯','🔥','⚡','🌟','🥊','🏊','🚶','🍎','💧','😤','🏆']

export function ChallengeCard({ challenges, completedKeys, onComplete }: ChallengeCardProps) {
  const [saving, setSaving] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [customChallenge, setCustomChallenge] = useState<CustomChallenge | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('💪')
  const supabase = createClient()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_CHALLENGE_KEY)
      if (stored) setCustomChallenge(JSON.parse(stored))
    } catch {}
  }, [])

  function saveCustomChallenge() {
    if (!newLabel.trim()) return
    const c: CustomChallenge = { label: newLabel.trim(), emoji: newEmoji }
    localStorage.setItem(CUSTOM_CHALLENGE_KEY, JSON.stringify(c))
    setCustomChallenge(c)
    setShowCreateModal(false)
    setNewLabel('')
  }

  function deleteCustomChallenge() {
    localStorage.removeItem(CUSTOM_CHALLENGE_KEY)
    setCustomChallenge(null)
  }

  const customKey = 'custom_challenge'
  const allChallenges: DailyChallenge[] = [
    ...challenges,
    ...(customChallenge ? [{
      key: customKey,
      label: customChallenge.label,
      emoji: customChallenge.emoji,
      watyMessage: 'Challenge perso complété ! Tu te connais mieux que personne.',
    }] : []),
  ]

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

  const allDone = allChallenges.every(c => completedKeys.includes(c.key))

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-zinc-900 text-sm flex items-center gap-1.5">
          🎯 Challenge du jour
        </h2>
        <div className="flex items-center gap-2">
          {allDone && (
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
              ✓ Complété !
            </span>
          )}
          {!customChallenge && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 text-[10px] font-bold text-tta-mid bg-tta-light px-2 py-1 rounded-full hover:bg-tta-mid hover:text-white transition-all"
            >
              <Plus size={10} /> Mon challenge
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {allChallenges.map(challenge => {
          const done = completedKeys.includes(challenge.key)
          const isSaving = saving === challenge.key

          return (
            <div key={challenge.key} className="relative">
            {challenge.key === customKey && !done && (
              <button
                onClick={deleteCustomChallenge}
                className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-zinc-300 hover:bg-red-400 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={10} className="text-white" />
              </button>
            )}
            <button
              onClick={() => complete(challenge)}
              disabled={done || !!saving}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left
                ${done
                  ? 'bg-green-50 border-green-300'
                  : challenge.key === customKey
                    ? 'bg-violet-50 border-violet-200 hover:border-violet-400 hover:bg-violet-100 active:scale-[0.98]'
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
                ${done ? 'bg-green-500' : challenge.key === customKey ? 'bg-violet-200' : 'bg-zinc-200'}`}>
                {isSaving
                  ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : done
                    ? <span className="text-white text-xs font-bold">✓</span>
                    : <span className="text-zinc-400 text-xs">→</span>
                }
              </div>
            </button>
            </div>
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

      {/* ── Modal création challenge perso ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
              <h3 className="font-extrabold text-zinc-900">✍️ Mon challenge perso</h3>
              <button onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200">
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Sélection emoji */}
              <div>
                <p className="text-xs font-bold text-zinc-500 mb-2">Choisis une icône</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => setNewEmoji(e)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${newEmoji === e ? 'bg-violet-100 ring-2 ring-violet-400 scale-110' : 'bg-zinc-50 hover:bg-zinc-100'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              {/* Label */}
              <div>
                <p className="text-xs font-bold text-zinc-500 mb-2">Décris ton challenge</p>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Ex : 100 pompes aujourd'hui"
                  maxLength={60}
                  className="input w-full"
                  onKeyDown={e => e.key === 'Enter' && saveCustomChallenge()}
                />
                <p className="text-[10px] text-zinc-400 mt-1 text-right">{newLabel.length}/60</p>
              </div>
              <button
                onClick={saveCustomChallenge}
                disabled={!newLabel.trim()}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'linear-gradient(90deg, #4B47A0, #7b7fd4)' }}
              >
                {newEmoji} Enregistrer mon challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
