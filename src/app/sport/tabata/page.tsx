'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Settings } from 'lucide-react'
import { Waty } from '@/components/ui/Waty'
import { createClient } from '@/lib/supabase/client'

type Phase = 'effort' | 'pause' | 'repos' | 'idle'

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── Confettis ────────────────────────────────────────────────────────────────
function Confettis() {
  const colors = ['#4B47A0', '#22C55E', '#F97316', '#EAB308', '#EC4899', '#06B6D4']
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    duration: `${1.5 + Math.random() * 1.5}s`,
    size: `${6 + Math.random() * 8}px`,
    rotation: `${Math.random() * 360}deg`,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: p.left,
          top: '-20px',
          width: p.size,
          height: p.size,
          backgroundColor: p.color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          transform: `rotate(${p.rotation})`,
          animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── Synthèse vocale ──────────────────────────────────────────────────────────
// Garde une référence globale aux timeouts du countdown pour pouvoir les annuler
const countdownTimeouts: ReturnType<typeof setTimeout>[] = []

function cancelCountdown() {
  countdownTimeouts.forEach(t => clearTimeout(t))
  countdownTimeouts.length = 0
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

function speakWord(text: string, pitch = 1.0) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  // Ne pas cancel ici pour ne pas interrompre la séquence
  const utt   = new SpeechSynthesisUtterance(text)
  utt.lang    = 'fr-FR'
  utt.rate    = 0.85
  utt.pitch   = pitch
  utt.volume  = 1
  if (window.speechSynthesis.paused) window.speechSynthesis.resume()
  window.speechSynthesis.speak(utt)
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  speakWord(text, 1.1)
}

// Compte à rebours vocal — séquence avec délais fixes
// Chaque mot espacé de 900ms, callback après le dernier
function countdown(finalWord: string, onDone?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onDone?.()
    return
  }
  cancelCountdown()

  const steps = [
    { word: '3',        delay: 100,  pitch: 1.0 },
    { word: '2',        delay: 1000, pitch: 1.0 },
    { word: '1',        delay: 1900, pitch: 1.0 },
    { word: finalWord,  delay: 2800, pitch: finalWord === 'Go !' ? 1.4 : 1.2 },
  ]

  steps.forEach(({ word, delay, pitch }) => {
    const t = setTimeout(() => speakWord(word, pitch), delay)
    countdownTimeouts.push(t)
  })

  // Callback ~700ms après le dernier mot
  const done = setTimeout(() => { onDone?.() }, 3800)
  countdownTimeouts.push(done)
}

export default function TabataPage() {
  const [series, setSeries]       = useState(8)
  const [effortSec, setEffortSec] = useState(20)
  const [pauseSec, setPauseSec]   = useState(10)
  const [tours, setTours]         = useState(1)
  const [reposSec, setReposSec]   = useState(60)

  const [phase, setPhase]               = useState<Phase>('idle')
  const [timeLeft, setTimeLeft]         = useState(0)
  const [currentSerie, setCurrentSerie] = useState(1)
  const [currentTour, setCurrentTour]   = useState(1)
  const [paused, setPaused]             = useState(false)
  const [finished, setFinished]         = useState(false)
  const [showConfig, setShowConfig]     = useState(true)
  const [showConfettis, setShowConfettis] = useState(false)
  const [sessionSaved, setSessionSaved]   = useState(false)

  // Pour éviter les doublons de compte à rebours
  const countdownActiveRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateRef    = useRef({ phase: 'idle' as Phase, timeLeft: 0, serie: 1, tour: 1 })

  function clearTimer() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  // Déclenche le compte à rebours vocal avant un changement de phase
  function triggerCountdown(finalWord: string, afterCb: () => void) {
    if (countdownActiveRef.current) return
    countdownActiveRef.current = true
    clearTimer()
    countdown(finalWord, () => {
      countdownActiveRef.current = false
      afterCb()
    })
  }

  function nextPhase() {
    const { phase, serie, tour } = stateRef.current

    if (phase === 'effort') {
      if (serie === series && tour === tours) {
        // FIN de l'entraînement
        clearTimer()
        triggerCountdown('Entraînement terminé !', () => {
          stateRef.current = { ...stateRef.current, phase: 'idle', timeLeft: 0 }
          setPhase('idle')
          setFinished(true)
          setShowConfettis(true)
          setTimeout(() => setShowConfettis(false), 5000)
          saveTabataSession()
        })
        return
      }
      // → Pause
      triggerCountdown('Pause', () => {
        stateRef.current = { ...stateRef.current, phase: 'pause', timeLeft: pauseSec }
        setPhase('pause')
        setTimeLeft(pauseSec)
        startTimer()
      })
    } else if (phase === 'pause') {
      if (serie < series) {
        const nextSerie = serie + 1
        triggerCountdown('Go !', () => {
          stateRef.current = { ...stateRef.current, phase: 'effort', timeLeft: effortSec, serie: nextSerie }
          setPhase('effort')
          setTimeLeft(effortSec)
          setCurrentSerie(nextSerie)
          startTimer()
        })
      } else if (tour < tours) {
        triggerCountdown('Repos', () => {
          stateRef.current = { ...stateRef.current, phase: 'repos', timeLeft: reposSec }
          setPhase('repos')
          setTimeLeft(reposSec)
          startTimer()
        })
      } else {
        clearTimer()
        triggerCountdown('Entraînement terminé !', () => {
          stateRef.current = { ...stateRef.current, phase: 'idle', timeLeft: 0 }
          setPhase('idle')
          setFinished(true)
          setShowConfettis(true)
          setTimeout(() => setShowConfettis(false), 5000)
          saveTabataSession()
        })
      }
    } else if (phase === 'repos') {
      const nextTour = tour + 1
      triggerCountdown('Go !', () => {
        stateRef.current = { ...stateRef.current, phase: 'effort', timeLeft: effortSec, serie: 1, tour: nextTour }
        setPhase('effort')
        setTimeLeft(effortSec)
        setCurrentSerie(1)
        setCurrentTour(nextTour)
        startTimer()
      })
    }
  }

  function startTimer() {
    clearTimer()
    intervalRef.current = setInterval(() => {
      stateRef.current.timeLeft -= 1
      setTimeLeft(stateRef.current.timeLeft)
      if (stateRef.current.timeLeft <= 0) nextPhase()
    }, 1000)
  }

  // ── Enregistrement automatique de la séance Tabata ──────────────────────────
  async function saveTabataSession() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupérer le poids du profil pour calculer les calories
      const { data: profile } = await supabase
        .from('profiles').select('weight_kg').eq('id', user.id).single()
      const weight = (profile as any)?.weight_kg ?? 70

      // Trouver la discipline Cardio (Tabata = HIIT cardio)
      const { data: discList } = await supabase
        .from('disciplines').select('id').ilike('name', 'Cardio')
      const discId = discList?.[0]?.id ?? null

      // Calcul durée et calories
      // Durée réelle = séries × (effort + pause) × tours + repos entre tours
      const durationMin = Math.round(
        (tours * series * (effortSec + pauseSec) + (tours - 1) * reposSec) / 60
      )
      // MET Tabata/HIIT ≈ 8 : calories = MET × poids(kg) × durée(h)
      const calBurned = Math.round(8 * weight * (durationMin / 60))

      const today = new Date().toISOString().split('T')[0]
      const notes = `Tabata : ${series} séries × ${tours} tour${tours > 1 ? 's' : ''} — ${effortSec}s effort / ${pauseSec}s pause`

      await supabase.from('sessions').insert({
        user_id:         user.id,
        discipline_id:   discId,
        session_date:    today,
        duration_min:    durationMin,
        calories_burned: calBurned,
        notes,
      })

      setSessionSaved(true)
    } catch (err) {
      console.error('[tabata] saveSession error:', err)
    }
  }

  function start() {
    setFinished(false); setCurrentSerie(1); setCurrentTour(1)
    setPaused(false); setShowConfig(false); setShowConfettis(false)
    countdownActiveRef.current = false
    // Compte à rebours de départ → Go !
    triggerCountdown('Go !', () => {
      stateRef.current = { phase: 'effort', timeLeft: effortSec, serie: 1, tour: 1 }
      setPhase('effort')
      setTimeLeft(effortSec)
      startTimer()
    })
  }

  function togglePause() {
    if (paused) {
      startTimer()
      setPaused(false)
      speak('Go !')
    } else {
      clearTimer()
      setPaused(true)
      speak('Pause')
    }
  }

  function reset() {
    clearTimer()
    cancelCountdown()
    countdownActiveRef.current = false
    setPhase('idle'); setTimeLeft(0); setCurrentSerie(1)
    setCurrentTour(1); setPaused(false); setFinished(false)
    setShowConfig(true); setShowConfettis(false); setSessionSaved(false)
  }

  useEffect(() => () => { clearTimer(); cancelCountdown() }, [])

  const totalSecs = tours * series * (effortSec + pauseSec)
  const totalMin  = Math.floor(totalSecs / 60)

  const phaseConfig = {
    effort: { label: 'EFFORT 🔥', bg: 'bg-red-500',   ring: 'border-red-400',   text: 'text-red-500' },
    pause:  { label: 'PAUSE 💚',  bg: 'bg-green-500', ring: 'border-green-400', text: 'text-green-500' },
    repos:  { label: 'REPOS 💧',  bg: 'bg-blue-500',  ring: 'border-blue-400',  text: 'text-blue-500' },
    idle:   { label: 'PRÊT ⚡',   bg: 'bg-zinc-400',  ring: 'border-zinc-300',  text: 'text-zinc-400' },
  }
  const pc = phaseConfig[phase]

  return (
    <div className="page flex flex-col gap-5">

      {showConfettis && <Confettis />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tabata</h1>
          <p className="text-sm text-zinc-500">Entraînement par intervalles</p>
        </div>
        {!showConfig && (
          <button onClick={reset} className="btn-ghost gap-1.5 text-zinc-400">
            <RotateCcw size={14} />Reset
          </button>
        )}
      </div>

      {/* Configuration */}
      {showConfig && (
        <div className="card flex flex-col gap-4">
          <p className="text-sm font-medium flex items-center gap-1.5"><Settings size={14} />Configuration</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Séries par tour</label>
              <input type="number" min="1" max="20" className="input text-center font-mono" value={series} onChange={e => setSeries(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nombre de tours</label>
              <input type="number" min="1" max="10" className="input text-center font-mono" value={tours} onChange={e => setTours(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Durée effort (sec)</label>
              <input type="number" min="5" max="300" className="input text-center font-mono" value={effortSec} onChange={e => setEffortSec(parseInt(e.target.value) || 20)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Durée pause (sec)</label>
              <input type="number" min="5" max="120" className="input text-center font-mono" value={pauseSec} onChange={e => setPauseSec(parseInt(e.target.value) || 10)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">Repos entre les tours (sec)</label>
              <input type="number" min="10" max="300" className="input text-center font-mono" value={reposSec} onChange={e => setReposSec(parseInt(e.target.value) || 60)} />
            </div>
          </div>
          <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-500 flex flex-col gap-1">
            <div className="flex justify-between"><span>Total séries</span><span className="font-mono font-medium">{series * tours}</span></div>
            <div className="flex justify-between"><span>Durée estimée</span><span className="font-mono font-medium">{totalMin} min {totalSecs % 60} sec</span></div>
          </div>
          <div className="bg-tta-light rounded-xl p-3 text-xs text-tta-mid">
            🔊 Active le son de ton téléphone pour le guidage vocal
          </div>
          <button onClick={start} className="btn-primary justify-center py-3 text-base">
            <Play size={18} />Démarrer
          </button>
        </div>
      )}

      {/* Timer actif */}
      {!showConfig && !finished && (
        <div className="flex flex-col items-center gap-6">
          <div className={`w-full rounded-2xl py-3 text-center text-white font-bold text-lg tracking-widest ${pc.bg}`}>
            {pc.label}
          </div>

          {/* Cercle timer */}
          <div className={`w-56 h-56 rounded-full border-8 ${pc.ring} flex flex-col items-center justify-center gap-1 transition-colors duration-300`}>
            <span className={`text-6xl font-mono font-bold ${pc.text}`}>{timeLeft}</span>
            <span className="text-xs text-zinc-400">secondes</span>
          </div>

          {/* Progression */}
          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Série {currentSerie} / {series}</span>
              <span>Tour {currentTour} / {tours}</span>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${pc.bg}`}
                style={{ width: `${(currentSerie / series) * 100}%` }} />
            </div>
          </div>

          {/* Contrôles */}
          <div className="flex gap-3">
            <button onClick={togglePause}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-colors ${paused ? 'bg-tta-mid text-white hover:bg-tta' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
              {paused ? <><Play size={16} />Reprendre</> : <><Pause size={16} />Pause</>}
            </button>
            <button onClick={reset} className="px-4 py-3 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Terminé + Waty */}
      {finished && (
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="text-6xl animate-bounce">🏆</div>

          <Waty
            mode="sport"
            message={`Incroyable ! Tu viens de terminer ${series * tours} séries de Tabata — ${totalMin} minutes d'effort intense ! La récupération est aussi importante que l'entraînement. Pense à t'étirer et à bien t'hydrater 💧🎉`}
            size="lg"
            dismissible={false}
            animate={true}
          />

          <div className="card w-full text-center">
            <p className="text-sm text-zinc-400 mb-1">Séance complète</p>
            <p className="text-2xl font-black text-sport">{series * tours} séries</p>
            <p className="text-sm text-zinc-400 mt-1">{totalMin} min {totalSecs % 60} sec d'effort</p>
            {sessionSaved && (
              <p className="text-xs text-nutri-mid font-semibold mt-2">
                ✓ Séance enregistrée dans l'historique sport
              </p>
            )}
          </div>

          <button onClick={reset} className="btn-sport justify-center px-10 py-3">
            <RotateCcw size={16} />Recommencer
          </button>
        </div>
      )}
    </div>
  )
}
