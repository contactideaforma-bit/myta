'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CreditCard, Calendar, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Profile {
  full_name: string | null
  subscription_status: string | null
  subscription_end: string | null
  stripe_customer_id: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  trialing:  { label: 'Essai gratuit',  color: 'text-blue-700',  bg: 'bg-blue-50',  icon: <CheckCircle size={16} /> },
  active:    { label: 'Actif',          color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle size={16} /> },
  canceled:  { label: 'Annulé',         color: 'text-red-600',   bg: 'bg-red-50',   icon: <XCircle size={16} /> },
  past_due:  { label: 'Paiement en retard', color: 'text-orange-700', bg: 'bg-orange-50', icon: <AlertTriangle size={16} /> },
  vip:       { label: 'VIP ⭐',         color: 'text-purple-700', bg: 'bg-purple-50', icon: <CheckCircle size={16} /> },
  free:      { label: 'Gratuit',        color: 'text-zinc-600',  bg: 'bg-zinc-100', icon: <XCircle size={16} /> },
}

export default function BillingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles')
        .select('full_name, subscription_status, subscription_end, stripe_customer_id')
        .eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  async function openPortal() {
    setPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Erreur : ' + (data.error ?? 'Impossible d\'ouvrir le portail'))
    } catch (err) { console.error(err) }
    setPortalLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-zinc-400" />
    </div>
  )

  const status = profile?.subscription_status ?? 'free'
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG['free']
  const hasStripe = !!profile?.stripe_customer_id
  const canManage = ['trialing', 'active', 'past_due', 'canceled'].includes(status)

  return (
    <div className="min-h-screen px-5 py-10 max-w-sm mx-auto flex flex-col gap-6"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>

      <div>
        <h1 className="text-2xl font-extrabold text-zinc-900">Mon abonnement</h1>
        <p className="text-zinc-400 text-sm mt-1">Gérer ta facturation MYTA</p>
      </div>

      {/* Statut actuel */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm flex flex-col gap-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${sc.bg} ${sc.color} w-fit`}>
          {sc.icon}
          <span className="text-sm font-bold">{sc.label}</span>
        </div>

        <div className="flex flex-col gap-3">
          {profile?.subscription_end && (
            <div className="flex items-center gap-3 text-sm text-zinc-600">
              <Calendar size={15} className="text-zinc-400 flex-shrink-0" />
              <span>
                {status === 'trialing' ? 'Essai se termine le' :
                 status === 'canceled' ? 'Accès jusqu\'au' :
                 'Prochain renouvellement le'}{' '}
                <span className="font-bold text-zinc-900">
                  {format(new Date(profile.subscription_end), 'd MMMM yyyy', { locale: fr })}
                </span>
              </span>
            </div>
          )}

          {status === 'trialing' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
              Aucun débit pendant l'essai. Tu seras facturé automatiquement à la fin.
            </div>
          )}

          {status === 'past_due' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
              ⚠️ Un paiement a échoué. Mets à jour ta carte pour continuer à accéder à MYTA.
            </div>
          )}

          {status === 'canceled' && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
              Ton abonnement a été annulé. Tu garderas l'accès jusqu'à la date ci-dessus.
            </div>
          )}
        </div>
      </div>

      {/* Portail Stripe */}
      {canManage && hasStripe && (
        <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-zinc-400" />
            <p className="text-sm font-bold text-zinc-900">Gérer ma facturation</p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Accède au portail Stripe pour modifier ta carte bancaire, voir tes factures
            ou annuler ton abonnement.
          </p>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}
          >
            {portalLoading
              ? <Loader2 size={15} className="animate-spin" />
              : <><ExternalLink size={15} />Gérer mon abonnement</>
            }
          </button>
        </div>
      )}

      {/* Pas d'abonnement */}
      {!canManage && status !== 'vip' && (
        <div className="bg-white rounded-3xl p-5 border border-zinc-100 shadow-sm flex flex-col gap-3">
          <p className="text-sm font-bold text-zinc-900">Passer à Premium</p>
          <p className="text-xs text-zinc-400">3 jours gratuits · 3,99€/mois ou 39,99€/an</p>
          <button
            onClick={() => router.push('/pricing')}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}
          >
            Commencer l'essai gratuit
          </button>
        </div>
      )}

      {status === 'vip' && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
          <p className="text-sm font-bold text-purple-700">⭐ Accès VIP</p>
          <p className="text-xs text-purple-500 mt-1">Accès illimité offert</p>
        </div>
      )}

      {/* Contact */}
      <p className="text-center text-xs text-zinc-400">
        Un problème ?{' '}
        <a href="mailto:contact@mytwinapp.fr" className="text-tta-mid hover:underline">
          contact@mytwinapp.fr
        </a>
      </p>

      <button onClick={() => router.push('/profile')}
        className="text-center text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
        ← Retour au profil
      </button>
    </div>
  )
}
