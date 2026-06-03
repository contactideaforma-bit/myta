'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, Flame, Pencil, Trash2, X, Check, Loader2, Mic, ChevronLeft, ChevronRight } from 'lucide-react'
import { minutesToHuman } from '@/lib/utils'
import { Waty, WATY_MESSAGES } from '@/components/ui/Waty'
import { VoiceSession } from '@/components/sport/VoiceSession'
import type { Session } from '@/types'

const DISC_COLORS: Record<string, string> = {
  Natation:    'bg-swim-light text-swim-dark',
  Musculation: 'bg-gym-light text-gym-dark',
  Cardio:      'bg-cardio-light text-cardio-dark',
  Boxe:        'bg-boxing-light text-boxing-dark',
}
const DISC_DOT: Record<string, string> = {
  Natation:    'bg-swim',
  Musculation: 'bg-gym',
  Cardio:      'bg-cardio',
  Boxe:        'bg-boxing',
}

interface EditForm { session_date: string; duration_min: string; notes: string }

export default function HistoryPage() {
  const [sessions, setSessions]     = useState<Session[]>([])
  const [loading, setLoading]       = useState(true)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<EditForm>({ session_date: '', duration_min: '', notes: '' })
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showVoice, setShowVoice]   = useState(false)
  const [savedToast, setSavedToast]     = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const supabase = createClient()

  async function loadSessions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('sessions').select('*, discipline:disciplines(*)')
      .eq('user_id', user.id).order('session_date', { ascending: false })
    setSessions((data as Session[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadSessions() }, [])

  function startEdit(s: Session) {
    setEditingId(s.id)
    setEditForm({ session_date: s.session_date, duration_min: String(s.duration_min), notes: s.notes ?? '' })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase.from('sessions').update({
      session_date: editForm.session_date,
      duration_min: parseInt(editForm.duration_min) || 1,
      notes: editForm.notes.trim() || null,
    }).eq('id', id)
    setEditingId(null)
    await loadSessions()
    setSaving(false)
  }

  async function deleteSession(id: string) {
    setDeletingId(id)
    await supabase.from('sessions').delete().eq('id', id)
    await loadSessions()
    setDeletingId(null)
  }

  async function handleVoiceConfirm(voiceSession: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      const DISC_MAP: Record<string, string> = {
        natation: 'Natation', musculation: 'Musculation', cardio: 'Cardio', boxe: 'Boxe',
      }
      const discName = DISC_MAP[voiceSession.discipline?.toLowerCase()] ?? 'Cardio'
      const { data: profile } = await supabase.from('profiles').select('weight_kg').eq('id', user.id).single()
      const weight = (profile as any)?.weight_kg ?? 70
      const { data: discList } = await supabase.from('disciplines').select('id').ilike('name', discName)
      const discId = discList?.[0]?.id ?? null
      const sessionDate = voiceSession.custom_date ?? new Date().toISOString().slice(0, 10)
      await supabase.from('sessions').insert({
        user_id:         user.id,
        discipline_id:   discId,
        session_date:    sessionDate,
        duration_min:    voiceSession.duration_min ?? 30,
        calories_burned: voiceSession.calories_estimate ?? Math.round(5 * weight * ((voiceSession.duration_min ?? 30) / 60)),
        notes:           voiceSession.notes ?? null,
      })
      setShowVoice(false)
      await loadSessions()
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 3000)
    } catch (err) { console.error(err) }
  }

  // ── Calendrier navigable ─────────────────────────────────────────────────
  const now        = new Date()
  const monthStart = startOfMonth(calendarMonth)
  const monthEnd   = endOfMonth(calendarMonth)
  const monthDays  = eachDayOfInterval({ start: monthStart, end: monthEnd })

  function prevMonth() {
    setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    if (next <= now) setCalendarMonth(next)
  }
  const isCurrentMonth = calendarMonth.getFullYear() === now.getFullYear() &&
                         calendarMonth.getMonth() === now.getMonth()

  // Jours avec séance ce mois
  const sportDaysThisMonth = new Set(
    sessions
      .filter(s => {
        const d = s.session_date
        return d >= format(monthStart, 'yyyy-MM-dd') && d <= format(monthEnd, 'yyyy-MM-dd')
      })
      .map(s => s.session_date)
  )

  const totalSportDays = sportDaysThisMonth.size
  const todayStr = format(now, 'yyyy-MM-dd')

  // Jour de début du mois (0=dim, 1=lun…) → décalage pour grille lun-dim
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7 // 0=lun

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  return (
    <div className="page">

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-sport text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm">
          <Check size={16} />Séance ajoutée à l'historique !
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Historique</h1>
          <p className="text-sm text-zinc-500">{sessions.length} séance{sessions.length > 1 ? 's' : ''} enregistrée{sessions.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowVoice(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${showVoice ? 'bg-sport text-white' : 'btn-primary'}`}>
          <Mic size={15} />
          {showVoice ? 'Fermer' : 'Ajouter'}
        </button>
      </div>

      {showVoice && (
        <VoiceSession
          onConfirm={handleVoiceConfirm}
          onCancel={() => setShowVoice(false)}
          allowDatePick={true}
        />
      )}

      {/* ── Calendrier du mois ── */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth}
              className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-all">
              <ChevronLeft size={14} className="text-zinc-600" />
            </button>
            <h2 className="text-sm font-extrabold text-zinc-900 capitalize w-28 text-center">
              {format(calendarMonth, 'MMM yyyy', { locale: fr })}
            </h2>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="w-7 h-7 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-all disabled:opacity-30">
              <ChevronRight size={14} className="text-zinc-600" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sport">{totalSportDays} jour{totalSportDays > 1 ? 's' : ''}</span>
            <div className="w-8 h-8 rounded-full bg-sport/10 flex items-center justify-center">
              <span className="text-sm font-black text-sport">{totalSportDays}</span>
            </div>
          </div>
        </div>

        {/* En-têtes jours */}
        <div className="grid grid-cols-7 gap-1">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-zinc-400 py-1">{d}</div>
          ))}
        </div>

        {/* Grille jours */}
        <div className="grid grid-cols-7 gap-1">
          {/* Cellules vides pour l'offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {monthDays.map(day => {
            const dateStr  = format(day, 'yyyy-MM-dd')
            const hasSport = sportDaysThisMonth.has(dateStr)
            const isToday  = dateStr === todayStr
            const isPast   = dateStr <= todayStr

            return (
              <div
                key={dateStr}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center relative
                  ${hasSport
                    ? 'bg-sport text-white shadow-sm'
                    : isToday
                    ? 'bg-tta-light border-2 border-tta-mid text-tta-mid'
                    : isPast
                    ? 'bg-zinc-50 text-zinc-400'
                    : 'text-zinc-200'
                  }
                `}
              >
                <span className={`text-[11px] font-bold leading-none ${hasSport ? 'text-white' : ''}`}>
                  {format(day, 'd')}
                </span>
                {hasSport && (
                  <span className="text-[8px] mt-0.5 opacity-80">✓</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 pt-1 border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-sport" />
            <span className="text-[10px] text-zinc-500">Séance enregistrée</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-tta-light border border-tta-mid" />
            <span className="text-[10px] text-zinc-500">Aujourd'hui</span>
          </div>
        </div>
      </div>

      {/* Liste séances */}
      {sessions.length === 0 ? (
        <Waty mode="sport" message={WATY_MESSAGES.sport_no_session} size="md" dismissible={false} />
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map(s => {
            const discName  = (s.discipline as any)?.name ?? ''
            const isEditing  = editingId === s.id
            const isDeleting = deletingId === s.id
            return (
              <div key={s.id} className={`card flex flex-col gap-3 transition-all ${isEditing ? 'border-2 border-sport/30' : ''}`}>
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-bold text-sport">Modifier la séance</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Date</label>
                        <input type="date" className="input" value={editForm.session_date}
                          onChange={e => setEditForm(f => ({ ...f, session_date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Durée (min)</label>
                        <input type="number" min="1" className="input" value={editForm.duration_min}
                          onChange={e => setEditForm(f => ({ ...f, duration_min: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
                      <textarea rows={2} className="input resize-none" value={editForm.notes}
                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(s.id)} disabled={saving} className="btn-primary flex-1 justify-center">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Sauvegarder
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost px-4"><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DISC_DOT[discName] ?? 'bg-zinc-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${DISC_COLORS[discName] ?? 'bg-zinc-100 text-zinc-600'}`}>{discName}</span>
                        <span className="text-sm font-bold text-zinc-700">
                          {format(new Date(s.session_date + 'T12:00'), 'EEEE d MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock size={11} />{minutesToHuman(s.duration_min)}</span>
                        <span className="flex items-center gap-1 text-xs text-zinc-400"><Flame size={11} />{Math.round(s.calories_burned ?? 0)} kcal</span>
                      </div>
                      {s.notes && <p className="text-xs text-zinc-400 mt-1 truncate">{s.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(s)} className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"><Pencil size={14} /></button>
                      <button onClick={() => deleteSession(s.id)} disabled={isDeleting} className="p-1.5 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-500">
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
