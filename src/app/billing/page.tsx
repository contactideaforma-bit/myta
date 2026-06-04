'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CreditCard, Calendar, CheckCircle, XCircle, AlertTriangle, X, Shield, Gift } from 'lucide-react'
import { format, differenceInMonths, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Profile {
  full_name:           string | null
  subscription_status: string | null
  subscription_end:    string | null
  stripe_customer_id:  string | null
}

interface SubDetail {
  id:                   string
  status:               string
  interval:             'month' | 'year'
  amount:               number
  start_date:           string
  period_end:           string
  cancel_at_period_end: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  trialing: { label: 'Essai gratuit',      color: 'text-blue-700',   bg: 'bg-blue-50',   icon: <CheckCircle size={15} /> },
  active:   { label: 'Actif',              color: 'text-green-700',  bg: 'bg-green-50',  icon: <CheckCircle size={15} /> },
  canceled: { label: 'Résilié',            color: 'text-red-600',    bg: 'bg-red-50',    icon: <XCircle size={15} /> },
  past_due: { label: 'Paiement en retard', color: 'text-orange-700', bg: 'bg-orange-50', icon: <AlertTriangle size={15} /> },
  vip:      { label: 'VIP ⭐',             color: 'text-purple-700', bg: 'bg-purple-50', icon: <CheckCircle size={15} /> },
  free:     { label: 'Gratuit',            color: 'text-zinc-600',   bg: 'bg-zinc-100',  icon: <XCircle size={15} /> },
}

function durationLabel(startDate: string): string {
  const start = new Date(startDate)
  const now   = new Date()
  const months = differenceInMonths(now, start)
  const days   = differenceInDays(now, start)
  if (months >= 12) {
    const years = Math.floor(months / 12)
    const rem   = months % 12
    return rem > 0 ? `${years} an${years > 1 ? 's' : ''} et ${rem} mois` : `${years} an${years > 1 ? 's' : ''}`
  }
  if (months >= 1) return `${months} mois`
  return `${days} jour${days > 1 ? 's' : ''}`
}

export default function BillingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile, setProfile]         = useState<Profile | null>(null)
  const [sub, setSub]                 = useState<SubDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showCancel, setShowCancel]   = useState(false)
  const [canceling, setCanceling]     = useState(false)
  const [cancelDone, setCancelDone]   = useState<{ refunded: boolean; amount?: string; period_end?: boolean } | null>(null)
  const [token, setToken]             = useState('')
  const [referralCode, setReferralCode]   = useState<string | null>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [referralMonths, setReferralMonths] = useState(0)
  const [referralCopied, setReferralCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: { session } } = await supabase.auth.getSession()
      setToken(session?.access_token ?? '')

      const { data } = await supabase.from('profiles')
        .select('full_name, subscription_status, subscription_end, stripe_customer_id')
        .eq('id', user.id).single()
      setProfile(data)

      if (data?.stripe_customer_id) {
        const res  = await fetch('/api/stripe/subscription', {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        })
        const json = await res.json()
        if (json.subscription) setSub(json.subscription)
      }

      // Charger le code parrainage
      const refRes = await fetch('/api/referral', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (refRes.ok) {
        const refData = await refRes.json()
        setReferralCode(refData.code)
        setReferralCount(refData.referral_count)
        setReferralMonths(refData.months_earned)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function cancelSubscription() {
    setCanceling(true)
    try {
      const res  = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCancelDone({ refunded: data.refunded, amount: data.refund_amount, period_end: data.cancel_at_period_end })
      setShowCancel(false)
      // Rafraîchir le sub
      const res2 = await fetch('/api/stripe/subscription', { headers: { Authorization: `Bearer ${token}` } })
      const j2   = await res2.json()
      if (j2.subscription) setSub(j2.subscription)
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    }
    setCanceling(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-zinc-400" />
    </div>
  )

  const status    = profile?.subscription_status ?? 'free'
  const sc        = STATUS_CONFIG[status] ?? STATUS_CONFIG['free']
  const canCancel = ['active', 'trialing', 'past_due'].includes(status) && !(sub?.cancel_at_period_end)

  const isYearly  = sub?.interval === 'year'
  const policyText = isYearly
    ? `Sans engagement. Le mois en cours reste dû. Pour un abonnement annuel (39,99 €) résilié avant 1 an, remboursement automatique du prorata ramené à 3,99 €/mois. Remboursement sous 7 jours ouvrés, automatique et sans frais.`
    : `Sans engagement. Le mois en cours reste dû, l'abonnement se termine à la prochaine date de renouvellement. Aucun remboursement partiel pour les abonnements mensuels.`

  const refundPreview = (() => {
    if (!isYearly || !sub) return null
    const msUsed     = Date.now() - new Date(sub.start_date).getTime()
    const withinYear = msUsed < 365 * 24 * 3600 * 1000
    if (!withinYear) return null
    const monthsUsed = Math.ceil(msUsed / (30 * 24 * 3600 * 1000))
    const equivalent = Math.round(monthsUsed * 3.99 * 100) / 100
    const refund     = Math.max(0, Math.round((39.99 - equivalent) * 100) / 100)
    return refund > 0 ? { monthsUsed, equivalent, refund } : null
  })()

  return (
    <div className="min-h-screen px-5 py-8 max-w-sm mx-auto flex flex-col gap-5"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm text-zinc-500 hover:text-zinc-800 text-lg font-bold">
          ←
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900">Mon abonnement</h1>
          <p className="text-xs text-zinc-400">mytwinapp.fr</p>
        </div>
      </div>

      {/* Confirmation résiliation */}
      {cancelDone && (
        <div className="bg-green-50 border border-green-200 rounded-3xl p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
            <CheckCircle size={16} /> Résiliation confirmée
          </div>
          {cancelDone.refunded && (
            <p className="text-sm text-green-700">
              Remboursement de <strong>{cancelDone.amount} €</strong> effectué automatiquement — délai 7 jours ouvrés.
            </p>
          )}
          {cancelDone.period_end && (
            <p className="text-sm text-green-700">Ton accès reste actif jusqu'à la fin de la période en cours.</p>
          )}
        </div>
      )}

      {/* Carte statut */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${sc.bg} ${sc.color}`}>
            {sc.icon} {sc.label}
          </div>
          {sub?.cancel_at_period_end && (
            <span className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-lg">
              Résiliation prévue
            </span>
          )}
        </div>

        {/* Plan */}
        {sub && (
          <div className="flex items-center justify-between bg-zinc-50 rounded-2xl px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-zinc-900">
                {sub.interval === 'year' ? 'Abonnement annuel' : 'Abonnement mensuel'}
              </p>
              <p className="text-xs text-zinc-400">
                {sub.amount.toFixed(2).replace('.', ',')} €/{sub.interval === 'year' ? 'an' : 'mois'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
              <CreditCard size={17} className="text-white" />
            </div>
          </div>
        )}

        {/* Abonné depuis */}
        {sub && (
          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-zinc-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Abonné depuis</p>
              <p className="text-sm font-bold text-zinc-900">
                {format(new Date(sub.start_date), 'd MMMM yyyy', { locale: fr })}
                <span className="text-zinc-400 font-normal text-xs ml-1.5">({durationLabel(sub.start_date)})</span>
              </p>
            </div>
          </div>
        )}

        {/* Prochain renouvellement */}
        {sub && !sub.cancel_at_period_end && !['canceled', 'free'].includes(status) && (
          <div className="flex items-center gap-3">
            <span className="text-base flex-shrink-0">🔄</span>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                {status === 'trialing' ? 'Essai se termine le' : 'Prochain renouvellement'}
              </p>
              <p className="text-sm font-bold text-zinc-900">
                {format(new Date(sub.period_end), 'd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
        )}

        {sub?.cancel_at_period_end && (
          <div className="flex items-center gap-3">
            <span className="text-base flex-shrink-0">📅</span>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Accès jusqu'au</p>
              <p className="text-sm font-bold text-zinc-900">
                {format(new Date(sub.period_end), 'd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pas d'abonnement */}
      {status === 'free' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex flex-col gap-3">
          <p className="text-sm font-bold text-zinc-900">Passer à Premium</p>
          <p className="text-xs text-zinc-400">14 jours gratuits · 3,99 €/mois ou 39,99 €/an</p>
          <button onClick={() => router.push('/pricing')}
            className="w-full py-3 rounded-2xl text-white font-bold text-sm"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
            Commencer l'essai gratuit
          </button>
        </div>
      )}

      {/* Politique + résiliation */}
      {canCancel && (
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl p-4 border border-zinc-100 flex gap-3">
            <Shield size={14} className="text-zinc-300 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">{policyText}</p>
          </div>
          <button onClick={() => setShowCancel(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-all">
            Résilier mon abonnement
          </button>
        </div>
      )}

          {/* ── Parrainage ── */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-tta-mid" />
          <div>
            <p className="text-sm font-semibold text-zinc-900">Parrainage</p>
            <p className="text-[11px] text-zinc-400">1 mois offert pour toi et ton ami parrainé</p>
          </div>
        </div>

        {referralCode ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl px-4 py-3 text-center">
                <p className="text-xl font-black tracking-widest text-tta-mid font-mono">{referralCode}</p>
              </div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${referralCode}`)
                  setReferralCopied(true)
                  setTimeout(() => setReferralCopied(false), 2500)
                }}
                className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all flex-shrink-0 ${referralCopied ? 'bg-green-500 text-white' : 'bg-tta-mid text-white hover:bg-tta'}`}>
                {referralCopied ? '✓ Copié !' : '🔗 Partager'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-tta-mid">{referralCount}</p>
                <p className="text-xs text-zinc-400">Ami{referralCount > 1 ? 's' : ''} parrainé{referralCount > 1 ? 's' : ''}</p>
              </div>
              <div className="bg-zinc-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-nutri-mid">{referralMonths}</p>
                <p className="text-xs text-zinc-400">Mois offert{referralMonths > 1 ? 's' : ''} 🎉</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-zinc-400" /></div>
        )}
      </div>

      <p className="text-center text-xs text-zinc-400 pb-4">
        Un problème ?{' '}
        <a href="mailto:contact@mytwinapp.fr" className="text-tta-mid hover:underline">contact@mytwinapp.fr</a>
      </p>

      {/* Modal confirmation */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowCancel(false) }}>
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col gap-5 p-6 shadow-2xl">

            <div className="flex items-center justify-between">
              <p className="font-extrabold text-zinc-900">Confirmer la résiliation</p>
              <button onClick={() => setShowCancel(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                <X size={14} />
              </button>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 flex gap-3">
              <Shield size={15} className="text-zinc-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-600 leading-relaxed">{policyText}</p>
            </div>

            {refundPreview && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-green-700 mb-1.5">💚 Ton remboursement estimé</p>
                <p className="text-xs text-green-700 leading-relaxed">
                  {refundPreview.monthsUsed} mois utilisés × 3,99 € = {refundPreview.equivalent.toFixed(2).replace('.', ',')} € sur 39,99 € →
                  remboursement de <strong className="text-base">{refundPreview.refund.toFixed(2).replace('.', ',')} €</strong> sous 7 jours ouvrés, automatiquement.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowCancel(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
                Garder mon abonnement
              </button>
              <button onClick={cancelSubscription} disabled={canceling}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 flex items-center justify-center">
                {canceling ? <Loader2 size={15} className="animate-spin" /> : 'Résilier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
