'use client'

declare global { interface Window { Stripe?: any } }

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, Check, User, Mail, Lock, CreditCard,
  Eye, EyeOff, Shield, LogOut, ChevronRight,
  AlertCircle, CheckCircle2, ExternalLink, Crown, Users, Trash2,
} from 'lucide-react'
import { getPlanLabel, getPlanPrice, hasFamilySwitch, isPremium } from '@/lib/plan-utils'
import { isIosApp } from '@/lib/app-platform'
import { restoreRcPurchases } from '@/lib/revenuecat'

/** Ouvre la gestion des abonnements Apple (résiliation côté App Store). */
const APPLE_MANAGE_SUBS_URL = 'itms-apps://apps.apple.com/account/subscriptions'

/* ─── helpers ── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-tta-mid">{icon}</span>
        <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function FeedbackBanner({ type, msg }: { type: 'ok' | 'err'; msg: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium
      ${type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
      {type === 'ok' ? <CheckCircle2 size={14} className="flex-shrink-0" /> : <AlertCircle size={14} className="flex-shrink-0" />}
      {msg}
    </div>
  )
}

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  trialing: { text: 'Essai gratuit',      color: 'text-blue-700',   bg: 'bg-blue-50'   },
  active:   { text: 'Actif',              color: 'text-green-700',  bg: 'bg-green-50'  },
  canceled: { text: 'Résilié',            color: 'text-red-600',    bg: 'bg-red-50'    },
  past_due: { text: 'Paiement en retard', color: 'text-orange-700', bg: 'bg-orange-50' },
  vip:      { text: 'VIP ⭐',             color: 'text-purple-700', bg: 'bg-purple-50' },
  free:     { text: 'Gratuit',            color: 'text-zinc-600',   bg: 'bg-zinc-100'  },
}

export default function AccountPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [token, setToken]     = useState('')
  const [iosApp, setIosApp]   = useState(false)

  // App iOS : paiement géré par l'App Store (exigence Apple 3.1.1)
  useEffect(() => { setIosApp(isIosApp()) }, [])

  // Restauration des achats in-app (obligatoire Apple)
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null)
  const [restoring,  setRestoring]  = useState(false)
  async function restorePurchases() {
    setRestoreMsg(null)
    setRestoring(true)
    const res = await restoreRcPurchases()
    setRestoring(false)
    if (res.ok) {
      if (res.planId) localStorage.setItem('myta_plan', res.planId)
      setRestoreMsg('Achats restaurés ✅')
      setTimeout(() => window.location.reload(), 800)
    } else {
      setRestoreMsg('Aucun achat à restaurer sur ce compte Apple.')
    }
  }

  // ── Profil ──
  const [fullName, setFullName]   = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameFb, setNameFb]       = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // ── Email ──
  const [email, setEmail]         = useState('')
  const [newEmail, setNewEmail]   = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailFb, setEmailFb]     = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // ── Mot de passe ──
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwFb, setPwFb]           = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // ── Carte bancaire ──
  const [showCardForm, setShowCardForm] = useState(false)
  const [cardSaving, setCardSaving]     = useState(false)
  const [cardFb, setCardFb]             = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const cardRef       = useRef<HTMLDivElement>(null)
  const stripeRef     = useRef<any>(null)
  const cardElemRef   = useRef<any>(null)

  // ── Abonnement ──
  const [planChanged, setPlanChanged] = useState(false)

  // ── Suppression de compte ──
  const [showDelete, setShowDelete]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting]         = useState(false)
  const [deleteFb, setDeleteFb]         = useState<string | null>(null)
  const [subStatus, setSubStatus]     = useState<string>('free')
  const [userPlan,  setUserPlan]      = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      setToken(session.access_token)
      setEmail(session.user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, subscription_status, plan')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setSubStatus(profile.subscription_status ?? 'free')
        setUserPlan(profile.plan ?? null)
        if (profile.plan) localStorage.setItem('myta_plan', profile.plan)
      }
      if (new URLSearchParams(window.location.search).get('changed') === 'true') setPlanChanged(true)
      setLoading(false)
    }
    load()
  }, [])

  // ── Stripe Elements ──
  useEffect(() => {
    if (!showCardForm || !cardRef.current) return
    let mounted = true
    async function initStripe() {
      if (!window.Stripe) {
        await new Promise<void>(resolve => {
          const s = document.createElement('script')
          s.src = 'https://js.stripe.com/v3/'
          s.onload = () => resolve()
          document.head.appendChild(s)
        })
      }
      if (!mounted) return
      stripeRef.current = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      const elems = stripeRef.current.elements()
      cardElemRef.current = elems.create('card', {
        style: {
          base: { fontFamily: 'inherit', fontSize: '15px', color: '#18181b', '::placeholder': { color: '#a1a1aa' } },
          invalid: { color: '#ef4444' },
        },
        hidePostalCode: true,
      })
      cardElemRef.current.mount(cardRef.current)
    }
    initStripe()
    return () => { mounted = false; cardElemRef.current?.unmount() }
  }, [showCardForm])

  // ─────────────────────────────────────────────────────────────────────────────
  async function saveName() {
    if (!fullName.trim()) return
    setNameSaving(true); setNameFb(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')
      const { error } = await supabase.from('profiles')
        .upsert({ id: user.id, full_name: fullName.trim() }, { onConflict: 'id' })
      if (error) throw error
      setNameFb({ type: 'ok', msg: 'Nom mis à jour ✓' })
    } catch (e: any) {
      setNameFb({ type: 'err', msg: e.message ?? 'Erreur' })
    }
    setNameSaving(false)
    setTimeout(() => setNameFb(null), 4000)
  }

  async function saveEmail() {
    if (!newEmail.trim() || newEmail === email) return
    setEmailSaving(true); setEmailFb(null)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      setEmailFb({ type: 'ok', msg: 'Un email de confirmation a été envoyé à ' + newEmail })
      setNewEmail('')
    } catch (e: any) {
      setEmailFb({ type: 'err', msg: e.message ?? 'Erreur' })
    }
    setEmailSaving(false)
  }

  async function savePassword() {
    if (!newPw || newPw !== confirmPw) {
      setPwFb({ type: 'err', msg: 'Les mots de passe ne correspondent pas' }); return
    }
    if (newPw.length < 8) {
      setPwFb({ type: 'err', msg: 'Minimum 8 caractères' }); return
    }
    setPwSaving(true); setPwFb(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      setPwFb({ type: 'ok', msg: 'Mot de passe mis à jour ✓' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      setPwFb({ type: 'err', msg: e.message ?? 'Erreur' })
    }
    setPwSaving(false)
    setTimeout(() => setPwFb(null), 5000)
  }

  async function saveCard() {
    if (!stripeRef.current || !cardElemRef.current) return
    setCardSaving(true); setCardFb(null)
    try {
      const res = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const { clientSecret } = await res.json()
      const { error, setupIntent } = await stripeRef.current.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElemRef.current },
      })
      if (error) throw new Error(error.message)
      await fetch('/api/stripe/setup-intent', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: setupIntent.payment_method }),
      })
      setCardFb({ type: 'ok', msg: 'Carte mise à jour avec succès ✓' })
      setShowCardForm(false)
    } catch (e: any) {
      setCardFb({ type: 'err', msg: e.message ?? 'Erreur carte' })
    }
    setCardSaving(false)
  }

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res  = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) { console.error(err) }
    setPortalLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'SUPPRIMER') return
    setDeleting(true); setDeleteFb(null)
    try {
      const res = await fetch('/api/account/delete', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ confirm: 'SUPPRIMER' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      // Compte supprimé — nettoyer la session locale et sortir
      localStorage.clear()
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (e: any) {
      setDeleteFb(e.message ?? 'Erreur lors de la suppression')
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  const sc = STATUS_LABEL[subStatus] ?? STATUS_LABEL['free']

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900">Mon compte</h1>
        <p className="text-sm text-zinc-400">{email}</p>
      </div>

      {/* ── Nom d'affichage ── */}
      <Section title="Nom d'affichage" icon={<User size={16} />}>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Prénom et nom</label>
            <input
              className="input"
              placeholder="ex: Marie Dupont"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          {nameFb && <FeedbackBanner type={nameFb.type} msg={nameFb.msg} />}
          <button onClick={saveName} disabled={nameSaving || !fullName.trim()}
            className="btn-primary justify-center py-3 disabled:opacity-50">
            {nameSaving ? <Loader2 size={15} className="animate-spin" /> : <><Check size={14} />Enregistrer</>}
          </button>
        </div>
      </Section>

      {/* ── Email ── */}
      <Section title="Adresse email" icon={<Mail size={16} />}>
        <div className="flex flex-col gap-3">
          <div className="bg-zinc-50 rounded-xl px-4 py-2.5 text-sm text-zinc-600 font-medium">
            {email}
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nouvel email</label>
            <input
              className="input"
              type="email"
              placeholder="nouveau@email.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
            />
          </div>
          {emailFb && <FeedbackBanner type={emailFb.type} msg={emailFb.msg} />}
          <button onClick={saveEmail} disabled={emailSaving || !newEmail.trim() || newEmail === email}
            className="btn-primary justify-center py-3 disabled:opacity-50">
            {emailSaving ? <Loader2 size={15} className="animate-spin" /> : <><Mail size={14} />Changer l'email</>}
          </button>
          <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
            Un email de confirmation sera envoyé à la nouvelle adresse.
          </p>
        </div>
      </Section>

      {/* ── Mot de passe ── */}
      <Section title="Mot de passe" icon={<Lock size={16} />}>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nouveau mot de passe</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
              />
              <button onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Confirmer le mot de passe</label>
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
            />
          </div>
          {pwFb && <FeedbackBanner type={pwFb.type} msg={pwFb.msg} />}
          <button onClick={savePassword} disabled={pwSaving || !newPw || !confirmPw}
            className="btn-primary justify-center py-3 disabled:opacity-50">
            {pwSaving ? <Loader2 size={15} className="animate-spin" /> : <><Lock size={14} />Changer le mot de passe</>}
          </button>
          <p className="text-[11px] text-zinc-400 text-center">Minimum 8 caractères</p>
        </div>
      </Section>

      {/* ── Mode de paiement ── */}
      {!iosApp && ['active', 'trialing', 'past_due'].includes(subStatus) && (
        <Section title="Mode de paiement" icon={<CreditCard size={16} />}>
          <div className="flex flex-col gap-3">
            {cardFb && <FeedbackBanner type={cardFb.type} msg={cardFb.msg} />}
            {!showCardForm ? (
              <button onClick={() => { setShowCardForm(true); setCardFb(null) }}
                className="btn-primary justify-center py-3">
                <CreditCard size={15} />Mettre à jour ma carte
              </button>
            ) : (
              <>
                <p className="text-xs text-zinc-400">Entrez votre nouvelle carte bancaire</p>
                <div
                  ref={cardRef}
                  className="border-2 border-zinc-200 rounded-2xl px-4 py-3.5 bg-zinc-50 focus-within:border-tta-mid transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowCardForm(false)}
                    className="flex-1 py-2.5 rounded-2xl border-2 border-zinc-200 text-sm font-semibold text-zinc-600">
                    Annuler
                  </button>
                  <button onClick={saveCard} disabled={cardSaving}
                    className="flex-1 py-2.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                    {cardSaving ? <Loader2 size={14} className="animate-spin" /> : 'Enregistrer'}
                  </button>
                </div>
              </>
            )}
            <div className="flex items-center gap-1.5 justify-center">
              <Shield size={11} className="text-zinc-300" />
              <p className="text-[10px] text-zinc-400">Sécurisé par Stripe · Aucune donnée stockée chez MYTA</p>
            </div>
          </div>
        </Section>
      )}

      {/* ── Mon forfait ── */}
      <Section title="Mon forfait" icon={<Crown size={16} />}>
        <div className="flex flex-col gap-3">

          {/* Nom du plan + statut */}
          <div className="flex items-center gap-3">
            {userPlan && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-extrabold self-start"
                style={{
                  background: isPremium(userPlan) ? 'linear-gradient(90deg, #4B47A0, #2BA8B0)' : '#f4f4f5',
                  color:      isPremium(userPlan) ? '#fff' : '#18181b',
                }}>
                {isPremium(userPlan) ? '⭐' : '🔹'} {getPlanLabel(userPlan)}
              </div>
            )}
            <div className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${sc.bg} ${sc.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {sc.text}
            </div>
          </div>

          {/* Prix masqué dans l'app iOS (aucune référence tarifaire — Apple 3.1.1) */}
          {!iosApp && userPlan && getPlanPrice(userPlan) > 0 && (
            <p className="text-xs text-zinc-400">{getPlanPrice(userPlan).toFixed(2)} € / mois</p>
          )}

              {planChanged && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 size={14} className="flex-shrink-0" />
              Forfait mis à jour avec succès ✓
            </div>
          )}

          {subStatus === 'past_due' && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm text-orange-700">
              ⚠️ Ton paiement a échoué. Mets à jour ta carte ci-dessus pour rétablir l'accès.
            </div>
          )}

          {iosApp && (
            <>
              {['free', 'canceled'].includes(subStatus) && (
                <button onClick={() => router.push('/pricing')}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                  Voir les offres →
                </button>
              )}

              {['active', 'trialing', 'past_due'].includes(subStatus) && (
                <>
                  <button onClick={() => router.push('/pricing?change=true')}
                    className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                    Voir les offres / changer de forfait →
                  </button>

                  <a href={APPLE_MANAGE_SUBS_URL}
                    className="w-full flex items-center justify-between py-3 px-4 rounded-2xl border-2 border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all">
                    <span className="flex items-center gap-2">
                      <ExternalLink size={14} />
                      Gérer / résilier mon abonnement
                    </span>
                    <ChevronRight size={15} className="text-zinc-400" />
                  </a>
                </>
              )}

              <button onClick={restorePurchases} disabled={restoring}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all">
                {restoring ? <Loader2 size={14} className="animate-spin" /> : null}
                Restaurer mes achats
              </button>

              {restoreMsg && <p className="text-xs text-zinc-500 text-center">{restoreMsg}</p>}

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Abonnement géré via ton compte Apple. Le renouvellement et la résiliation
                se font dans les Réglages App Store.
              </p>
            </>
          )}

          {!iosApp && ['active', 'trialing', 'past_due'].includes(subStatus) && (
            <>
              <button onClick={() => router.push('/pricing?change=true')}
                className="w-full flex items-center justify-between py-3 px-4 rounded-2xl border-2 border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all">
                <span className="flex items-center gap-2">
                  <Crown size={14} className="text-[#4B47A0]" />
                  Changer de forfait
                </span>
                <ChevronRight size={15} className="text-zinc-400" />
              </button>
              <button onClick={openPortal} disabled={portalLoading}
                className="w-full flex items-center justify-between py-3 px-4 rounded-2xl border-2 border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all">
                <span className="flex items-center gap-2">
                  {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                  Gérer / résilier mon abonnement
                </span>
                <ChevronRight size={15} className="text-zinc-400" />
              </button>
            </>
          )}

          {!iosApp && subStatus === 'free' && (
            <button onClick={() => router.push('/pricing')}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              Commencer l'essai gratuit →
            </button>
          )}

          {!iosApp && subStatus === 'canceled' && (
            <button onClick={() => router.push('/pricing')}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              Se réabonner →
            </button>
          )}
        </div>
      </Section>

      {/* ── Famille (couple/famille uniquement) ── */}
      {hasFamilySwitch(userPlan) && (
        <button onClick={() => router.push('/account/family')}
          className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl border-2 border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all bg-white">
          <span className="flex items-center gap-2">
            <Users size={16} className="text-[#4B47A0]" />
            Gérer mes membres famille
          </span>
          <ChevronRight size={15} className="text-zinc-400" />
        </button>
      )}

      {/* ── Déconnexion ── */}
      <button onClick={signOut}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-400 text-sm font-semibold hover:text-red-500 hover:border-red-200 transition-all">
        <LogOut size={14} />
        Se déconnecter
      </button>

      {/* ── Suppression de compte (exigence App Store / Play Store) ── */}
      {!showDelete ? (
        <button onClick={() => { setShowDelete(true); setDeleteConfirm(''); setDeleteFb(null) }}
          className="flex items-center justify-center gap-2 w-full py-3 text-xs font-semibold text-zinc-300 hover:text-red-500 transition-colors">
          <Trash2 size={12} />
          Supprimer mon compte
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-500" />
            <h2 className="text-sm font-bold text-red-700">Supprimer définitivement mon compte</h2>
          </div>
          <p className="text-xs text-red-600 leading-relaxed">
            Cette action est <strong>irréversible</strong> : ton abonnement sera annulé immédiatement
            et toutes tes données (journal, séances, sommeil, recettes, groupes, famille) seront
            définitivement effacées.
          </p>
          <div>
            <label className="text-xs text-red-500 mb-1 block">
              Tape <strong>SUPPRIMER</strong> pour confirmer
            </label>
            <input
              className="input border-red-200"
              placeholder="SUPPRIMER"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value.toUpperCase())}
              autoComplete="off"
            />
          </div>
          {deleteFb && <FeedbackBanner type="err" msg={deleteFb} />}
          <div className="flex gap-2">
            <button onClick={() => setShowDelete(false)} disabled={deleting}
              className="flex-1 py-2.5 rounded-2xl border-2 border-zinc-200 bg-white text-sm font-semibold text-zinc-600">
              Annuler
            </button>
            <button onClick={deleteAccount} disabled={deleting || deleteConfirm !== 'SUPPRIMER'}
              className="flex-1 py-2.5 rounded-2xl bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={13} />Supprimer</>}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
