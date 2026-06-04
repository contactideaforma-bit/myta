'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ─── Étapes du tour ───────────────────────────────────────────────────────────
interface TourStep {
  targetId: string | null   // null = tooltip centré à l'écran
  title: string
  description: string
  preferTop?: boolean       // forcer tooltip au-dessus de l'élément
}

const STEPS: TourStep[] = [
  {
    targetId: 'tour-greeting',
    title: '👋 Ton tableau de bord',
    description: 'Ici tu retrouves la date du jour et ton prénom. C\'est ton point de départ — tout part de là.',
  },
  {
    targetId: 'tour-objectives',
    title: '🎯 Tes objectifs',
    description: 'Suis tes calories, protéines, séances sport et calories brûlées. Bascule entre la vue semaine et la vue mois.',
  },
  {
    targetId: 'tour-weight',
    title: '⚖️ Suivi du poids',
    description: 'Note ton poids chaque jour pour voir ta courbe de progression sur 30 jours. La régularité fait tout !',
  },
  {
    targetId: 'tour-nutrition',
    title: '🥗 Journal alimentaire',
    description: 'Note tes repas ici. MYTA calcule automatiquement calories et macros. Tu peux aussi générer des recettes avec l\'IA !',
    preferTop: true,
  },
  {
    targetId: 'tour-sport',
    title: '🏋️ Séances sport',
    description: 'Enregistre tes entraînements, utilise le timer Tabata HIIT ou consulte ton historique de séances.',
    preferTop: true,
  },
  {
    targetId: null,
    title: '🚀 Tu es prêt(e) !',
    description: 'Voilà, tu connais les bases de MYTA. Retrouve ce guide à tout moment depuis le menu ☰. Bonne utilisation !',
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface TargetRect { top: number; left: number; width: number; height: number }

export interface TourGuideProps {
  onDone: () => void
}

const PAD = 10 // padding autour du spotlight

// ─── Composant principal ──────────────────────────────────────────────────────
export function TourGuide({ onDone }: TourGuideProps) {
  const router = useRouter()
  const [step, setStep]             = useState(0)
  const [rect, setRect]             = useState<TargetRect | null>(null)
  const [tooltipAbove, setTooltipAbove] = useState(false)

  const currentStep = STEPS[step]
  const isLast      = step === STEPS.length - 1

  // ── Mise à jour du spotlight ────────────────────────────────────────────────
  const updateRect = useCallback(() => {
    const s = STEPS[step]
    if (!s.targetId) { setRect(null); return }

    const el = document.getElementById(s.targetId)
    if (!el) { setRect(null); return }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })

      // Mettre le tooltip au-dessus si l'élément est en bas d'écran ou si preferTop
      const spaceBelow = window.innerHeight - r.bottom
      setTooltipAbove(!!s.preferTop || spaceBelow < 200)
    }, 200)
  }, [step])

  useEffect(() => { updateRect() }, [updateRect])

  useEffect(() => {
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [updateRect])

  // ── Navigation ───────────────────────────────────────────────────────────────
  function handleNext() {
    if (isLast) {
      onDone()
      router.push('/guide')
    } else {
      setStep(s => s + 1)
    }
  }

  function handlePrev() {
    if (step > 0) setStep(s => s - 1)
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  const spotlightTop  = rect ? rect.top  - PAD : 0
  const spotlightLeft = rect ? rect.left - PAD : 0
  const spotlightW    = rect ? rect.width  + PAD * 2 : 0
  const spotlightH    = rect ? rect.height + PAD * 2 : 0

  return (
    <div className="fixed inset-0 z-[70]" style={{ pointerEvents: 'all' }}>

      {/* ── Fond sombre ── */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onDone}
      />

      {/* ── Spotlight (trou dans l'overlay) ── */}
      {rect && (
        <div
          className="absolute rounded-2xl transition-all duration-300"
          style={{
            top:       spotlightTop,
            left:      spotlightLeft,
            width:     spotlightW,
            height:    spotlightH,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
            border:    '2px solid rgba(75,71,160,0.9)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* ── Tooltip ── */}
      <div
        className="absolute inset-x-0 px-4 flex flex-col items-center"
        style={{
          pointerEvents: 'none',
          zIndex: 2,
          ...(rect
            ? tooltipAbove
              // au-dessus de l'élément
              ? { bottom: window.innerHeight - spotlightTop + 12 }
              // en-dessous de l'élément
              : { top: spotlightTop + spotlightH + 12 }
            // centré verticalement (dernière étape)
            : { top: '50%', transform: 'translateY(-50%)' }
          ),
        }}
      >
        <div className="w-full max-w-sm" style={{ pointerEvents: 'all' }}>
          <TooltipCard
            step={currentStep}
            stepIndex={step}
            totalSteps={STEPS.length}
            isLast={isLast}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={onDone}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Carte tooltip ────────────────────────────────────────────────────────────
function TooltipCard({
  step, stepIndex, totalSteps, isLast, onNext, onPrev, onSkip,
}: {
  step: TourStep
  stepIndex: number
  totalSteps: number
  isLast: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}) {
  return (
    <div className="bg-white rounded-3xl shadow-2xl p-5 w-full">

      {/* Barre de progression + fermer */}
      <div className="flex items-center gap-1.5 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300 flex-shrink-0"
            style={{
              width:      i === stepIndex ? 20 : 6,
              background: i === stepIndex ? '#4B47A0' : '#e4e4e7',
            }}
          />
        ))}
        <div className="flex-1" />
        <button
          onClick={onSkip}
          className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
        >
          <X size={11} className="text-zinc-400" />
        </button>
      </div>

      {/* Contenu */}
      <h3 className="font-extrabold text-zinc-900 text-base mb-1">{step.title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed mb-4">{step.description}</p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {stepIndex > 0 && (
          <button
            onClick={onPrev}
            className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0 hover:bg-zinc-200 transition-colors"
          >
            <ArrowLeft size={16} className="text-zinc-500" />
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-bold text-sm shadow active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}
        >
          {isLast
            ? <><BookOpen size={15} /> Voir le guide complet</>
            : <>Suivant <ArrowRight size={15} /></>
          }
        </button>
      </div>

      {/* Étape X / N */}
      <p className="text-center text-[10px] text-zinc-300 mt-2">
        {stepIndex + 1} / {totalSteps}
      </p>
    </div>
  )
}
