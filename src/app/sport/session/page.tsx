'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Play, Pause, ChevronLeft,
  CheckCircle2, Loader2, Clock, Flame, Circle,
  Plus, Trash2, Pencil, X, Check, AlertTriangle,
  Mic, ChevronDown, ChevronUp, PenLine, Send,
} from 'lucide-react'
import { VoiceSession } from '@/components/sport/VoiceSession'
import { Waty, WATY_MESSAGES } from '@/components/ui/Waty'

type InputMode = 'none' | 'voice' | 'text'

// ─── Conseils sportifs ────────────────────────────────────────────────────────
const SPORT_TIPS = [
  { icon: '💧', titre: 'Hydratation', conseil: 'Bois 500ml d\'eau 2h avant l\'effort. Pendant l\'exercice, vise 150-200ml toutes les 20 minutes.' },
  { icon: '🔥', titre: 'Échauffement', conseil: '10 minutes d\'échauffement dynamique réduisent le risque de blessure de 50%. Ne saute jamais cette étape.' },
  { icon: '😴', titre: 'Récupération', conseil: 'Le muscle se construit pendant le repos, pas pendant l\'effort. Dors 7 à 9h et laisse 48h entre deux séances du même groupe musculaire.' },
  { icon: '🥩', titre: 'Protéines post-effort', conseil: 'Mange des protéines dans les 30 minutes après ta séance. 20-40g suffisent pour optimiser la récupération musculaire.' },
  { icon: '📈', titre: 'Progression', conseil: 'Augmente la charge ou les répétitions de 5-10% maximum par semaine. La progression lente est durable, la progression rapide mène à la blessure.' },
  { icon: '🧘', titre: 'Étirements', conseil: 'Après l\'effort, 10 minutes d\'étirements statiques réduisent les courbatures et améliorent la flexibilité sur le long terme.' },
  { icon: '⏱️', titre: 'Temps de repos', conseil: 'Entre les séries : 60-90s pour l\'endurance, 2-3min pour la force. Respecter le repos est aussi important que l\'exercice lui-même.' },
  { icon: '🫀', titre: 'Cardio & santé', conseil: '150 minutes de cardio modéré par semaine réduisent le risque cardiovasculaire de 35%. Même 30 min de marche rapide comptent !' },
  { icon: '🏋️', titre: 'Technique avant tout', conseil: 'Une mauvaise technique avec une charge lourde = blessure assurée. Maîtrise le mouvement avec peu de poids avant d\'augmenter.' },
  { icon: '📊', titre: 'Variété', conseil: 'Varie tes entraînements toutes les 4-6 semaines pour éviter l\'adaptation et continuer à progresser.' },
  { icon: '🌡️', titre: 'Retour au calme', conseil: '5-10 minutes de cardio léger après une séance intense aide à éliminer l\'acide lactique et réduit les douleurs du lendemain.' },
  { icon: '🧠', titre: 'Mental & effort', conseil: 'La fatigue mentale précède souvent la fatigue physique. Si ta tête dit stop mais ton corps peut continuer, pousse encore un peu.' },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface Exercise {
  name: string
  sets: number | null
  reps: number | null
  duration_sec: number | null
  rest_sec: number | null
  tips: string
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function TipCard({ tip }: { tip: typeof SPORT_TIPS[0] }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen(v => !v)}
      className="w-full text-left card-sm transition-all hover:shadow-sm active:scale-[0.98]">
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">{tip.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-zinc-900">{tip.titre}</p>
          {!open && <p className="text-xs text-zinc-400 truncate mt-0.5">{tip.conseil}</p>}
        </div>
        {open ? <ChevronUp size={16} className="text-zinc-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-zinc-400 flex-shrink-0" />}
      </div>
      {open && <p className="text-sm text-zinc-600 leading-relaxed mt-3 pl-11">{tip.conseil}</p>}
    </button>
  )
}

function QuitModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="font-extrabold text-zinc-900">Séance en cours</p>
            <p className="text-xs text-zinc-400 mt-0.5">Voulez-vous vraiment quitter ?</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Si vous quittez maintenant, votre séance sera perdue et le chrono s'arrêtera.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border-2 border-zinc-200 text-sm font-bold text-zinc-700">
            Continuer
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-red-400 text-white text-sm font-bold">
            Quitter
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant saisie texte ───────────────────────────────────────────────────
function TextSession({ onConfirm, onCancel }: {
  onConfirm: (session: any) => void
  onCancel: () => void
}) {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const EXAMPLES = [
    "30 min de vélo elliptique intensité modérée",
    "3 séries de 12 squats, 3 séries de 10 pompes, 20 min de tapis",
    "1h de natation : 500m crawl + 200m dos",
    "Boxe 45 min : échauffement, shadow boxing, sac",
    "HIIT 20 min + gainage 10 min",
  ]

  async function submit() {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/voice-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
      onConfirm(data.session)
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'analyse')
    }
    setLoading(false)
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-extrabold text-zinc-900">✍️ Décris ta séance</p>
        <button onClick={onCancel} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-200">
          <X size={14} />
        </button>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ex: J'ai fait 30 min de tapis marche rapide puis 3 séries de 15 squats et 10 pompes..."
        rows={4}
        className="w-full px-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-sport resize-none transition-colors"
        autoFocus
      />

      {/* Exemples cliquables */}
      <div>
        <p className="text-xs text-zinc-400 mb-2 font-semibold">Exemples :</p>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setText(ex)}
              className="text-left text-xs text-sport bg-sport-light px-3 py-2 rounded-xl hover:bg-sport/20 transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
      )}

      <button onClick={submit} disabled={!text.trim() || loading}
        className="btn-sport justify-center py-3 disabled:opacity-50">
        {loading
          ? <><Loader2 size={16} className="animate-spin" />Analyse en cours…</>
          : <><Send size={16} />Analyser ma séance</>
        }
      </button>
    </div>
  )
}


  const router   = useRouter()
  const supabase = createClient()

  const [inputMode, setInputMode]         = useState<InputMode>('none')
  const [exercises, setExercises]         = useState<Exercise[]>([])
  const [step, setStep]                   = useState<1 | 2 | 3>(1)
  const [checkedExercises, setCheckedExercises] = useState<Set<number>>(new Set())
  const [elapsed, setElapsed]             = useState(0)
  const [paused, setPaused]               = useState(true)
  const [showQuitModal, setShowQuitModal] = useState(false)
  const [notes, setNotes]                 = useState('')
  const [saving, setSaving]               = useState(false)
  const [disciplineName, setDisciplineName] = useState('')
  const [disciplineId, setDisciplineId]   = useState<string | null>(null)

  const intervalRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef       = useRef<number | null>(null)
  const elapsedBeforePause = useRef(0)

  // Mélange aléatoire des tips
  const [shuffledTips] = useState(() => [...SPORT_TIPS].sort(() => Math.random() - 0.5))

  const startTimer = useCallback(() => {
    if (intervalRef.current) return
    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current)
        setElapsed(elapsedBeforePause.current + Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 500)
  }, [])

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      elapsedBeforePause.current = elapsed
      startTimeRef.current = null
    }
  }, [elapsed])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  function togglePause() {
    if (paused) { startTimer(); setPaused(false) }
    else { pauseTimer(); setPaused(true) }
  }

  function toggleExercise(i: number) {
    setCheckedExercises(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function handleVoiceConfirm(voiceSession: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const discName = voiceSession.discipline.charAt(0).toUpperCase() + voiceSession.discipline.slice(1)
    const { data: disc } = await supabase.from('disciplines').select('id').ilike('name', discName).single()
    const { data: profile } = await supabase.from('profiles').select('weight_kg').eq('id', user.id).single()
    const weight = (profile as any)?.weight_kg ?? 70

    const { data: session } = await supabase.from('sessions').insert({
      user_id: user.id,
      discipline_id: (disc as any)?.id ?? null,
      session_date: new Date().toISOString().slice(0, 10),
      duration_min: voiceSession.duration_min,
      calories_burned: voiceSession.calories_estimate ?? Math.round(5 * weight * (voiceSession.duration_min / 60)),
      notes: voiceSession.notes ?? null,
    }).select().single()

    if (session && voiceSession.exercises?.length > 0) {
      await supabase.from('session_exercises').insert(
        voiceSession.exercises.map((ex: any) => ({
          session_id: session.id,
          exercise_name: ex.name,
          sets: ex.sets ?? null,
          reps: ex.reps ?? null,
          duration_sec: ex.duration_sec ?? null,
          weight_kg: null,
        }))
      )
    }
    ;(window as any).__sessionActive = false
    router.push('/dashboard')
  }

  async function saveSession() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: profile } = await supabase.from('profiles').select('weight_kg').eq('id', user.id).single()
    const weight = (profile as any)?.weight_kg ?? 70
    const duration_min = Math.max(1, Math.round(elapsed / 60))
    const calories = Math.round(5 * weight * (duration_min / 60))
    const doneExos = checkedExercises.size > 0 ? exercises.filter((_, i) => checkedExercises.has(i)) : exercises

    const { data: session } = await supabase.from('sessions').insert({
      user_id: user.id,
      discipline_id: disciplineId,
      session_date: new Date().toISOString().slice(0, 10),
      duration_min,
      calories_burned: calories,
      notes: notes.trim() || null,
    }).select().single()

    if (session && doneExos.length > 0) {
      await supabase.from('session_exercises').insert(
        doneExos.map(ex => ({
          session_id: session.id,
          exercise_name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          duration_sec: ex.duration_sec,
          weight_kg: null,
        }))
      )
    }
    ;(window as any).__sessionActive = false
    router.push('/dashboard')
  }

  // ── STEP 1 — Accueil + vocal + conseils ───────────────────────────────────
  if (step === 1) return (
    <div className="page">
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">Nouvelle séance</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Décris ta séance à voix haute</p>
      </div>

      {/* Waty */}
      <Waty mode="sport" message={WATY_MESSAGES.sport_start} size="sm" />

      {/* Mode vocal */}
      {inputMode === 'voice' ? (
        <VoiceSession
          onConfirm={handleVoiceConfirm}
          onCancel={() => setInputMode('none')}
        />
      ) : inputMode === 'text' ? (
        <TextSession
          onConfirm={handleVoiceConfirm}
          onCancel={() => setInputMode('none')}
        />
      ) : (
        /* Deux boutons côte à côte */
        <div className="flex flex-col gap-3">
          <button onClick={() => setInputMode('voice')}
            className="w-full bg-gradient-to-br from-sport to-tta-mid rounded-3xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
            <div className="w-14 h-14 bg-white/25 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Mic size={26} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-white text-base">Décrire en vocal</p>
              <p className="text-sm text-white/70 mt-0.5">Parle, l'IA enregistre</p>
              <p className="text-xs text-white/50 mt-1 italic">"30 min de vélo et 3 séries..."</p>
            </div>
          </button>

          <button onClick={() => setInputMode('text')}
            className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 border-2 border-sport/30 hover:border-sport hover:bg-sport-light transition-all active:scale-[0.98]">
            <div className="w-14 h-14 bg-sport-light rounded-2xl flex items-center justify-center flex-shrink-0">
              <PenLine size={26} className="text-sport" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-zinc-900 text-base">Décrire par écrit</p>
              <p className="text-sm text-zinc-400 mt-0.5">Tape ta séance, l'IA analyse</p>
              <p className="text-xs text-zinc-300 mt-1 italic">"J'ai fait 15 min de tapis..."</p>
            </div>
          </button>
        </div>
      )}

      {/* Séparateur + conseils — seulement si pas de mode actif */}
      {inputMode === 'none' && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-200" />
            <p className="text-xs text-zinc-400 font-semibold">CONSEILS DU COACH</p>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          {/* Bulles de conseils */}
          <div className="flex flex-col gap-2">
            {shuffledTips.map((tip, i) => (
              <TipCard key={i} tip={tip} />
            ))}
          </div>
        </>
      )}
    </div>
  )

  return null
}
