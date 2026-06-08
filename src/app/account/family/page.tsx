'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, UserPlus, Baby, Crown, Loader2, Mail, CheckCircle,
  AlertCircle, ArrowLeft, Trash2
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

interface ProfileData {
  plan:              string | null
  family_role:       string | null
  family_owner_id:   string | null
  subscription_status: string | null
}

export default function FamilyPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile,  setProfile]  = useState<ProfileData | null>(null)
  const [members,  setMembers]  = useState<FamilyMember[]>([])
  const [invites,  setInvites]  = useState<PendingInvite[]>([])
  const [loading,  setLoading]  = useState(true)
  const [email,    setEmail]    = useState('')
  const [role,     setRole]     = useState<'partner' | 'child'>('partner')
  const [sending,  setSending]  = useState(false)
  const [msg,      setMsg]      = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const token = session.access_token

    // Récupérer le profil
    const { data: p } = await supabase
      .from('profiles')
      .select('plan, family_role, family_owner_id, subscription_status')
      .eq('id', session.user.id)
      .single()
    setProfile(p)

    // Si propriétaire : charger membres + invites
    if (!p?.family_owner_id) {
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/family/members', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/family/invites',  { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (membersRes.ok) {
        const data = await membersRes.json()
        // L'API retourne { self, members[], owner } — on extrait members
        setMembers(Array.isArray(data) ? data : (data.members ?? []))
      }
      if (invitesRes.ok) setInvites(await invitesRes.json())
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res  = await fetch('/api/family/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: `Invitation envoyée à ${email} !` })
        setEmail('')
        await load()
      } else {
        setMsg({ type: 'err', text: data.error ?? 'Erreur lors de l\'envoi' })
      }
    } finally {
      setSending(false)
    }
  }

  async function handleRevoke(inviteId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/family/invite/${inviteId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    await load()
  }

  // ─── Planification : combien peut-on encore inviter ? ──────────────────────

  const maxAdults   = profile?.plan?.includes('couple') || profile?.plan?.includes('famille') ? 2 : 1
  const maxChildren = profile?.plan?.includes('famille') ? 3 : 0
  const currentAdults   = members.filter(m => m.family_role === 'partner').length
  const currentChildren = members.filter(m => m.family_role === 'child').length
  const canAddPartner   = currentAdults < maxAdults - 1   // -1 car le propriétaire compte
  const canAddChild     = currentChildren < maxChildren
  const isFamilyPlan    = maxAdults > 1 || maxChildren > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[#4B47A0]" />
      </div>
    )
  }

  // ─── Membre d'une famille (pas propriétaire) ───────────────────────────────
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
            {profile.family_role === 'child'
              ? ' Tu as accès au journal alimentaire.'
              : ' Tu as accès à toutes les fonctionnalités de ton plan.'}
          </p>
          <p className="text-xs text-zinc-400">
            Pour gérer l'abonnement, contacte le titulaire du compte.
          </p>
        </div>
      </div>
    )
  }

  // ─── Pas de plan famille ───────────────────────────────────────────────────
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
          <button
            onClick={() => router.push('/pricing')}
            className="px-6 py-3 rounded-2xl text-white text-sm font-bold"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
            Voir les forfaits
          </button>
        </div>
      </div>
    )
  }

  // ─── Propriétaire d'un plan famille/couple ────────────────────────────────
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
          <p className="text-sm text-zinc-400">
            Forfait {profile?.plan?.replace(/_/g, ' ')} — {maxAdults} adulte{maxAdults > 1 ? 's' : ''}
            {maxChildren > 0 ? ` + ${maxChildren} enfants` : ''}
          </p>
        </div>
      </div>

      {/* Membres actuels */}
      {members.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-4 pt-4 pb-2">
            Membres liés
          </p>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-t border-zinc-50">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                m.family_role === 'child' ? 'bg-violet-50' : 'bg-teal-50'
              }`}>
                {m.family_role === 'child'
                  ? <Baby size={16} className="text-violet-500" />
                  : <Crown size={16} className="text-teal-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800 truncate">
                  {m.full_name ?? 'Sans nom'}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {m.family_role === 'child' ? 'Enfant' : 'Partenaire'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invites en attente */}
      {invites.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider px-4 pt-4 pb-2">
            Invitations en attente
          </p>
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3 border-t border-amber-100">
              <Mail size={15} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-700 truncate">{inv.invited_email}</p>
                <p className="text-[11px] text-zinc-400">
                  {inv.role === 'child' ? 'Enfant' : 'Partenaire'} · expire le{' '}
                  {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(inv.id)}
                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'invitation */}
      {(canAddPartner || canAddChild) && (
        <form onSubmit={handleInvite} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[#4B47A0]" />
            <p className="font-bold text-zinc-800">Inviter un membre</p>
          </div>

          {/* Sélecteur rôle */}
          <div className="flex gap-2">
            {canAddPartner && (
              <button
                type="button"
                onClick={() => setRole('partner')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  role === 'partner'
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'border-zinc-200 text-zinc-400'
                }`}>
                <Crown size={13} className="inline mr-1" />
                Partenaire
              </button>
            )}
            {canAddChild && (
              <button
                type="button"
                onClick={() => setRole('child')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  role === 'child'
                    ? 'bg-violet-50 border-violet-200 text-violet-700'
                    : 'border-zinc-200 text-zinc-400'
                }`}>
                <Baby size={13} className="inline mr-1" />
                Enfant
              </button>
            )}
          </div>

          {/* Email */}
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              required
              placeholder="Email du membre à inviter"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border-2 border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all"
            />
          </div>

          {msg && (
            <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 ${
              msg.type === 'ok'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {msg.type === 'ok'
                ? <CheckCircle size={14} />
                : <AlertCircle size={14} />}
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !email}
            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
            {sending
              ? <Loader2 size={15} className="animate-spin" />
              : <><UserPlus size={14} /> Envoyer l'invitation</>
            }
          </button>

          <p className="text-[11px] text-zinc-400 text-center">
            La personne invitée recevra un email avec un lien valable 7 jours.
            {role === 'child' ? ' Le compte enfant aura accès au journal alimentaire uniquement.' : ''}
          </p>
        </form>
      )}

      {/* Capacité atteinte */}
      {!canAddPartner && !canAddChild && members.length > 0 && invites.length === 0 && (
        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 px-4 py-4 text-center">
          <p className="text-sm text-zinc-600 font-medium">Tous les membres de ton forfait sont liés ✅</p>
          <p className="text-xs text-zinc-400 mt-1">Pour agrandir ta famille, change de forfait.</p>
          <button
            onClick={() => router.push('/pricing')}
            className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
            Changer de forfait
          </button>
        </div>
      )}
    </div>
  )
}
