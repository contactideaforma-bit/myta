'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, Check, X, RefreshCw, PenLine, Send, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DetectedFood {
  name: string
  quantity: number
  cal: number
  prot: number
  carb: number
  fat: number
  cat: string
}

interface Props {
  onConfirm: (foods: DetectedFood[]) => void
  onCancel: () => void
}

type Mode    = 'choice' | 'voice' | 'text' | 'recording' | 'processing' | 'preview' | 'error'

const EXAMPLES = [
  "Deux œufs brouillés avec une tartine de pain complet",
  "Un bol de riz avec du poulet grillé et des haricots verts",
  "Un yaourt grec avec des myrtilles et une poignée de noix",
  "Une assiette de pâtes bolognaise",
  "Un café avec du lait et une banane",
]

export function VoiceMeal({ onConfirm, onCancel }: Props) {
  const [mode, setMode]             = useState<Mode>('choice')
  const [transcript, setTranscript] = useState('')
  const [textInput, setTextInput]   = useState('')
  const [foods, setFoods]           = useState<DetectedFood[]>([])
  const [error, setError]           = useState('')
  const [elapsed, setElapsed]       = useState(0)
  const [editIdx, setEditIdx]       = useState<number | null>(null)
  const [editQty, setEditQty]       = useState('')

  const mediaRef   = useRef<MediaRecorder | null>(null)
  const chunksRef  = useRef<Blob[]>([])
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Enregistrement vocal ──────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      setElapsed(0)

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); processAudio() }

      recorder.start(100)
      mediaRef.current = recorder
      setMode('recording')
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch {
      setError("Impossible d'accéder au microphone.")
      setMode('error')
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRef.current?.stop()
    setMode('processing')
  }

  async function processAudio() {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')
      const res  = await fetch('/api/voice-meal', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTranscript(data.transcript)
      setFoods(data.foods ?? [])
      setMode('preview')
    } catch (e: any) {
      setError(e.message ?? 'Erreur traitement')
      setMode('error')
    }
  }

  async function processText() {
    if (!textInput.trim()) return
    setMode('processing')
    try {
      const res  = await fetch('/api/voice-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTranscript(textInput.trim())
      setFoods(data.foods ?? [])
      setMode('preview')
    } catch (e: any) {
      setError(e.message ?? 'Erreur analyse')
      setMode('error')
    }
  }

  function reset() {
    setMode('choice')
    setTranscript('')
    setTextInput('')
    setFoods([])
    setError('')
    setElapsed(0)
    setEditIdx(null)
  }

  function saveEdit(idx: number) {
    const qty = parseFloat(editQty)
    if (!qty || qty <= 0) return
    setFoods(prev => prev.map((f, i) => {
      if (i !== idx) return f
      const ratio = qty / f.quantity
      return {
        ...f,
        quantity: qty,
        cal:  Math.round(f.cal  * ratio),
        prot: Math.round(f.prot * ratio * 10) / 10,
        carb: Math.round(f.carb * ratio * 10) / 10,
        fat:  Math.round(f.fat  * ratio * 10) / 10,
      }
    }))
    setEditIdx(null)
  }

  function removeFood(idx: number) {
    setFoods(prev => prev.filter((_, i) => i !== idx))
  }

  const totalCal  = foods.reduce((s, f) => s + f.cal, 0)
  const totalProt = Math.round(foods.reduce((s, f) => s + f.prot, 0) * 10) / 10
  const totalCarb = Math.round(foods.reduce((s, f) => s + f.carb, 0) * 10) / 10
  const totalFat  = Math.round(foods.reduce((s, f) => s + f.fat, 0)  * 10) / 10

  // ── Choix du mode ─────────────────────────────────────────────────────────
  if (mode === 'choice') return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-extrabold text-zinc-900">Ajouter un repas</p>
        <button onClick={onCancel} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-200">
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-3">
        <button onClick={startRecording}
          className="flex items-center gap-4 bg-gradient-to-br from-nutri to-nutri-mid rounded-2xl p-4 text-left hover:opacity-90 transition-all active:scale-[0.98]">
          <div className="w-12 h-12 bg-white/25 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mic size={22} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Décrire en vocal</p>
            <p className="text-xs text-white/70 mt-0.5">"J'ai mangé deux œufs et une tartine..."</p>
          </div>
        </button>

        <button onClick={() => setMode('text')}
          className="flex items-center gap-4 bg-white border-2 border-nutri/30 rounded-2xl p-4 text-left hover:border-nutri hover:bg-nutri-light transition-all active:scale-[0.98]">
          <div className="w-12 h-12 bg-nutri-light rounded-xl flex items-center justify-center flex-shrink-0">
            <PenLine size={22} className="text-nutri-mid" />
          </div>
          <div>
            <p className="font-bold text-zinc-900 text-sm">Décrire par écrit</p>
            <p className="text-xs text-zinc-400 mt-0.5">Tape ce que tu as mangé</p>
          </div>
        </button>
      </div>
    </div>
  )

  // ── Saisie texte ──────────────────────────────────────────────────────────
  if (mode === 'text') return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-extrabold text-zinc-900">✍️ Décris ton repas</p>
        <button onClick={reset} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
          <X size={14} />
        </button>
      </div>

      <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
        placeholder="Ex: J'ai mangé un bol de riz avec du poulet grillé et une salade..."
        rows={4}
        className="w-full px-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm text-zinc-900 bg-white focus:outline-none focus:border-nutri resize-none transition-colors dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100 dark:placeholder:text-zinc-500" />

      <div>
        <p className="text-xs text-zinc-400 mb-2 font-semibold">Exemples :</p>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setTextInput(ex)}
              className="text-left text-xs text-nutri-mid bg-nutri-light px-3 py-2 rounded-xl hover:bg-nutri/20 transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </div>

      <button onClick={processText} disabled={!textInput.trim()}
        className="btn-nutri justify-center py-3 disabled:opacity-50">
        <Send size={15} />Analyser mon repas
      </button>
    </div>
  )

  // ── Enregistrement ────────────────────────────────────────────────────────
  if (mode === 'recording') return (
    <div className="card flex flex-col items-center gap-5 py-8">
      <div className="text-center">
        <p className="font-bold text-red-500 flex items-center gap-2 justify-center">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Enregistrement…
        </p>
        <p className="text-2xl font-mono font-bold text-zinc-900 mt-2">
          {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
        </p>
      </div>
      <div className="flex items-center gap-1 h-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-1.5 bg-nutri rounded-full animate-pulse"
            style={{ height: `${Math.random() * 28 + 8}px`, animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <p className="text-sm text-zinc-400 text-center max-w-xs">
        Décris ce que tu as mangé — aliments et quantités approximatives
      </p>
      <button onClick={stopRecording}
        className="w-16 h-16 rounded-full bg-zinc-800 text-white flex items-center justify-center shadow-lg active:scale-95">
        <MicOff size={24} />
      </button>
      <p className="text-xs text-zinc-400">Appuie pour arrêter</p>
    </div>
  )

  // ── Traitement ────────────────────────────────────────────────────────────
  if (mode === 'processing') return (
    <div className="card flex flex-col items-center gap-4 py-12">
      <Loader2 size={36} className="animate-spin text-nutri" />
      <div className="text-center">
        <p className="font-bold text-zinc-900">Analyse nutritionnelle…</p>
        <p className="text-sm text-zinc-400 mt-1">Waty identifie les aliments et les macros</p>
      </div>
    </div>
  )

  // ── Erreur ────────────────────────────────────────────────────────────────
  if (mode === 'error') return (
    <div className="card flex flex-col items-center gap-4 py-8">
      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
        <X size={22} className="text-red-500" />
      </div>
      <div className="text-center">
        <p className="font-bold text-zinc-900">Oops</p>
        <p className="text-sm text-zinc-400 mt-1">{error}</p>
      </div>
      <button onClick={reset} className="btn-nutri gap-2"><RefreshCw size={14} />Réessayer</button>
    </div>
  )

  // ── Aperçu + confirmation ─────────────────────────────────────────────────
  if (mode === 'preview') return (
    <div className="card flex flex-col gap-4">
      <div>
        <p className="font-extrabold text-zinc-900">✅ Repas détecté</p>
        <p className="text-xs text-zinc-400 mt-0.5 italic">"{transcript}"</p>
      </div>

      {/* Total macros */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { lbl: 'Calories', val: Math.round(totalCal), color: 'text-orange-500', bg: 'bg-orange-50' },
          { lbl: 'Protéines', val: `${totalProt}g`, color: 'text-blue-500', bg: 'bg-blue-50' },
          { lbl: 'Glucides',  val: `${totalCarb}g`, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { lbl: 'Lipides',   val: `${totalFat}g`,  color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map(({ lbl, val, color, bg }) => (
          <div key={lbl} className={cn('rounded-2xl p-2 text-center', bg)}>
            <p className={cn('text-base font-extrabold', color)}>{val}</p>
            <p className="text-[10px] text-zinc-400">{lbl}</p>
          </div>
        ))}
      </div>

      {/* Liste aliments détectés */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Aliments identifiés</p>
        {foods.map((food, i) => (
          <div key={i} className="border border-zinc-100 rounded-2xl p-3">
            {editIdx === i ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold flex-1 truncate">{food.name}</p>
                <input type="number" min="1" max="2000"
                  value={editQty} onChange={e => setEditQty(e.target.value)}
                  className="w-20 px-2 py-1 border-2 border-nutri rounded-xl text-sm text-center font-mono focus:outline-none"
                  placeholder={String(food.quantity)} autoFocus />
                <span className="text-xs text-zinc-400">g</span>
                <button onClick={() => saveEdit(i)} className="w-7 h-7 bg-nutri rounded-lg flex items-center justify-center text-white">
                  <Check size={12} />
                </button>
                <button onClick={() => setEditIdx(null)} className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{food.name}</p>
                  <p className="text-xs text-zinc-400">{food.quantity}g · P:{food.prot}g · G:{food.carb}g · L:{food.fat}g</p>
                </div>
                <span className="text-sm font-bold text-orange-500 flex-shrink-0">{food.cal} kcal</span>
                <button onClick={() => { setEditIdx(i); setEditQty(String(food.quantity)) }}
                  className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-nutri-light hover:text-nutri-mid">
                  <Pencil size={12} />
                </button>
                <button onClick={() => removeFood(i)}
                  className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-400">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {foods.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-2">Aucun aliment détecté. Réessaie avec plus de détails.</p>
      )}

      <div className="flex gap-2">
        <button onClick={() => onConfirm(foods)} disabled={foods.length === 0}
          className="btn-nutri flex-1 justify-center py-2.5 disabled:opacity-50">
          <Check size={15} />Ajouter au journal
        </button>
        <button onClick={reset} className="btn-ghost px-3" title="Réessayer">
          <RefreshCw size={14} />
        </button>
        <button onClick={onCancel} className="btn-ghost px-3 text-zinc-400" title="Annuler">
          <X size={14} />
        </button>
      </div>
    </div>
  )

  return null
}
