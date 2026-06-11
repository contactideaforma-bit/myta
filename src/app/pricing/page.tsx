'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Loader2, Crown, Shield, Star, Zap, Users, Baby, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PlanId } from '@/lib/stripe-plans'

// ─── Données des plans ────────────────────────────────────────────────────────

interface PlanConfig {
  id:         PlanId
  label:      string
  price:      number
  badge?:     string
  badgeColor?: string
  aiLabel:    string
  aiColor:    string
  features:   string[]
  cta:        string
  gradient:   string
  popular?:   boolean
}

const SOLO_PLANS: PlanConfig[] = [
  {
    id:       'essentiel',
    label:    'Essentiel',
    price:    2.99,
    aiLabel:  'IA limitée',
    aiColor:  'text-amber-600 bg-amber-50',
    features: [
      'Journal alimentaire illimité',
      'Suivi sport & Tabata',
      'Suivi du sommeil',
      '3 analyses repas IA / jour',
      '2 analyses séance IA / jour',
    ],
    cta:      'Démarrer',
    gradient: 'from-zinc-700 to-zinc-900',
  },
  {
    id:       'premium',
    label:    'Premium',
    price:    4.99,
    badge:    'Recommandé',
    badgeColor: 'bg-gradient-to-r from-[#4B47A0] to-[#2BA8B0]',
    aiLabel:  'IA illimitée',
    aiColor:  'text-teal-700 bg-teal-50',
    features: [
      'Tout Essentiel +',
      'Recettes IA illimitées',
      'Analyse photo illimitée',
      'Rapport santé hebdo IA',
      'Coach Waty sans limite',
      'Accès prioritaire nouveautés',
    ],
    cta:      'Commencer — 3 jours gratuits',
    gradient: 'from-[#4B47A0] to-[#2BA8B0]',
    popular:  true,
  },
]

const COUPLE_PLANS: PlanConfig[] = [
  {
    id:       'essentiel_couple',
    label:    'Essentiel Couple',
    price:    5.99,
    aiLabel:  'IA limitée × 2',
    aiColor:  'text-amber-600 bg-amber-50',
    features: [
      '2 comptes adultes liés',
      'Journal, sport, sommeil × 2',
      'Défis entre vous',
      '3 analyses repas IA/jour chacun',
      '2 analyses séance IA/jour chacun',
    ],
    cta:      'Démarrer à 2',
    gradient: 'from-pink-600 to-rose-700',
  },
  {
    id:       'premium_couple',
    label:    'Premium Couple',
    price:    8.99,
    badge:    'Populaire',
    badgeColor: 'bg-gradient-to-r from-pink-500 to-rose-500',
    aiLabel:  'IA illimitée × 2',
    aiColor:  'text-teal-700 bg-teal-50',
    features: [
      '2 comptes adultes liés',
      'Tout Premium × 2',
      'IA illimitée pour chacun',
      'Recettes & rapport hebdo IA',
      'Partage des objectifs',
    ],
    cta:      'Premium à 2 — 3j gratuits',
    gradient: 'from-pink-500 to-rose-500',
    popular:  true,
  },
]

const FAMILLE_PLANS: PlanConfig[] = [
  {
    id:       'essentiel_famille',
    label:    'Essentiel Famille',
    price:    9.99,
    aiLabel:  'IA limitée (adultes)',
    aiColor:  'text-amber-600 bg-amber-50',
    features: [
      '2 adultes + 3 enfants max',
      'Journal simplifié pour enfants',
      '3 analyses repas IA/jour / adulte',
      '2 analyses séance IA/jour / adulte',
      'Enfants : journal sans IA',
    ],
    cta:      'Démarrer en famille',
    gradient: 'from-violet-600 to-purple-800',
  },
  {
    id:       'premium_famille',
    label:    'Premium Famille',
    price:    13.99,
    badge:    'Complet',
    badgeColor: 'bg-gradient-to-r from-violet-500 to-purple-600',
    aiLabel:  'IA illimitée pour les adultes',
    aiColor:  'text-teal-700 bg-teal-50',
    features: [
      '2 adultes + 3 enfants max',
      'Premium complet pour adultes',
      'IA illimitée pour les adultes',
      'Recettes & rapport hebdo IA',
      'Journal enfants suivi par parents',
    ],
    cta:      'Premium famille — 3j gratuits',
    gradient: 'from-violet-500 to-purple-600',
    popular:  true,
  },
]

const TABS = [
  { key: 'solo',    label: 'Solo',    icon: <Zap size={13} />,   plans: SOLO_PLANS },
  { key: 'couple',  label: 'Couple',  icon: <Users size={13} />, plans: COUPLE_PLANS },
  { key: 'famille', label: 'Famille', icon: <Baby size={13} />,  plans: FAMILLE_PLANS },
] as const

type TabKey = (typeof TABS)[number]['key']

// ─── Card plan ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onSubscribe, loading }: {
  plan:        PlanConfig
  onSubscribe: (id: PlanId) => void
  loading:     string | null
}) {
  return (
    <div className={`relative rounded-3xl overflow-hidden border ${
      plan.popular ? 'border-transparent shadow-xl' : 'border-zinc-200 shadow-sm'
    }`}>
      {plan.badge && (
        <div className={`text-center text-[11px] font-bold text-white py-2 ${plan.badgeColor}`}>
          ⭐ {plan.badge}
        </div>
      )}

      {/* Header coloré */}
      <div className={`bg-gradient-to-br ${plan.gradient} px-5 py-5`}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/70 mb-1">
          {plan.label}
        </p>
        <div className="flex items-end gap-1 mb-2">
          <span className="text-4xl font-black text-white">
            {plan.price.toFixed(2).replace('.', ',')}€
          </span>
          <span className="text-sm text-white/70 mb-1.5">/mois</span>
        </div>
        <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${plan.aiColor}`}>
          {plan.aiLabel}
        </span>
      </div>

      {/* Features + CTA */}
      <div className="bg-white px-5 py-4 flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {plan.features.map(f => (
            <li key={f} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[#4B47A0] to-[#2BA8B0] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={9} className="text-white" strokeWidth={3} />
              </span>
              <span className="text-sm text-zinc-700">{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => onSubscribe(plan.id)}
          disabled={!!loading}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}
        >
          {loading === plan.id
            ? <Loader2 size={16} className="animate-spin" />
            : <><Crown size={14} /> {plan.cta}</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Section explication IA ───────────────────────────────────────────────────

function AiExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
      >
        <Info size={14} className="text-blue-500 flex-shrink-0" />
        <span className="text-xs font-bold text-blue-800 flex-1">
          Pourquoi l'IA est-elle limitée sur l'offre Essentiel ?
        </span>
        <span className="text-blue-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          <p className="text-xs text-blue-900 leading-relaxed">
            Chaque analyse IA (photo, voix, recette, rapport) envoie une requête à des modèles comme{' '}
            <strong>Claude (Anthropic)</strong> ou <strong>Whisper (OpenAI)</strong>.
            Ces modèles ont un coût réel pour MYTA, facturé au nombre d'appels.
          </p>
          <p className="text-xs text-blue-900 leading-relaxed">
            L'offre Essentiel permet <strong>3 analyses repas/jour</strong> et{' '}
            <strong>2 analyses séance/jour</strong> — largement suffisant pour un usage quotidien.
            Les recettes IA et le rapport hebdo sont réservés au Premium car leur génération
            est plus coûteuse.
          </p>
          <p className="text-xs text-blue-700 leading-relaxed">
            💡 Ces limites nous permettent de maintenir un prix accessible (2,99€/mois)
            tout en gardant MYTA viable. Merci de votre compréhension !
          </p>
          <div className="bg-white rounded-xl px-3 py-2.5 border border-blue-100">
            <p className="text-[11px] font-bold text-blue-900 mb-1">Compteurs remis à zéro chaque jour à minuit</p>
            <div className="flex flex-col gap-0.5">
              {[
                ['🍽️ Analyse repas', '3 / jour', 'Essentiel'],
                ['🏋️ Analyse séance', '2 / jour', 'Essentiel'],
                ['🍳 Recettes IA', 'Illimité', 'Premium'],
                ['📊 Rapport hebdo', 'Illimité', 'Premium'],
              ].map(([feat, qty, plan]) => (
                <div key={feat as string} className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-600">{feat}</span>
                  <span className="flex gap-2 items-center">
                    <span className="text-zinc-500">{qty}</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded-full text-[10px] ${
                      plan === 'Premium'
                        ? 'bg-gradient-to-r from-[#4B47A0] to-[#2BA8B0] text-white'
                        : 'bg-amber-100 text-amber-700'
                    }`}>{plan}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

function PricingContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('solo')
  const [loading,   setLoading]   = useState<string | null>(null)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isChanging   = searchParams.get('change') === 'true'
  const supabase     = createClient()

  // Rediriger vers /account si déjà abonné (sauf si on vient changer de forfait)
  useEffect(() => {
    if (isChanging) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', session.user.id)
        .single()
      if (['trialing', 'active', 'vip'].includes(profile?.subscription_status ?? '')) {
        router.replace('/account')
      }
    })
  }, [isChanging]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentTab = TABS.find(t => t.key === activeTab)!

  async function handleSubscribe(planId: PlanId) {
    setLoading(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); setLoading(null); return }

      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: planId, changePlan: isChanging }),
      })
      const data = await res.json()
      if (data.redirect) { window.location.href = data.redirect; return }
      if (data.url) window.location.href = data.url
      else { alert('Erreur : ' + (data.error ?? 'Impossible de créer la session')); setLoading(null) }
    } catch (err) {
      console.error(err)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>
      <div className="max-w-sm mx-auto w-full px-4 py-10 flex flex-col gap-7">

        {/* Header */}
        <div className="text-center flex flex-col items-center gap-3">
          <img src="/logo_my_twin_app.png" alt="MYTA" className="w-36 object-contain" />
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Choisis ton forfait
            </h1>
            <p className="text-zinc-400 text-sm mt-1">3 jours gratuits · Sans engagement</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: <Zap size={11} />,    label: '3 jours gratuits' },
            { icon: <Shield size={11} />, label: 'Sans engagement' },
            { icon: <Star size={11} />,   label: 'Paiement sécurisé' },
          ].map(b => (
            <span key={b.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              {b.icon}{b.label}
            </span>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 border border-zinc-100 shadow-sm gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5
                ${activeTab === tab.key ? 'text-white shadow-sm' : 'text-zinc-400'}`}
              style={activeTab === tab.key
                ? { background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }
                : {}}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Note couple/famille */}
        {activeTab === 'couple' && (
          <div className="bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3 flex gap-2 items-start">
            <Users size={14} className="text-pink-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-pink-700">
              <strong>2 adultes</strong> — après abonnement, invite ton partenaire depuis <em>Mon compte → Famille</em>
            </p>
          </div>
        )}
        {activeTab === 'famille' && (
          <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 flex gap-2 items-start">
            <Baby size={14} className="text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700">
              <strong>2 adultes + 3 enfants max</strong> — les enfants ont accès au journal uniquement (sans IA). Gère les membres depuis <em>Mon compte → Famille</em>
            </p>
          </div>
        )}

        {/* Cards */}
        <div className="flex flex-col gap-4">
          {currentTab.plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSubscribe={handleSubscribe}
              loading={loading}
            />
          ))}
        </div>

        {/* Explication IA */}
        <AiExplainer />

        {/* Tableau comparatif */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <p className="text-xs font-bold text-zinc-500 text-center pt-4 pb-2">
            Essentiel vs Premium — comparatif
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-4 py-2 text-left font-semibold text-zinc-500">Fonctionnalité</th>
                <th className="px-3 py-2 text-center font-semibold text-zinc-600">Essentiel</th>
                <th className="px-3 py-2 text-center font-bold text-[#4B47A0]">Premium</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Journal alimentaire',  '✅',      '✅'],
                ['Suivi sport',          '✅',      '✅'],
                ['Suivi sommeil',        '✅',      '✅'],
                ['Analyse repas IA',     '3/jour',  '♾️ illimitée'],
                ['Analyse séance IA',    '2/jour',  '♾️ illimitée'],
                ['Recettes IA',          '❌',      '♾️ illimitées'],
                ['Rapport hebdo IA',     '❌',      '♾️ illimité'],
              ].map(([feat, ess, prem]) => (
                <tr key={feat} className="border-b border-zinc-50 last:border-0">
                  <td className="px-4 py-2.5 text-zinc-600">{feat}</td>
                  <td className="px-3 py-2.5 text-center text-zinc-500">{ess}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-[#4B47A0]">{prem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Garanties */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex flex-col gap-2">
          <p className="text-sm font-bold text-zinc-900 text-center">Tes garanties</p>
          {[
            "✅ 3 jours d'essai gratuit — aucune CB débitée",
            '✅ Annulation en 1 clic depuis Mon compte',
            '✅ Données sécurisées hébergées en Europe',
            '✅ Support par email sous 24h',
          ].map(g => <p key={g} className="text-xs text-zinc-500">{g}</p>)}
        </div>

        {/* Legal */}
        <div className="flex justify-center gap-4 pb-4">
          <a href="/legal"                      className="text-xs text-zinc-400">CGU</a>
          <a href="/legal"                      className="text-xs text-zinc-400">Confidentialité</a>
          <a href="mailto:contact@mytwinapp.fr" className="text-xs text-zinc-400">Contact</a>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>
        <Loader2 size={32} className="animate-spin text-[#4B47A0]" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
