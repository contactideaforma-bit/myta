'use client'

import { ArrowRight, X } from 'lucide-react'

/**
 * Carte de coaching Waty pour le parcours d'onboarding guidé.
 * Affichée en haut d'une page quand c'est l'étape active du parcours.
 */
export default function OnboardingCoach({
  mode = 'nutrition',
  title,
  message,
  ctaLabel,
  onCta,
  onSkip,
  busy = false,
}: {
  mode?:    'nutrition' | 'sport'
  title:    string
  message:  string
  ctaLabel?: string
  onCta?:   () => void
  onSkip?:  () => void
  busy?:    boolean
}) {
  const avatar = mode === 'sport' ? '/waty-sport.png' : '/waty-nutrition.png'

  return (
    <div className="relative w-full rounded-3xl p-4 sm:p-5 border-2 shadow-sm"
      style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #e8fbf8 100%)', borderColor: '#c7d2fe' }}>

      {onSkip && (
        <button onClick={onSkip} aria-label="Passer le guide"
          className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600">
          <X size={16} />
        </button>
      )}

      <div className="flex items-start gap-3">
        <img src={avatar} alt="Waty" className="w-12 h-12 object-contain flex-shrink-0 drop-shadow-sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#4B47A0] mb-0.5">Waty t&apos;accompagne</p>
          <h3 className="text-sm font-extrabold text-zinc-900 leading-snug">{title}</h3>
          <p className="text-sm text-zinc-600 leading-relaxed mt-1">{message}</p>

          {ctaLabel && onCta && (
            <button onClick={onCta} disabled={busy}
              className="mt-3 inline-flex items-center gap-2 py-2.5 px-4 rounded-2xl text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              {ctaLabel}<ArrowRight size={15} />
            </button>
          )}

          {onSkip && (
            <button onClick={onSkip}
              className="block mt-2 text-xs text-zinc-400 hover:text-zinc-600 underline">
              Passer le guide
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
