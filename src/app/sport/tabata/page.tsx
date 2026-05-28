'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Settings } from 'lucide-react'

type Phase = 'effort' | 'pause' | 'repos' | 'idle'

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateRef    = useRef({ phase: 'idle' as Phase, timeLeft: 0, serie: 1, tour: 1 })

  function clearTimer() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  function nextPhase() {
    const { phase, serie, tour } = stateRef.current
    if (phase === 'effort') {
      if (serie === series && tour === tours) {
        stateRef.current = { ...stateRef.current, phase: 'idle', timeLeft: 0 }
        setPhase('idle'); setFinished(true); clearTimer(); return
      }
      stateRef.current = { ...stateRef.current, phase: 'pause', timeLeft: pauseSec }
      setPhase('pause'); setTimeLeft(pauseSec)
    } else if (phase === 'pause') {
      if (serie < series) {
        const nextSerie = serie + 1
        stateRef.current = { ...stateRef.current, phase: 'effort', timeLeft: effortSec, serie: nextSerie }
        setPhase('effort'); setTimeLeft(effortSec); setCurrentSerie(nextSerie)
      } else {
        if (tour < tours) {
          stateRef.current = { ...stateRef.current, phase: 'repos', timeLeft: reposSec }
          setPhase('repos'); setTimeLeft(reposSec)
        } else {
          stateRef.current = { ...stateRef.current, phase: 'idle', timeLeft: 0 }
          setPhase('idle'); setFinished(true); clearTimer()
        }
      }
    } else if (phase === 'repos') {
      const nextTour = tour + 1
      stateRef.current = { ...stateRef.current, phase: 'effort', timeLeft: effortSec, serie: 1, tour: nextTour }
      setPhase('effort'); setTimeLeft(effortSec); setCurrentSerie(1); setCurrentTour(nextTour)
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

  function start() {
    setFinished(false); setCurrentSerie(1); setCurrentTour(1); setPaused(false); setShowConfig(false)
    stateRef.current = { phase: 'effort', timeLeft: effortSec, serie: 1, tour: 1 }
    setPhase('effort'); setTimeLeft(effortSec); startTimer()
  }

  function togglePause() {
    if (paused) { startTimer(); setPaused(false) }
    else { clearTimer(); setPaused(true) }
  }

  function reset() {
    clearTimer(); setPhase('idle'); setTimeLeft(0); setCurrentSerie(1)
    setCurrentTour(1); setPaused(false); setFinished(false); setShowConfig(true)
  }

  useEffect(() => () => clearTimer(), [])

  const totalSecs = tours * series * (effortSec + pauseSec)
  const totalMin  = Math.floor(totalSecs / 60)

  const phaseConfig = {
    effort: { label: 'EFFORT', bg: 'bg-red-500',   ring: 'border-red-400'   },
    pause:  { label: 'PAUSE',  bg: 'bg-green-500', ring: 'border-green-400' },
    repos:  { label: 'REPOS',  bg: 'bg-blue-500',  ring: 'border-blue-400'  },
    idle:   { label: 'PRÊT',   bg: 'bg-zinc-400',  ring: 'border-zinc-300'  },
  }
  const pc = phaseConfig[phase]

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">

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
          <div className={`w-56 h-56 rounded-full border-8 ${pc.ring} flex flex-col items-center justify-center gap-1 transition-colors duration-300`}>
            <span className="text-6xl font-mono font-bold text-zinc-900">{timeLeft}</span>
            <span className="text-xs text-zinc-400">secondes</span>
          </div>
          <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Série {currentSerie} / {series}</span>
              <span>Tour {currentTour} / {tours}</span>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${pc.bg}`} style={{ width: `${(currentSerie / series) * 100}%` }} />
            </div>
          </div>
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

      {/* Terminé */}
      {finished && (
        <div className="card flex flex-col items-center gap-4 py-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🎉</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-green-600">Séance terminée !</p>
            <p className="text-sm text-zinc-500 mt-1">{series * tours} séries · {totalMin} min d'effort</p>
          </div>
          <button onClick={reset} className="btn-primary justify-center px-8">
            <RotateCcw size={16} />Recommencer
          </button>
        </div>
      )}
    </div>
  )
}
