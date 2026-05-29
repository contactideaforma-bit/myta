'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, Flame, Pencil, Trash2, Plus, X, Check, Loader2 } from 'lucide-react'
import { minutesToHuman } from '@/lib/utils'
import { Waty, WATY_MESSAGES } from '@/components/ui/Waty'
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
  const [sessions, setSessions]       = useState<Session[]>([])
  const [loading, setLoading]         = useState(true)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editForm, setEditForm]       = useState<EditForm>({ session_date: '', duration_min: '', notes: '' })
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [disciplines, setDisciplines] = useState<{ id: string; name: string }[]>([])
  const [newForm, setNewForm]         = useState({ discipline_id: '', session_date: '', duration_min: '', notes: '' })
  const [addSaving, setAddSaving]     = useState(false)

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

  async function loadDisciplines() {
    const { data } = await supabase.from('disciplines').select('id, name')
    setDisciplines(data ?? [])
  }

  useEffect(() => { loadSessions(); loadDisciplines() }, [])

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

  async function addSession() {
    if (!newForm.discipline_id || !newForm.session_date || !newForm.duration_min) return
    setAddSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAddSaving(false); return }
    await supabase.from('sessions').insert({
      user_id: user.id, discipline_id: newForm.discipline_id,
      session_date: newForm.session_date, duration_min: parseInt(newForm.duration_min) || 1,
      notes: newForm.notes.trim() || null,
    })
    setShowAddForm(false)
    setNewForm({ discipline_id: '', session_date: '', duration_min: '', notes: '' })
    await loadSessions()
    setAddSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Historique</h1>
          <p className="text-sm text-zinc-500">{sessions.length} séance{sessions.length > 1 ? 's' : ''} enregistrée{sessions.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAddForm(v => !v)} className="btn-primary">
          <Plus size={16} />Ajouter
        </button>
      </div>

      {showAddForm && (
        <div className="card border-2 border-tta-mid/30 flex flex-col gap-3">
          <p className="text-sm font-medium">Ajouter une séance passée</p>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Discipline</label>
            <select className="input" value={newForm.discipline_id} onChange={e => setNewForm(f => ({ ...f, discipline_id: e.target.value }))}>
              <option value="">Choisir…</option>
              {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Date</label>
              <input type="date" className="input" value={newForm.session_date} onChange={e => setNewForm(f => ({ ...f, session_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Durée (minutes)</label>
              <input type="number" min="1" className="input" placeholder="ex: 45" value={newForm.duration_min} onChange={e => setNewForm(f => ({ ...f, duration_min: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notes (optionnel)</label>
            <textarea rows={2} className="input resize-none" placeholder="Ressenti, observations…" value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={addSession} disabled={addSaving} className="btn-primary flex-1 justify-center">
              {addSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Enregistrer
            </button>
            <button onClick={() => setShowAddForm(false)} className="btn-ghost px-4"><X size={14} /></button>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="card text-center py-12 text-zinc-400">
        <Waty
          mode="sport"
          message={WATY_MESSAGES.sport_no_session}
          size="md"
          dismissible={false}
        />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map(s => {
            const discName = (s.discipline as any)?.name ?? ''
            const isEditing = editingId === s.id
            const isDeleting = deletingId === s.id
            return (
              <div key={s.id} className={`card flex flex-col gap-3 transition-all ${isEditing ? 'border-2 border-tta-mid/30' : ''}`}>
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-tta-mid">Modifier la séance</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Date</label>
                        <input type="date" className="input" value={editForm.session_date} onChange={e => setEditForm(f => ({ ...f, session_date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Durée (min)</label>
                        <input type="number" min="1" className="input" value={editForm.duration_min} onChange={e => setEditForm(f => ({ ...f, duration_min: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
                      <textarea rows={2} className="input resize-none" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
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
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DISC_COLORS[discName] ?? 'bg-zinc-100 text-zinc-600'}`}>{discName}</span>
                        <span className="text-sm font-medium text-zinc-700">
                          {format(new Date(s.session_date), 'EEEE d MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock size={11} />{minutesToHuman(s.duration_min)}</span>
                        <span className="flex items-center gap-1 text-xs text-zinc-400"><Flame size={11} />{Math.round(s.calories_burned ?? 0)} kcal</span>
                      </div>
                      {s.notes && <p className="text-xs text-zinc-400 mt-1 truncate">{s.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"><Pencil size={14} /></button>
                      <button onClick={() => deleteSession(s.id)} disabled={isDeleting} className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500">
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
