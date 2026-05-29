'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Waves, Dumbbell, Bike, Swords,
  Play, Pause, ChevronLeft,
  CheckCircle2, Loader2, Clock, Flame, Circle,
  Plus, Trash2, Pencil, X, Check, AlertTriangle,
  Mic,
} from 'lucide-react'
import { VoiceSession } from '@/components/sport/VoiceSession'
import { Waty, WATY_MESSAGES } from '@/components/ui/Waty'

interface Exercise {
  name: string
  sets: number | null
  reps: number | null
  duration_sec: number | null
  rest_sec: number | null
  tips: string
  use_count?: number
}

interface DBExercise {
  id: string
  name: string
  description: string | null
  difficulty: string | null
  met_value: number | null
  use_count: number
}

interface DisciplineOption {
  slug: string
  label: string
  Icon: React.ElementType
  desc: string
  colors: { card: string; badge: string; text: string; dot: string }
}

const DISCIPLINES: DisciplineOption[] = [
  { slug: 'natation',    label: 'Natation',    Icon: Waves,    desc: 'Piscine & endurance aquatique', colors: { card: 'hover:border-swim/60 hover:bg-swim-light/40',     badge: 'bg-swim-light text-swim-dark',     text: 'text-swim-dark',   dot: 'bg-swim'   } },
  { slug: 'musculation', label: 'Musculation', Icon: Dumbbell, desc: 'Force & hypertrophie',          colors: { card: 'hover:border-gym/60 hover:bg-gym-light/40',       badge: 'bg-gym-light text-gym-dark',       text: 'text-gym-dark',    dot: 'bg-gym'    } },
  { slug: 'cardio',      label: 'Cardio',      Icon: Bike,     desc: 'Course, vélo & HIIT',           colors: { card: 'hover:border-cardio/60 hover:bg-cardio-light/40', badge: 'bg-cardio-light text-cardio-dark', text: 'text-cardio-dark', dot: 'bg-cardio' } },
  { slug: 'boxe',        label: 'Boxe',        Icon: Swords,   desc: 'Combat & explosivité',          colors: { card: 'hover:border-boxing/60 hover:bg-boxing-light/40', badge: 'bg-boxing-light text-boxing-dark', text: 'text-boxing-dark', dot: 'bg-boxing' } },
]

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function fmtDetail(ex: Exercise) {
  if (ex.duration_sec) {
    const min = Math.floor(ex.duration_sec / 60)
    const sec = ex.duration_sec % 60
    return min > 0 ? `${min}min${sec > 0 ? ' ' + sec + 's' : ''}` : `${sec}s`
  }
  const parts = []
  if (ex.sets) parts.push(`${ex.sets} séries`)
  if (ex.reps) parts.push(`${ex.reps} reps`)
  return parts.join(' × ') || '—'
}

function ExerciseForm({ initial, onSave, onCancel, dbExercises }: {
  initial?: Partial<Exercise>
  onSave: (ex: Exercise) => void
  onCancel: () => void
  dbExercises: DBExercise[]
}) {
  const [name, setName]          = useState(initial?.name ?? '')
  const [mode, setMode]          = useState<'reps' | 'duration'>(initial?.duration_sec ? 'duration' : 'reps')
  const [sets, setSets]          = useState(String(initial?.sets ?? ''))
  const [reps, setReps]          = useState(String(initial?.reps ?? ''))
  const [durationMin, setDurMin] = useState(String(initial?.duration_sec ? Math.floor(initial.duration_sec / 60) : ''))
  const [durationSec, setDurSec] = useState(String(initial?.duration_sec ? initial.duration_sec % 60 : ''))
  const [rest, setRest]          = useState(String(initial?.rest_sec ?? '60'))
  const [tips, setTips]          = useState(initial?.tips ?? '')
  const [useDropdown, setUseDropdown] = useState(!initial?.name)

  function selectFromDB(exName: string) {
    const found = dbExercises.find(e => e.name === exName)
    if (found) { setName(found.name); setTips(found.description ?? '') }
  }

  function submit() {
    if (!name.trim()) return
    const duration_sec = mode === 'duration'
      ? (parseInt(durationMin || '0') * 60 + parseInt(durationSec || '0')) || null
      : null
    onSave({
      name: name.trim(),
      sets: mode === 'reps' ? parseInt(sets) || null : null,
      reps: mode === 'reps' ? parseInt(reps) || null : null,
      duration_sec,
      rest_sec: parseInt(rest) || null,
      tips: tips.trim(),
    })
  }

  const input = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tta-mid/30 bg-white"
  const favorites = dbExercises.filter(e => e.use_count > 0).sort((a, b) => b.use_count - a.use_count)
  const others    = dbExercises.filter(e => e.use_count === 0)

  return (
    <div className="card border-2 border-tta-mid/30 flex flex-col gap-3">
      {useDropdown ? (
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Choisir un exercice</label>
          <select className={input} value={name} onChange={e => { selectFromDB(e.target.value); setName(e.target.value) }}>
            <option value="">Sélectionner…</option>
            {favorites.length > 0 && (
              <optgroup label="⭐ Favoris (les plus utilisés)">
                {favorites.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
              </optgroup>
            )}
            <optgroup label="Tous les exercices">
              {others.map(e => <option key={e.id} value={e.name}>{e.name} {e.difficulty ? `(${e.difficulty})` : ''}</option>)}
            </optgroup>
          </select>
          <button onClick={() => setUseDropdown(false)} className="text-xs text-tta-mid mt-1 hover:underline">
            + Créer un exercice personnalisé
          </button>
        </div>
      ) : (
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Nom de l'exercice *</label>
          <input className={input} placeholder="ex: Tractions lestées" value={name} onChange={e => setName(e.target.value)} />
          <button onClick={() => setUseDropdown(true)} className="text-xs text-tta-mid mt-1 hover:underline">
            ← Choisir dans la liste
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setMode('reps')}     className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${mode === 'reps'     ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 text-zinc-500'}`}>Séries / reps</button>
        <button onClick={() => setMode('duration')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${mode === 'duration' ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 text-zinc-500'}`}>Durée</button>
      </div>

      {mode === 'reps' ? (
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-zinc-400 mb-1 block">Séries</label><input className={input} type="number" min="1" placeholder="ex: 3" value={sets} onChange={e => setSets(e.target.value)} /></div>
          <div><label className="text-xs text-zinc-400 mb-1 block">Reps</label><input className={input} type="number" min="1" placeholder="ex: 12" value={reps} onChange={e => setReps(e.target.value)} /></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-zinc-400 mb-1 block">Minutes</label><input className={input} type="number" min="0" placeholder="ex: 15" value={durationMin} onChange={e => setDurMin(e.target.value)} /></div>
          <div><label className="text-xs text-zinc-400 mb-1 block">Secondes</label><input className={input} type="number" min="0" max="59" placeholder="ex: 30" value={durationSec} onChange={e => setDurSec(e.target.value)} /></div>
        </div>
      )}

      <div><label className="text-xs text-zinc-400 mb-1 block">Repos (secondes)</label><input className={input} type="number" min="0" placeholder="ex: 60" value={rest} onChange={e => setRest(e.target.value)} /></div>
      <div><label className="text-xs text-zinc-400 mb-1 block">Conseil / note (optionnel)</label><input className={input} placeholder="ex: garder le dos droit" value={tips} onChange={e => setTips(e.target.value)} /></div>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} className="btn-primary flex-1 justify-center py-2"><Check size={14} /> Valider</button>
        <button onClick={onCancel} className="btn-ghost px-4"><X size={14} /></button>
      </div>
    </div>
  )
}

// Modale d'avertissement
function QuitModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">Séance en cours</p>
            <p className="text-xs text-zinc-500 mt-0.5">Voulez-vous vraiment quitter ?</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Si vous quittez maintenant, votre séance sera perdue et le chrono s'arrêtera.
        </p>
        <p className="text-xs text-tta-mid bg-tta-light rounded-lg px-3 py-2">
          💡 Vous pouvez réduire l'application pour continuer en arrière-plan sans perdre votre séance.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Continuer la séance
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">
            Quitter
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SessionPage() {
  const router = useRouter()
  const [step, setStep]           = useState<1 | 2 | 3 | 4>(1)
  const [voiceMode, setVoiceMode] = useState(false)
  const [selected, setSelected]   = useState<DisciplineOption | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [dbExercises, setDbExercises] = useState<DBExercise[]>([])
  const [loadingDB, setLoadingDB] = useState(false)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [checkedExercises, setCheckedExercises] = useState<Set<number>>(new Set())
  const [elapsed, setElapsed]     = useState(0)
  const [paused, setPaused]       = useState(true)
  const [showQuitModal, setShowQuitModal] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const elapsedBeforePause = useRef(0)
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)

  const supabase = createClient()

  const startTimer = useCallback(() => {
    if (intervalRef.current) return
    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(elapsedBeforePause.current + Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
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

  // Gestion arrière-plan
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        if (intervalRef.current && startTimeRef.current) {
          elapsedBeforePause.current = elapsed
          startTimeRef.current = Date.now()
        }
      } else {
        if (intervalRef.current && startTimeRef.current) {
          const newElapsed = elapsedBeforePause.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
          setElapsed(newElapsed)
          elapsedBeforePause.current = newElapsed
          startTimeRef.current = Date.now()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [elapsed])

  const togglePause = () => {
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

  async function pickDiscipline(disc: DisciplineOption) {
    setSelected(disc)
    setExercises([])
    setCheckedExercises(new Set())
    setStep(2)
    setLoadingDB(true)

    const { data: discData } = await supabase
      .from('disciplines').select('id').ilike('name', disc.label).single()

    if (discData) {
      const { data: sessionExos } = await supabase
        .from('session_exercises').select('exercise_name')

      const useCounts: Record<string, number> = {}
      for (const se of sessionExos ?? []) {
        useCounts[se.exercise_name] = (useCounts[se.exercise_name] ?? 0) + 1
      }

      const { data: exos } = await supabase
        .from('exercises').select('*').eq('discipline_id', discData.id).order('name')

      setDbExercises((exos ?? []).map(e => ({ ...e, use_count: useCounts[e.name] ?? 0 })))
    }
    setLoadingDB(false)
  }

  function deleteExercise(i: number) { setExercises(prev => prev.filter((_, idx) => idx !== i)) }
  function addExercise(ex: Exercise) { setExercises(prev => [...prev, ex]); setShowAddForm(false) }
  function saveEdit(ex: Exercise) {
    if (editingIndex === null) return
    setExercises(prev => prev.map((e, i) => i === editingIndex ? ex : e))
    setEditingIndex(null)
  }

 function startSession() {
  const w = window as any
  w.__sessionActive = true
  setCheckedExercises(new Set())
  setElapsed(0)
  elapsedBeforePause.current = 0
  setPaused(false)
  startTimer()
  setStep(3)
}

  function goToSummary() { pauseTimer(); setStep(4) }

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
    if (!selected) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const [{ data: disc }, { data: profile }] = await Promise.all([
      supabase.from('disciplines').select('id, met_default').ilike('name', selected.label).single(),
      supabase.from('profiles').select('weight_kg').eq('id', user.id).single(),
    ])

    const duration_min = Math.max(1, Math.round(elapsed / 60))
    const met      = (disc as any)?.met_default ?? 5
    const weight   = (profile as any)?.weight_kg ?? 70
    const calories = Math.round(met * weight * (duration_min / 60))
    const doneExos = checkedExercises.size > 0 ? exercises.filter((_, i) => checkedExercises.has(i)) : exercises

    const { data: session } = await supabase.from('sessions').insert({
      user_id: user.id, discipline_id: (disc as any)?.id ?? null,
      session_date: new Date().toISOString().slice(0, 10),
      duration_min, calories_burned: calories, notes: notes.trim() || null,
    }).select().single()

    if (session && doneExos.length > 0) {
      await supabase.from('session_exercises').insert(
        doneExos.map(ex => ({ session_id: session.id, exercise_name: ex.name, sets: ex.sets, reps: ex.reps, duration_sec: ex.duration_sec, weight_kg: null }))
      )
    }
    (window as any).__sessionActive = false
    router.push('/dashboard')
    
  }

  // ── STEP 1 ─────────────────────────────────────────────────────────────
  if (step === 1) return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Nouvelle séance</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Quelle discipline aujourd'hui ?</p>
      </div>

      <Waty mode="sport" message={WATY_MESSAGES.sport_start} size="sm" />

      {/* Mode vocal */}
      {voiceMode ? (
        <VoiceSession
          onConfirm={handleVoiceConfirm}
          onCancel={() => setVoiceMode(false)}
        />
      ) : (
        <>
          {/* Bouton vocal */}
          <button onClick={() => setVoiceMode(true)}
            className="card border-2 border-dashed border-tta-mid/40 flex items-center gap-4 hover:border-tta-mid hover:bg-tta-light/30 transition-all p-4">
            <div className="w-12 h-12 rounded-full bg-tta-mid flex items-center justify-center flex-shrink-0">
              <Mic size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-zinc-900">🎤 Décrire ma séance à voix haute</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Dis ce que tu as fait, l'IA crée la séance automatiquement
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-200" />
            <p className="text-xs text-zinc-400">ou choisir une discipline</p>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DISCIPLINES.map(disc => (
              <button key={disc.slug} onClick={() => pickDiscipline(disc)}
                className={`card flex flex-col gap-3 text-left transition-all cursor-pointer border-2 border-transparent ${disc.colors.card}`}>
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${disc.colors.badge}`}>
                  <disc.Icon size={20} />
                </span>
                <div>
                  <p className="font-medium text-sm">{disc.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{disc.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  // ── STEP 2 — Programme ─────────────────────────────────────────────────
  if (step === 2 && selected) {
    const { Icon, colors } = selected
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setStep(1)} className="btn-ghost -ml-1"><ChevronLeft size={16} />Retour</button>
        </div>

        <div className={`card flex items-center gap-3 ${colors.badge}`}>
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/50"><Icon size={20} /></span>
          <div>
            <p className="font-semibold text-sm">{selected.label}</p>
            <p className="text-xs opacity-70">Composez votre programme</p>
          </div>
        </div>

        {loadingDB && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 size={14} className="animate-spin" />Chargement des exercices…
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">
            Programme
            <span className="ml-2 text-xs text-zinc-400">{exercises.length} exercice{exercises.length > 1 ? 's' : ''}</span>
          </h2>

          {exercises.map((ex, i) => (
            editingIndex === i
              ? <ExerciseForm key={i} initial={ex} onSave={saveEdit} onCancel={() => setEditingIndex(null)} dbExercises={dbExercises} />
              : (
                <div key={i} className="card flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <p className="font-medium text-sm truncate">{ex.name}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${colors.badge}`}>{fmtDetail(ex)}</span>
                      <button onClick={() => setEditingIndex(i)} className="p-1 rounded hover:bg-zinc-100 text-zinc-400"><Pencil size={13} /></button>
                      <button onClick={() => deleteExercise(i)} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {ex.tips && <p className="text-xs text-zinc-400 pl-4">{ex.tips}</p>}
                </div>
              )
          ))}

          {showAddForm
            ? <ExerciseForm onSave={addExercise} onCancel={() => setShowAddForm(false)} dbExercises={dbExercises} />
            : (
              <button onClick={() => setShowAddForm(true)}
                className="card border-2 border-dashed border-zinc-200 flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-colors py-4">
                <Plus size={16} />Ajouter un exercice
              </button>
            )
          }
        </div>

        <button onClick={startSession} disabled={exercises.length === 0}
          className="btn-primary justify-center py-3 text-base disabled:opacity-50">
          <Play size={18} />Démarrer la séance
        </button>
      </div>
    )
  }

  // ── STEP 3 — Séance live ───────────────────────────────────────────────
  if (step === 3 && selected) {
    const { Icon, colors } = selected
    return (
      <div className="flex flex-col gap-5">

        {/* Modale avertissement */}
        {showQuitModal && (
          <QuitModal
            onConfirm={() => { 
             setShowQuitModal(false)
             pauseTimer()
             const w = window as any
            w.__sessionActive = false
           setStep(2) 
     }}
         onCancel={() => setShowQuitModal(false)}
          />
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => setShowQuitModal(true)} className="btn-ghost -ml-1">
            <ChevronLeft size={16} />Retour
          </button>
        </div>

        <div className="card flex flex-col items-center gap-4 py-8">
          <span className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${colors.badge}`}><Icon size={28} /></span>
          <p className="font-semibold text-lg">{selected.label}</p>
          <span className="text-5xl font-mono font-bold tracking-tight">{formatTime(elapsed)}</span>
          <button onClick={togglePause}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${paused ? 'bg-tta-light text-tta-mid hover:bg-tta-light/80' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
            {paused ? <><Play size={12} />Reprendre</> : <><Pause size={12} />Pause</>}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">
            Exercices
            {checkedExercises.size > 0 && <span className="ml-2 text-xs text-zinc-400">{checkedExercises.size}/{exercises.length} faits</span>}
          </h2>
          {exercises.map((ex, i) => {
            const done = checkedExercises.has(i)
            return (
              <button key={i} onClick={() => toggleExercise(i)}
                className={`card flex flex-col gap-2 text-left transition-all border-2 ${done ? 'border-green-400 bg-green-50' : 'border-transparent hover:border-zinc-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {done ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" /> : <Circle size={16} className="text-zinc-300 flex-shrink-0 mt-0.5" />}
                    <p className={`font-medium text-sm ${done ? 'line-through text-zinc-400' : ''}`}>{ex.name}</p>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-md flex-shrink-0 ${colors.badge}`}>{fmtDetail(ex)}</span>
                </div>
                {ex.tips && !done && <p className="text-xs text-zinc-500 pl-6">{ex.tips}</p>}
              </button>
            )
          })}
        </div>

        <button onClick={goToSummary} className="btn-primary justify-center py-3 text-base">
          <CheckCircle2 size={18} />Terminer la séance
        </button>
      </div>
    )
  }

  // ── STEP 4 — Bilan ────────────────────────────────────────────────────
  if (step === 4 && selected) {
    const { Icon, colors } = selected
    const duration_min = Math.max(1, Math.round(elapsed / 60))
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-semibold">Bilan de séance</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Sauvegarde ta performance</p>
        </div>

        <div className="card flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${colors.badge}`}><Icon size={18} /></span>
            <div>
              <p className="font-medium">{selected.label}</p>
              <p className="text-xs text-zinc-400">
                {checkedExercises.size > 0
                  ? `${checkedExercises.size} exercice${checkedExercises.size > 1 ? 's' : ''} réalisé${checkedExercises.size > 1 ? 's' : ''}`
                  : `${exercises.length} exercice${exercises.length > 1 ? 's' : ''} au programme`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="kpi-card">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Clock size={12} />Durée</span>
              <span className="text-lg font-bold">{duration_min} min</span>
              <span className="text-xs text-zinc-400">{formatTime(elapsed)}</span>
            </div>
            <div className="kpi-card">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Flame size={12} />Calories est.</span>
              <span className="text-lg font-bold">~{Math.round(5 * 70 * (duration_min / 60))} kcal</span>
              <span className="text-xs text-zinc-400">selon profil</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="notes">Notes (optionnel)</label>
          <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Comment s'est passée la séance ? Ressenti, PR, observations…"
            rows={4} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-tta-mid/30 resize-none" />
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={saveSession} disabled={saving} className="btn-primary justify-center py-3 text-base disabled:opacity-60">
            {saving ? <><Loader2 size={16} className="animate-spin" />Sauvegarde…</> : <><CheckCircle2 size={18} />Sauvegarder</>}
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn-ghost justify-center py-2 text-sm text-zinc-400">
            Annuler sans sauvegarder
          </button>
        </div>
      </div>
    )
  }

  return null
}