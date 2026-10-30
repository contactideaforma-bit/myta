'use client'
/**
 * Résultat d'une séance analysée par Waty : en-tête coloré, durée / calories / intensité,
 * zones travaillées, bienfaits de l'activité, commentaire de Waty, exercices détectés.
 * + SessionAnalyzing : progression animée pendant l'analyse (le serveur répond d'un bloc).
 */
import { useEffect, useState, type ReactNode } from 'react'
import { MytaIllustration } from '@/components/ui/MytaIllustration'
import { MytaIcon } from '@/components/ui/MytaIcon'

export interface ExtractedSession {
  discipline: string
  activity_label?: string | null
  intensity?: 'douce' | 'modérée' | 'intense' | string | null
  duration_min: number
  exercises: { name: string; sets: number | null; reps: number | null; duration_sec: number | null; tips?: string }[]
  muscles?: string[]
  benefits?: string[]
  waty_comment?: string | null
  notes: string
  calories_estimate: number | null
}

const INTENSITY: Record<string, { label: string; cls: string }> = {
  douce:    { label: 'Intensité douce',   cls: 'bg-sky-100 text-sky-700' },
  modérée:  { label: 'Intensité modérée', cls: 'bg-amber-100 text-amber-700' },
  intense:  { label: 'Intensité élevée',  cls: 'bg-rose-100 text-rose-700' },
}
const MUSCLE_COLORS = ['bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700', 'bg-sky-100 text-sky-700']
const BENEFIT_DOTS = ['#22C55E', '#F97316', '#4B47A0']

function fmtDuration(sec: number | null): string {
  if (!sec) return ''
  const m = Math.floor(sec / 60), s = sec % 60
  return m > 0 ? `${m} min${s > 0 ? ` ${s} s` : ''}` : `${s} s`
}
function cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

export function SessionResult({ session, title = 'Ta séance', transcript, actions, compact = false }: {
  session: ExtractedSession; title?: string; transcript?: string; actions?: ReactNode; compact?: boolean
}) {
  const label = session.activity_label || cap(session.discipline || 'Séance')
  const inten = INTENSITY[session.intensity ?? ''] ?? INTENSITY['modérée']
  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      {/* En-tête */}
      <div className="relative p-4 pb-5 text-white" style={{ background: 'linear-gradient(135deg, #4B47A0 0%, #6A66C7 60%, #7B7FD4 100%)' }}>
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0"><MytaIllustration name="seance" size={44} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-white/70">{title}</p>
            <p className="text-lg font-extrabold leading-tight truncate">{label}</p>
            {session.notes && <p className="text-[12px] text-white/80 leading-snug mt-0.5 line-clamp-2">{session.notes}</p>}
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white/15 rounded-2xl px-3 py-2"><p className="text-[10px] font-bold text-white/70 uppercase">Durée</p><p className="text-lg font-extrabold leading-tight">{session.duration_min} <span className="text-xs font-bold">min</span></p></div>
          <div className="bg-white/15 rounded-2xl px-3 py-2"><p className="text-[10px] font-bold text-white/70 uppercase">Brûlées</p><p className="text-lg font-extrabold leading-tight">{session.calories_estimate ?? '—'} <span className="text-xs font-bold">kcal</span></p></div>
          <div className="bg-white/15 rounded-2xl px-3 py-2"><p className="text-[10px] font-bold text-white/70 uppercase">Rythme</p><p className="text-sm font-extrabold leading-tight mt-1">{cap(String(session.intensity ?? 'modérée'))}</p></div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Zones travaillées */}
        {session.muscles && session.muscles.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Ce que tu as travaillé</p>
            <div className="flex flex-wrap gap-1.5">
              {session.muscles.map((m, i) => <span key={i} className={`text-xs font-bold px-2.5 py-1 rounded-full ${MUSCLE_COLORS[i % MUSCLE_COLORS.length]}`}>{m}</span>)}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${inten.cls}`}>{inten.label}</span>
            </div>
          </div>
        )}

        {/* Bienfaits */}
        {session.benefits && session.benefits.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">Les bienfaits de cette séance</p>
            <ul className="flex flex-col gap-1.5">
              {session.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700 leading-snug">
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: BENEFIT_DOTS[i % BENEFIT_DOTS.length] }} />{b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Commentaire de Waty */}
        {session.waty_comment && (
          <div className="flex items-start gap-3 bg-nutri-light/70 border border-nutri/20 rounded-2xl px-3.5 py-3">
            <MytaIllustration name="waty" size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold text-nutri-dark">Waty dit :</p>
              <p className="text-sm text-zinc-800 leading-relaxed">{session.waty_comment}</p>
            </div>
          </div>
        )}

        {/* Exercices */}
        {!compact && session.exercises && session.exercises.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Exercices détectés</p>
            {session.exercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-100 last:border-0">
                <span className="w-6 h-6 rounded-lg bg-sport-light text-sport-dark text-[11px] font-extrabold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <p className="text-sm font-medium flex-1 text-zinc-800">{ex.name}</p>
                <span className="text-xs text-zinc-400 font-mono">
                  {ex.duration_sec ? fmtDuration(ex.duration_sec) : ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.sets ? `${ex.sets} séries` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {transcript && <p className="text-[11px] text-zinc-400 italic">« {transcript} »</p>}
        {actions}
      </div>
    </div>
  )
}

/** Progression animée pendant l'analyse (4 à 8 s en général). */
const STEPS = [
  { label: 'Lecture de ta description', until: 25, ms: 1200 },
  { label: 'Identification des exercices et de la durée', until: 55, ms: 2200 },
  { label: 'Estimation des calories selon ton profil', until: 78, ms: 2200 },
  { label: 'Waty prépare son commentaire', until: 93, ms: 4000 },
]
export function SessionAnalyzing({ mode = 'texte' }: { mode?: 'vocal' | 'texte' }) {
  const [pct, setPct] = useState(2)
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t0 = Date.now()
    const id = setInterval(() => {
      const el = Date.now() - t0
      let acc = 0, st = 0, p = 0
      for (let i = 0; i < STEPS.length; i++) {
        const s = STEPS[i], from = i ? STEPS[i - 1].until : 0
        if (el <= acc + s.ms) { st = i; p = from + (s.until - from) * ((el - acc) / s.ms); break }
        acc += s.ms; st = i; p = s.until
      }
      setStep(st); setPct(Math.min(93, Math.round(p)))
    }, 120)
    return () => clearInterval(id)
  }, [])
  const C = 2 * Math.PI * 22
  return (
    <div className="card flex flex-col gap-3 border-sport/30">
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg viewBox="0 0 52 52" className="w-14 h-14 -rotate-90">
            <circle cx="26" cy="26" r="22" fill="none" stroke="#E4E4EE" strokeWidth="5" />
            <circle cx="26" cy="26" r="22" fill="none" stroke="#7B7FD4" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={`${C * (1 - pct / 100)}`} className="transition-[stroke-dashoffset] duration-200" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center"><MytaIllustration name="seance" size={30} /></span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-zinc-900">Waty analyse ta séance {mode === 'vocal' ? 'vocale' : ''}</p>
          <p className="text-xs text-zinc-500">{STEPS[step].label}<span className="inline-block w-4 animate-pulse">…</span></p>
        </div>
        <span className="text-sm font-extrabold text-sport-dark tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7B7FD4, #22C55E)' }} />
      </div>
      <ol className="flex flex-col gap-1">
        {STEPS.map((s, i) => (
          <li key={i} className={`flex items-center gap-2 text-[11px] ${i < step ? 'text-sport-dark' : i === step ? 'text-zinc-800 font-semibold' : 'text-zinc-300'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${i < step ? 'bg-sport text-white' : i === step ? 'bg-sport-light text-sport-dark' : 'bg-zinc-100 text-zinc-300'}`}>
              {i < step ? <MytaIcon name="check" size={9} /> : i + 1}
            </span>{s.label}
          </li>
        ))}
      </ol>
    </div>
  )
}
