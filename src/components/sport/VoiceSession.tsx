'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, Check, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExtractedSession {
  discipline: string
  duration_min: number
  exercises: {
    name: string
    sets: number | null
    reps: number | null
    duration_sec: number | null
    tips: string
  }[]
  notes: string
  calories_estimate: number | null
}

interface Props {
  onConfirm: (session: ExtractedSession) => void
  onCancel: () => void
}

type RecordState = 'idle' | 'recording' | 'processing' | 'preview' | 'error'

function fmtDuration(sec: number | null): string {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}min${s > 0 ? ` ${s}s` : ''}` : `${s}s`
}

const DISC_EMOJI: Record<string, string> = {
  natation: '🏊', musculation: '🏋️', cardio: '🚴', boxe: '🥊',
}

export function VoiceSession({ onConfirm, onCancel }: Props) {
  const [state, setState]             = useState<RecordState>('idle')
  const [transcript, setTranscript]   = useState('')
  const [session, setSession]         = useState<ExtractedSession | null>(null)
  const [error, setError]             = useState('')
  const [elapsed, setElapsed]         = useState(0)
  const mediaRef    = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      setElapsed(0)

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        processAudio()
      }

      recorder.start(100)
      mediaRef.current = recorder
      setState('recording')

      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch {
      setError("Impossible d'accéder au microphone. Vérifiez les permissions.")
      setState('error')
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRef.current?.stop()
    setState('processing')
  }

  async function processAudio() {
    setState('processing')
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')

      const res  = await fetch('/api/voice-session', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')

      setTranscript(data.transcript)
      setSession(data.session)
      setState('preview')
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors du traitement')
      setState('error')
    }
  }

  function reset() {
    setState('idle')
    setTranscript('')
    setSession(null)
    setError('')
    setElapsed(0)
  }

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (state === 'idle') return (
    <div className="card flex flex-col items-center gap-5 py-8">
      <div className="text-center">
        <p className="font-bold text-zinc-900">🎤 Décrire ma séance</p>
        <p className="text-sm text-zinc-400 mt-1 max-w-xs">
          Appuie sur le bouton et décris ta séance à voix haute
        </p>
      </div>

      <div className="bg-zinc-50 rounded-xl px-4 py-3 text-xs text-zinc-500 text-center max-w-xs">
        <p className="font-semibold mb-1">Exemples :</p>
        <p>"J'ai fait 15 min de tapis marche rapide et 30 min de HIIT"</p>
        <p className="mt-1">"3 séries de 12 squats, 3 séries de pompes et 20 min de vélo"</p>
      </div>

      <button onClick={startRecording}
        className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95">
        <Mic size={32} />
      </button>

      <button onClick={onCancel} className="btn-ghost text-zinc-400 text-sm">
        Annuler
      </button>
    </div>
  )

  // ── Recording ─────────────────────────────────────────────────────────────────
  if (state === 'recording') return (
    <div className="card flex flex-col items-center gap-5 py-8">
      <div className="text-center">
        <p className="font-bold text-red-500 flex items-center gap-2 justify-center">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Enregistrement en cours
        </p>
        <p className="text-2xl font-mono font-bold text-zinc-900 mt-2">
          {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
        </p>
      </div>

      {/* Onde sonore animée */}
      <div className="flex items-center gap-1 h-12">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-1.5 bg-red-400 rounded-full animate-pulse"
            style={{
              height: `${Math.random() * 32 + 8}px`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: `${0.6 + Math.random() * 0.4}s`,
            }} />
        ))}
      </div>

      <p className="text-sm text-zinc-400 text-center max-w-xs">
        Parle clairement, décris tes exercices, durées et séries
      </p>

      <button onClick={stopRecording}
        className="w-20 h-20 rounded-full bg-zinc-800 hover:bg-zinc-900 text-white flex items-center justify-center shadow-lg transition-all active:scale-95">
        <MicOff size={28} />
      </button>
      <p className="text-xs text-zinc-400">Appuie pour arrêter</p>
    </div>
  )

  // ── Processing ────────────────────────────────────────────────────────────────
  if (state === 'processing') return (
    <div className="card flex flex-col items-center gap-5 py-12">
      <Loader2 size={40} className="animate-spin text-tta-mid" />
      <div className="text-center">
        <p className="font-bold text-zinc-900">Analyse en cours…</p>
        <p className="text-sm text-zinc-400 mt-1">Whisper transcrit · Claude extrait les données</p>
      </div>
    </div>
  )

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (state === 'error') return (
    <div className="card flex flex-col items-center gap-4 py-8">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
        <X size={24} className="text-red-500" />
      </div>
      <div className="text-center">
        <p className="font-bold text-zinc-900">Oops</p>
        <p className="text-sm text-zinc-500 mt-1">{error}</p>
      </div>
      <button onClick={reset} className="btn-primary gap-2">
        <RefreshCw size={14} />Réessayer
      </button>
      <button onClick={onCancel} className="btn-ghost text-zinc-400 text-sm">Annuler</button>
    </div>
  )

  // ── Preview ───────────────────────────────────────────────────────────────────
  if (state === 'preview' && session) return (
    <div className="card flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-zinc-900">✅ Séance détectée</p>
        <p className="text-xs text-zinc-400 mt-0.5 italic">"{transcript}"</p>
      </div>

      {/* Résumé */}
      <div className="bg-tta-light rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{DISC_EMOJI[session.discipline] ?? '🏃'}</span>
            <div>
              <p className="font-bold text-tta-mid capitalize">{session.discipline}</p>
              <p className="text-xs text-zinc-500">{session.notes}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-tta-mid">{session.duration_min} min</p>
            {session.calories_estimate && (
              <p className="text-xs text-zinc-500">~{session.calories_estimate} kcal</p>
            )}
          </div>
        </div>
      </div>

      {/* Exercices */}
      {session.exercises.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Exercices détectés</p>
          {session.exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-100 last:border-0">
              <span className="w-2 h-2 rounded-full bg-tta-mid flex-shrink-0" />
              <p className="text-sm font-medium flex-1">{ex.name}</p>
              <span className="text-xs text-zinc-400 font-mono">
                {ex.duration_sec ? fmtDuration(ex.duration_sec)
                  : ex.sets && ex.reps ? `${ex.sets}×${ex.reps}`
                  : ex.sets ? `${ex.sets} séries`
                  : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onConfirm(session)}
          className="btn-primary flex-1 justify-center py-2.5">
          <Check size={16} />Enregistrer la séance
        </button>
        <button onClick={reset} className="btn-ghost px-3" title="Réenregistrer">
          <RefreshCw size={15} />
        </button>
        <button onClick={onCancel} className="btn-ghost px-3 text-zinc-400" title="Annuler">
          <X size={15} />
        </button>
      </div>
    </div>
  )

  return null
}
