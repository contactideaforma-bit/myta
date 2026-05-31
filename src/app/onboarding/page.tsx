'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

const STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenue sur MYTA 🎉',
    subtitle: 'Ton coach digital personnel pour la nutrition, le sport et le sommeil.',
    content: null,
  },
  {
    id: 'goal',
    title: 'Quel est ton objectif ?',
    subtitle: 'On va personnaliser ton expérience en fonction de tes ambitions.',
    content: 'goal',
  },
  {
    id: 'activity',
    title: 'Ton niveau d\'activité ?',
    subtitle: 'Pour calculer tes besoins caloriques avec précision.',
    content: 'activity',
  },
  {
    id: 'ready',
    title: 'Tout est prêt ! 🚀',
    subtitle: 'Commence par choisir ton abonnement pour accéder à toutes les fonctionnalités.',
    content: null,
  },
]

const GOALS = [
  { value: 'perte de poids',  label: '🔥 Perdre du poids',    desc: 'Déficit calorique, cardio' },
  { value: 'prise de masse',  label: '💪 Prendre de la masse', desc: 'Surplus calorique, musculation' },
  { value: 'forme generale',  label: '⚡ Forme générale',      desc: 'Équilibre et bien-être' },
  { value: 'endurance',       label: '🏃 Endurance',           desc: 'Cardio, résistance' },
  { value: 'performance',     label: '🏆 Performance',         desc: 'Optimisation sportive' },
]

const ACTIVITIES = [
  { value: 1.2,   label: '🪑 Sédentaire',         desc: 'Bureau, peu de sport' },
  { value: 1.375, label: '🚶 Légèrement actif',    desc: '1 à 3 séances par semaine' },
  { value: 1.55,  label: '🏃 Modérément actif',    desc: '3 à 5 séances par semaine' },
  { value: 1.725, label: '⚡ Très actif',           desc: '6 à 7 séances par semaine' },
  { value: 1.9,   label: '🔥 Extrêmement actif',   desc: 'Sport intensif quotidien' },
]

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step, setStep]       = useState(0)
  const [goal, setGoal]       = useState('')
  const [activity, setActivity] = useState<number | null>(null)
  const [saving, setSaving]   = useState(false)

  const currentStep = STEPS[step]
  const isLast      = step === STEPS.length - 1
  const progress    = ((step + 1) / STEPS.length) * 100

  async function handleNext() {
    if (isLast) {
      // Sauvegarder les préférences dans le profil
      setSaving(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').upsert({
            id:              user.id,
            goal:            goal || null,
            activity_factor: activity || 1.55,
          }, { onConflict: 'id' })
        }
      } catch (err) { console.error(err) }
      setSaving(false)
      router.push('/pricing')
      return
    }

    // Validation par étape
    if (currentStep.content === 'goal' && !goal) return
    if (currentStep.content === 'activity' && !activity) return

    setStep(s => s + 1)
  }

  function canProceed() {
    if (currentStep.content === 'goal') return !!goal
    if (currentStep.content === 'activity') return !!activity
    return true
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-5 py-10"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}
    >
      <div className="w-full max-w-sm flex flex-col gap-6 flex-1">

        {/* Logo */}
        <div className="flex justify-center">
          <img src="/logo_my_twin_app.png" alt="MYTA" className="h-10 object-contain" />
        </div>

        {/* Barre de progression */}
        <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}
          />
        </div>
        <p className="text-center text-xs text-zinc-400">Étape {step + 1} sur {STEPS.length}</p>

        {/* Contenu */}
        <div className="flex flex-col gap-6 flex-1">

          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{currentStep.title}</h1>
            <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{currentStep.subtitle}</p>
          </div>

          {/* Étape welcome */}
          {currentStep.id === 'welcome' && (
            <div className="flex flex-col gap-3">
              {[
                { icon: '🥗', label: 'Journal alimentaire avec IA' },
                { icon: '🏋️', label: 'Suivi sportif et Tabata' },
                { icon: '😴', label: 'Analyse du sommeil' },
                { icon: '🤖', label: 'Coach Waty personnalisé' },
                { icon: '📊', label: 'Bilan santé hebdomadaire' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm">
                  <span className="text-xl">{f.icon}</span>
                  <p className="text-sm font-semibold text-zinc-800">{f.label}</p>
                  <Check size={16} className="ml-auto text-nutri-mid" />
                </div>
              ))}
            </div>
          )}

          {/* Étape objectif */}
          {currentStep.content === 'goal' && (
            <div className="flex flex-col gap-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border-2 transition-all text-left ${
                    goal === g.value ? 'border-tta-mid bg-tta-light' : 'border-transparent hover:border-zinc-200'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-900">{g.label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{g.desc}</p>
                  </div>
                  {goal === g.value && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Étape activité */}
          {currentStep.content === 'activity' && (
            <div className="flex flex-col gap-2">
              {ACTIVITIES.map(a => (
                <button
                  key={a.value}
                  onClick={() => setActivity(a.value)}
                  className={`flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-sm border-2 transition-all text-left ${
                    activity === a.value ? 'border-tta-mid bg-tta-light' : 'border-transparent hover:border-zinc-200'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-900">{a.label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{a.desc}</p>
                  </div>
                  {activity === a.value && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Étape ready */}
          {currentStep.id === 'ready' && (
            <div className="flex flex-col items-center gap-5">
              <div className="text-7xl animate-bounce">🎯</div>
              <div className="bg-white rounded-2xl p-5 shadow-sm w-full flex flex-col gap-3">
                <p className="text-sm font-bold text-zinc-900">Ton profil :</p>
                {goal && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check size={14} className="text-nutri-mid flex-shrink-0" />
                    Objectif : <span className="font-semibold">{GOALS.find(g => g.value === goal)?.label}</span>
                  </div>
                )}
                {activity && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Check size={14} className="text-nutri-mid flex-shrink-0" />
                    Activité : <span className="font-semibold">{ACTIVITIES.find(a => a.value === activity)?.label}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Check size={14} className="text-nutri-mid flex-shrink-0" />
                  <span>3 jours d'essai gratuit inclus</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bouton suivant */}
        <button
          onClick={handleNext}
          disabled={!canProceed() || saving}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" />Sauvegarde…</>
          ) : isLast ? (
            <>Choisir mon abonnement <ArrowRight size={18} /></>
          ) : (
            <>Continuer <ArrowRight size={18} /></>
          )}
        </button>

        {/* Legal */}
        {step === 0 && (
          <p className="text-center text-xs text-zinc-400">
            En continuant, tu acceptes nos{' '}
            <a href="/legal" className="text-tta-mid hover:underline">CGU</a>
            {' '}et notre{' '}
            <a href="/legal#confidentialite" className="text-tta-mid hover:underline">politique de confidentialité</a>
          </p>
        )}
      </div>
    </div>
  )
}
