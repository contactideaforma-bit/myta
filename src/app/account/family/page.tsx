'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, UserPlus, Baby, Crown, Loader2, Mail, CheckCircle,
  AlertCircle, ArrowLeft, Trash2, Plus, CalendarDays, Weight, Ruler,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FamilyMember {
  id:          string
  full_name:   string | null
  family_role: 'partner' | 'child'
}

interface PendingInvite {
  id:            string
  invited_email: string
  role:          'partner' | 'child'
  created_at:    string
  expires_at:    string
}

interface ChildProfile {
  id:         string
  name:       string
  birth_date: string | null
  weight_kg:  number | null
  height_cm:  number | null
  gender:     string | null
}

interface ProfileData {
  plan:                string | null
  family_role:         string | null
  family_owner_id:     string | null
  subscription_status: string | null
}

const GENDER_LABEL: Record<string, string> = { male: 'Garçon', female: 'Fille', other: 'Autre' }

function age(birthDate: string | null) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let a = today.getFullYear() - birth.getFullYear()
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) a--
  return a
}

export default function FamilyPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,  setProfile]  = useState<ProfileData | null>(null)
  const [members,  setMembers]  = useState<FamilyMember[]>([])
  const [invites,  setInvites]  = useState<PendingInvite[]>([])
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [loading,  setLoading]  = useState(true)
  const [token,    setToken]    = useState('')

  // Invite partenaire
  const [partnerEmail, setPartnerEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Ajout enfant
  const [showChildForm, setShowChildForm] = useState(false)
  const [childForm, setChildForm] = useState({
    name: '', birth_date: '', weight_kg: '', height_cm: '', gender: '',
  })
  const [savingChild, setSavingChild] = useState(false)
  const [childMsg, setChildMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    setToken(session.access_token)
    const t = session.access_token

    const { data: p } = await supabase
      .from('profiles')
      .select('plan, family_role, family_owner_id, subscription_status')
      .eq('id', session.user.id)
      .single()
    setProfile(p)

    if (!p?.family_owner_id) {
      const [membersRes, invitesRes, childrenRes] = await Promise.all([
        fetch('/api/family/members', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/family/invites',  { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/family/child',    { headers: { Authorization: `Bearer ${t}` } }),
      ])
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(Array.isArray(data) ? data : (data.members ?? []))
      }
      if (invitesRes.ok) setInvites(await invitesRes.json())
      if (childrenRes.ok) setChildren(await childrenRes.json())
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function handleInvitePartner(e: React.FormEvent) {
    e.preventDefault()
    setSendingInvite(true); setInviteMsg(null)
    try {
      const res  = await fetch('/api/family/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ email: partnerEmail.trim(), role: 'partner' }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteMsg({ type: 'ok', text: `Invitation envoyée à ${partnerEmail} !` })
        setPartnerEmail('')
        await load()
      } else {
        setInviteMsg({ type: 'err', text: data.error ?? 'Erreur lors de l\'envoi' })
      }
    } finally {
      setSendingInvite(false)
    }
  }

  async function handleRevoke(inviteId: string) {
    await fetch(`/api/family/invite/${inviteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await load()
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault()
    setSavingChild(true); setChildMsg(null)
    try {
      const res  = await fetch('/api/family/child', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          name:       childForm.name.trim(),
          birth_date: childForm.birth_date   || null,
          weight_kg:  childForm.weight_kg    || null,
          height_cm:  childForm.height_cm    || null,
          gender:     childForm.gender       || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setChildMsg({ type: 'ok', text: `${childForm.name} ajouté(e) ! 🎉` })
        setChildForm({ name: '', birth_date: '', weight_kg: '', height_cm: '', gender: '' })
        setShowChildForm(false)
        await load()
      } else {
        setChildMsg({ type: 'err', text: data.error ?? 'Erreur' })
      }
    } finally {
      setSavingChild(false)
    }
  }

  async function handleDeleteChild(id: string, name: string) {
    if (!confirm(`Supprimer le profil de ${name} ?`)) return
    await fetch(`/api/family/child?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    await load()
  }

  const isFamille   = profile?.plan?.includes('famille')
  const isCouple    = profile?.plan?.includes('couple') || isFamille
  const currentPartners = members.filter(m => m.family_role === 'partner').length
  const canAddPartner   = isCouple && currentPartners < 1
  const pendingPartner  = invites.filter(i => i.role === 'partner')
  const canAddChild     = isFamille && children.length < 3
  const isFamilyPlan    = isCouple || isFamille

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-[#4B47A0]" />
    </div>
  )

  // ── Membre d'une famille ───────────────────────────────────────────────────
  if (profile?.family_owner_id) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        <button onClick={() => router.push('/account')}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors w-fit">
          <ArrowLeft size={16} /> Mon compte
        </button>
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center">
            {profile.family_role === 'child'
              ? <Baby size={24} className="text-violet-500" />
              : <Users size={24} className="text-violet-500" />
            }
          </div>
          <p className="text-lg font-bold text-zinc-900">
            {profile.family_role === 'child' ? 'Compte enfant' : 'Compte partenaire'}
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Tu fais partie d'un abonnement famille MYTA.
          </p>
          <p className="text-xs text-zinc-400">
            Pour gérer l'abonnement, contacte le titulaire du compte.
          </p>
        </div>
      </div>
    )
  }

  // ── Pas de plan famille ───────────────────────────────────────────────────
  if (!isFamilyPlan) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
        <button onClick={() => router.push('/account')}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors w-fit">
          <ArrowLeft size={16} /> Mon compte
        </button>
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center">
            <Users size={24} className="text-zinc-400" />
          </div>
          <p className="text-lg font-bold text-zinc-900">Forfait Couple ou Famille</p>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
            Ton forfait actuel est individuel. Passe à un forfait Couple ou Famille pour inviter des proches.
          </p>
          <button onClick={() => router.push('/pricing')}
            className="px-6 py-3 rounded-2xl text-white text-sm font-bold"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
            Voir les forfaits
          </button>
        </div>
      </div>
    )
  }

  // ── Propriétaire d'un plan famille/couple ─────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">

      <button onClick={() => router.push('/account')}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors w-fit">
        <ArrowLeft size={16} /> Mon compte
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
          <Users size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900">Ma famille</h1>
          <p className="text-sm text-zinc-400">Forfait {profile?.plan?.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* ── Section Partenaire ──────────────────────────────────────────── */}
      {isCouple && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3">
            <Crown size={15} className="text-teal-500" />
            <p className="text-sm font-bold text-zinc-900">Partenaire</p>
          </div>

          {/* Partenaire lié */}
          {members.filter(m => m.family_role === 'partner').map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-t border-zinc-50">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Crown size={16} className="text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800 truncate">{m.full_name ?? 'Sans nom'}</p>
                <p className="text-[11px] text-zinc-400">Partenaire lié</p>
              </div>
              <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-1 rounded-lg">Actif</span>
            </div>
          ))}

          {/* Invitations en attente */}
          {pendingPartner.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3 border-t border-zinc-50">
              <Mail size={15} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-700 truncate">{inv.invited_email}</p>
                <p className="text-[11px] text-zinc-400">
                  En attente · expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button onClick={() => handleRevoke(inv.id)}
                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Formulaire d'invitation partenaire */}
          {canAddPartner && pendingPartner.length === 0 && (
            <form onSubmit={handleInvitePartner}
              className="border-t border-zinc-50 px-4 py-4 flex flex-col gap-3">
              <p className="text-xs text-zinc-500">Inviter par email — ton/ta partenaire recevra un lien pour rejoindre MYTA.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email" required
                    placeholder="Email du partenaire"
                    value={partnerEmail}
                    onChange={e => setPartnerEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#4B47A0] transition-all"
                  />
                </div>
                <button type="submit" disabled={sendingInvite || !partnerEmail}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 flex items-center gap-1.5"
                  style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                  {sendingInvite ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  Inviter
                </button>
              </div>
              {inviteMsg && (
                <div className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 ${
                  inviteMsg.type === 'ok'
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {inviteMsg.type === 'ok' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {inviteMsg.text}
                </div>
              )}
            </form>
          )}

          {!canAddPartner && pendingPartner.length === 0 && members.filter(m => m.family_role === 'partner').length === 0 && (
            <p className="px-4 pb-4 pt-2 text-xs text-zinc-400">
              Tu peux inviter 1 partenaire sur ce forfait.
            </p>
          )}
        </div>
      )}

      {/* ── Section Enfants ─────────────────────────────────────────────── */}
      {isFamille && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Baby size={15} className="text-violet-500" />
              <p className="text-sm font-bold text-zinc-900">
                Enfants
                <span className="ml-1.5 text-[11px] font-normal text-zinc-400">{children.length}/3</span>
              </p>
            </div>
            {canAddChild && !showChildForm && (
              <button onClick={() => { setShowChildForm(true); setChildMsg(null) }}
                className="flex items-center gap-1 text-xs font-bold text-[#4B47A0] hover:opacity-75 transition-opacity">
                <Plus size={13} /> Ajouter
              </button>
            )}
          </div>

          {/* Liste des enfants */}
          {children.map(child => (
            <div key={child.id} className="flex items-center gap-3 px-4 py-3 border-t border-zinc-50">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <Baby size={16} className="text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800">{child.name}</p>
                <p className="text-[11px] text-zinc-400">
                  {[
                    child.birth_date && `${age(child.birth_date)} ans`,
                    child.gender && GENDER_LABEL[child.gender],
                    child.weight_kg && `${child.weight_kg} kg`,
                    child.height_cm && `${child.height_cm} cm`,
                  ].filter(Boolean).join(' · ') || 'Enfant'}
                </p>
              </div>
              <button onClick={() => handleDeleteChild(child.id, child.name)}
                className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {children.length === 0 && !showChildForm && (
            <p className="px-4 pb-4 pt-1 text-xs text-zinc-400">
              Aucun enfant ajouté. Clique sur "Ajouter" pour créer un profil.
            </p>
          )}

          {/* Formulaire d'ajout d'enfant */}
          {showChildForm && (
            <form onSubmit={handleAddChild}
              className="border-t border-zinc-50 px-4 py-4 flex flex-col gap-3">
              <p className="text-xs font-bold text-zinc-700">Nouveau profil enfant</p>

              {/* Prénom */}
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Prénom *</label>
                <input
                  type="text" required
                  placeholder="ex : Emma"
                  value={childForm.name}
                  onChange={e => setChildForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#4B47A0] transition-all"
                />
              </div>

              {/* Date de naissance + Genre */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 mb-1 flex items-center gap-1">
                    <CalendarDays size={10} /> Naissance
                  </label>
                  <input
                    type="date"
                    value={childForm.birth_date}
                    onChange={e => setChildForm(f => ({ ...f, birth_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#4B47A0] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 mb-1 block">Genre</label>
                  <select
                    value={childForm.gender}
                    onChange={e => setChildForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#4B47A0] transition-all"
                  >
                    <option value="">—</option>
                    <option value="male">Garçon</option>
                    <option value="female">Fille</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              {/* Poids + Taille */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 mb-1 flex items-center gap-1">
                    <Weight size={10} /> Poids (kg)
                  </label>
                  <input
                    type="number" min="1" max="200" step="0.1"
                    placeholder="ex : 25"
                    value={childForm.weight_kg}
                    onChange={e => setChildForm(f => ({ ...f, weight_kg: e.target.value }))}
                    className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#4B47A0] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 mb-1 flex items-center gap-1">
                    <Ruler size={10} /> Taille (cm)
                  </label>
                  <input
                    type="number" min="30" max="220" step="0.5"
                    placeholder="ex : 130"
                    value={childForm.height_cm}
                    onChange={e => setChildForm(f => ({ ...f, height_cm: e.target.value }))}
                    className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#4B47A0] transition-all"
                  />
                </div>
              </div>

              {childMsg && (
                <div className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 ${
                  childMsg.type === 'ok'
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {childMsg.type === 'ok' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {childMsg.text}
                </div>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowChildForm(false); setChildMsg(null) }}
                  className="flex-1 py-2.5 rounded-xl border-2 border-zinc-200 text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-all">
                  Annuler
                </button>
                <button type="submit" disabled={savingChild || !childForm.name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                  {savingChild ? <Loader2 size={14} className="animate-spin" /> : <><Baby size={14} /> Créer le profil</>}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  )
}
