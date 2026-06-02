'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Moon, Sun, ChevronLeft, ChevronRight, Check, Loader2, Trash2, Star, ArrowDown } from 'lucide-react'
import { Waty } from '@/components/ui/Waty'

interface SleepLog {
  id: string
  date: string        // date du RÉVEIL — convention : "nuit lundi→mardi" stockée sous "mardi"
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
  if (min >= 490) return { label: 'Excellent',   color: 'text-nutri-mid',  stars: 5 }
  if (min >= 420) return { label: 'Bon',         color: 'text-green-400',  stars: 4 }
  if (min >= 360) return { label: 'Acceptable',  color: 'text-yellow-500', stars: 3 }
  if (min >= 300) return { label: 'Insuffisant', color: 'text-orange-500', stars: 2 }
  return               { label: 'Très court',   color: 'text-red-500',    stars: 1 }
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function addDaysStr(str: string, n: number): string {
  const d = new Date(str + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** "Nuit du lundi 14 au mardi 15 janvier" — wakeDate est la date du réveil */
function nightLabel(wakeDate: string): string {
  const bedDate = addDaysStr(wakeDate, -1)
  const bedStr  = format(parseISO(bedDate),  'EEEE d', { locale: fr })
  const wakeStr = format(parseISO(wakeDate), 'EEEE d MMMM', { locale: fr })
  return `du ${bedStr} au ${wakeStr}`
}

export default function SleepPage() {
  const supabase = createClient()
  const [logs, setLogs]       = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState('')

  // selectedDate = date du réveil (ex: "mardi 15" = nuit de lundi à mardi)
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

  const previewMin = (() => {
    if (!bedtime || !wakeTime) return null
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wakeTime.split(':').map(Number)
    const bedMins  = bh * 60 + bm
    const wakeMins = wh * 60 + wm
    return wakeMins > bedMins ? wakeMins - bedMins : (24 * 60 - bedMins) + wakeMins
  })()

  const last7    = logs.filter(l => l.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const avgSleep = last7.length
    ? Math.round(last7.reduce((s, l) => s + l.duration_min, 0) / last7.length)
    : null

  const existingForDate = logs.find(l => l.date === selectedDate)

  // Date du coucher = veille de la date de réveil sélectionnée
  const bedDate = addDaysStr(selectedDate, -1)

  const watyMsg = avgSleep
    ? avgSleep >= 420
      ? `Super ! Tu dors en moyenne ${formatDuration(avgSleep)} par nuit cette semaine. Continue comme ça 😴✨`
      : `Tu dors en moyenne ${formatDuration(avgSleep)} par nuit. Essaie de viser 7h minimum pour une meilleure récupération 🌙`
    : "Commence à enregistrer tes nuits pour que je puisse analyser ton sommeil 😴"

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  return (
    <div className="page">

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-tta-mid text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">🌙 Sommeil</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Suivi de tes nuits</p>
      </div>

      <Waty mode="nutrition" message={watyMsg} size="sm" />

      {last7.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Nuits loggées', value: `${last7.length}/7`, icon: '📅' },
            { label: 'Moyenne',       value: avgSleep ? formatDuration(avgSleep) : '—', icon: '⏱️' },
            { label: 'Qualité moy.',  value: avgSleep ? sleepQuality(avgSleep).label : '—', icon: '⭐' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="kpi-card items-center text-center p-3">
              <span className="text-xl">{icon}</span>
              <p className="text-base font-extrabold text-zinc-900 mt-1">{value}</p>
              <p className="text-[10px] text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Formulaire ─────────────────────────────────────────────────────── */}
      <div className="card flex flex-col gap-5">
        <h2 className="font-extrabold text-zinc-900">
          {existingForDate ? '✏️ Modifier la nuit' : '➕ Ajouter une nuit'}
        </h2>

        {/* ── Sélection de la nuit ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Quelle nuit ?
          </label>

          {/* Navigateur date */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(d => addDaysStr(d, -1))}
              className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={e => setSelectedDate(e.target.value)}
              className="input flex-1 text-center font-semibold text-sm"
            />
            <button
              onClick={() => setSelectedDate(d => addDaysStr(d, 1))}
              disabled={selectedDate >= todayStr()}
              className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 disabled:opacity-30 flex-shrink-0"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Étiquette claire de la nuit sélectionnée */}
          <div className="flex items-center justify-center gap-2 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-2.5">
            <Moon size={13} className="text-tta-mid flex-shrink-0" />
            <p className="text-sm font-bold text-zinc-700 text-center capitalize">
              Nuit {nightLabel(selectedDate)}
            </p>
          </div>
        </div>

        {/* ── Heures — layout vertical, aucun risque de débordement ────────── */}
        <div className="flex flex-col gap-2">

          {/* Coucher */}
          <div className="flex items-center gap-4 bg-[#f0f0ff] rounded-2xl px-4 py-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}
            >
              <Moon size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Coucher</p>
              <p className="text-xs text-zinc-500 capitalize mt-0.5">
                {format(parseISO(bedDate), 'EEEE d MMMM', { locale: fr })}
              </p>
            </div>
            <input
              type="time"
              value={bedtime}
              onChange={e => setBedtime(e.target.value)}
              className="w-28 flex-shrink-0 bg-white border-2 border-[#4B47A0]/25 rounded-xl px-2 py-2.5 font-mono text-xl font-bold text-zinc-900 text-center focus:outline-none focus:border-[#4B47A0]"
            />
          </div>

          {/* Flèche liaison */}
          <div className="flex items-center gap-3 px-6">
            <div className="flex-1 h-px bg-zinc-200" />
            <ArrowDown size={14} className="text-zinc-300" />
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          {/* Réveil */}
          <div className="flex items-center gap-4 bg-yellow-50 rounded-2xl px-4 py-3.5">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sun size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Réveil</p>
              <p className="text-xs text-zinc-500 capitalize mt-0.5">
                {format(parseISO(selectedDate), 'EEEE d MMMM', { locale: fr })}
              </p>
            </div>
            <input
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
              className="w-28 flex-shrink-0 bg-white border-2 border-yellow-300 rounded-xl px-2 py-2.5 font-mono text-xl font-bold text-zinc-900 text-center focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* ── Preview durée ───────────────────────────────────────────────── */}
        {previewMin !== null && (
          <div className={`rounded-2xl p-3 text-center bg-zinc-50 ${sleepQuality(previewMin).color}`}>
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
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="ex : nuit agitée, réveil à 3h…"
            className="input"
          />
        </div>

        <button onClick={save} disabled={saving} className="btn-primary justify-center py-3">
          {saving
            ? <><Loader2 size={16} className="animate-spin" />Enregistrement…</>
            : <><Check size={16} />{existingForDate ? 'Mettre à jour' : 'Enregistrer la nuit'}</>
          }
        </button>
      </div>

      {/* ── Historique ───────────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-extrabold text-zinc-900">📅 Historique (30 jours)</h2>
          {logs.map(log => {
            const q          = sleepQuality(log.duration_min)
            const logBedDate = addDaysStr(log.date, -1)
            return (
              <div key={log.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 bg-tta-light rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Moon size={18} className="text-tta-mid" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* "lun. → mar. 15 jan." */}
                  <p className="font-bold text-sm text-zinc-900 capitalize">
                    {format(parseISO(logBedDate), 'EEE', { locale: fr })}
                    {' → '}
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
                      <Star key={i} size={10} className={q.color}
                        fill={i < q.stars ? 'currentColor' : 'none'}
                        opacity={i < q.stars ? 1 : 0.3} />
                    ))}
                  </div>
                  <button onClick={() => setSelectedDate(log.date)}
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
