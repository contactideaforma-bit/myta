'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Moon, Sun, Clock, ChevronLeft, ChevronRight, Check, Loader2, Trash2, Star } from 'lucide-react'
import { Waty } from '@/components/ui/Waty'

interface SleepLog {
  id: string
  date: string
  bedtime: string
  wake_time: string
  duration_min: number
  notes: string | null
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function sleepQuality(min: number): { label: string; color: string; stars: number } {
  if (min >= 490) return { label: 'Excellent',    color: 'text-nutri-mid',  stars: 5 }
  if (min >= 420) return { label: 'Bon',          color: 'text-green-400',  stars: 4 }
  if (min >= 360) return { label: 'Acceptable',   color: 'text-yellow-500', stars: 3 }
  if (min >= 300) return { label: 'Insuffisant',  color: 'text-orange-500', stars: 2 }
  return               { label: 'Très court',    color: 'text-red-500',    stars: 1 }
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function addDaysStr(str: string, n: number): string {
  const d = new Date(str + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function SleepPage() {
  const supabase = createClient()
  const [logs, setLogs]         = useState<SleepLog[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')

  // Formulaire
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [bedtime, setBedtime]           = useState('23:00')
  const [wakeTime, setWakeTime]         = useState('07:00')
  const [notes, setNotes]               = useState('')

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const from = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('sleep_log').select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .order('date', { ascending: false })
    setLogs((data as SleepLog[]) ?? [])
    setLoading(false)
  }

  async function save() {
    if (!bedtime || !wakeTime) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('sleep_log').upsert({
      user_id:   user.id,
      date:      selectedDate,
      bedtime,
      wake_time: wakeTime,
      notes:     notes.trim() || null,
    }, { onConflict: 'user_id,date' })
    if (error) { showToast('Erreur enregistrement'); setSaving(false); return }
    await loadLogs()
    setNotes('')
    setSaving(false)
    showToast('✓ Nuit enregistrée !')
  }

  async function deleteLog(id: string) {
    await supabase.from('sleep_log').delete().eq('id', id)
    await loadLogs()
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // Pré-remplir si log existant pour la date sélectionnée
  useEffect(() => {
    const existing = logs.find(l => l.date === selectedDate)
    if (existing) {
      setBedtime(existing.bedtime.slice(0, 5))
      setWakeTime(existing.wake_time.slice(0, 5))
      setNotes(existing.notes ?? '')
    } else {
      setBedtime('23:00')
      setWakeTime('07:00')
      setNotes('')
    }
  }, [selectedDate, logs])

  // Durée estimée en temps réel
  const previewMin = (() => {
    if (!bedtime || !wakeTime) return null
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wakeTime.split(':').map(Number)
    const bedMins  = bh * 60 + bm
    const wakeMins = wh * 60 + wm
    return wakeMins > bedMins ? wakeMins - bedMins : (24 * 60 - bedMins) + wakeMins
  })()

  // Stats 7 jours
  const last7 = logs.filter(l => l.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const avgSleep = last7.length
    ? Math.round(last7.reduce((s, l) => s + l.duration_min, 0) / last7.length)
    : null

  const existingForDate = logs.find(l => l.date === selectedDate)
  const watyMsg = avgSleep
    ? avgSleep >= 420
      ? `Super ! Tu dors en moyenne ${formatDuration(avgSleep)} par nuit cette semaine. Continue comme ça 😴✨`
      : `Tu dors en moyenne ${formatDuration(avgSleep)} par nuit. Essaie de viser 7h minimum pour une meilleure récupération 🌙`
    : "Commence à enregistrer tes nuits pour que je puisse analyser ton sommeil 😴"

  return (
    <div className="page">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-tta-mid text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">🌙 Sommeil</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Suivi de tes nuits</p>
      </div>

      {/* Waty */}
      <Waty mode="nutrition" message={watyMsg} size="sm" />

      {/* Stats 7 jours */}
      {last7.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Nuits loggées', value: `${last7.length}/7`, icon: '📅' },
            { label: 'Moyenne', value: avgSleep ? formatDuration(avgSleep) : '—', icon: '⏱️' },
            { label: 'Qualité moy.', value: avgSleep ? sleepQuality(avgSleep).label : '—', icon: '⭐' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="kpi-card items-center text-center p-3">
              <span className="text-xl">{icon}</span>
              <p className="text-base font-extrabold text-zinc-900 mt-1">{value}</p>
              <p className="text-[10px] text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire ajout */}
      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-zinc-900">
            {existingForDate ? '✏️ Modifier la nuit' : '➕ Ajouter une nuit'}
          </h2>
        </div>

        {/* Sélecteur de date */}
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block font-semibold">Date</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedDate(d => addDaysStr(d, -1))}
              className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200">
              <ChevronLeft size={16} />
            </button>
            <input type="date" value={selectedDate}
              max={todayStr()}
              onChange={e => setSelectedDate(e.target.value)}
              className="input flex-1 text-center font-semibold" />
            <button onClick={() => setSelectedDate(d => addDaysStr(d, 1))}
              disabled={selectedDate >= todayStr()}
              className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
          <p className="text-xs text-zinc-400 text-center mt-1 capitalize">
            {format(parseISO(selectedDate), 'EEEE d MMMM', { locale: fr })}
          </p>
        </div>

        {/* Heures */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block font-semibold flex items-center gap-1">
              <Moon size={12} className="text-tta-mid" />Couché
            </label>
            <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)}
              className="input text-center font-mono text-lg font-bold" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block font-semibold flex items-center gap-1">
              <Sun size={12} className="text-yellow-500" />Réveil
            </label>
            <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
              className="input text-center font-mono text-lg font-bold" />
          </div>
        </div>

        {/* Preview durée */}
        {previewMin !== null && (
          <div className={`rounded-2xl p-3 text-center ${sleepQuality(previewMin).color}`}>
            <p className="text-2xl font-extrabold">{formatDuration(previewMin)}</p>
            <p className="text-sm font-semibold">{sleepQuality(previewMin).label}</p>
            <div className="flex justify-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={12}
                  fill={i < sleepQuality(previewMin).stars ? 'currentColor' : 'none'}
                  className={i < sleepQuality(previewMin).stars ? '' : 'opacity-30'} />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Notes (optionnel)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="ex: nuit agitée, réveil à 3h..."
            className="input" />
        </div>

        <button onClick={save} disabled={saving}
          className="btn-primary justify-center py-3">
          {saving
            ? <><Loader2 size={16} className="animate-spin" />Enregistrement…</>
            : <><Check size={16} />{existingForDate ? 'Mettre à jour' : 'Enregistrer la nuit'}</>
          }
        </button>
      </div>

      {/* Historique */}
      {logs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-extrabold text-zinc-900">📅 Historique (30 jours)</h2>
          {logs.map(log => {
            const q = sleepQuality(log.duration_min)
            return (
              <div key={log.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 bg-tta-light rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Moon size={18} className="text-tta-mid" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-zinc-900 capitalize">
                    {format(parseISO(log.date), 'EEE d MMM', { locale: fr })}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">
                      {log.bedtime.slice(0, 5)} → {log.wake_time.slice(0, 5)}
                    </span>
                    <span className={`text-xs font-bold ${q.color}`}>{formatDuration(log.duration_min)}</span>
                  </div>
                  {log.notes && <p className="text-xs text-zinc-400 mt-0.5 truncate">{log.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10}
                        className={q.color}
                        fill={i < q.stars ? 'currentColor' : 'none'}
                        opacity={i < q.stars ? 1 : 0.3} />
                    ))}
                  </div>
                  <button onClick={() => { setSelectedDate(log.date) }}
                    className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400">
                    <ChevronLeft size={13} className="rotate-180" />
                  </button>
                  <button onClick={() => deleteLog(log.id)}
                    className="p-1.5 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
