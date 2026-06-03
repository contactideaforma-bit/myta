'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Zap, Crown, Star, Shield, Smartphone, Tag, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const FEATURES = [
  { icon: '📔', label: 'Journal alimentaire illimité',      desc: 'Base de milliers d\'aliments, macros automatiques' },
  { icon: '🤖', label: 'Coach IA Waty personnalisé',        desc: 'Conseils basés sur tes vraies données' },
  { icon: '🏋️', label: 'Suivi sport complet',              desc: 'Séances, Tabata vocal, historique' },
  { icon: '😴', label: 'Suivi du sommeil',                  desc: 'Analyse de tes nuits et impact sur ta forme' },
  { icon: '🍽️', label: 'Recettes IA personnalisées',       desc: 'Générées selon tes ingrédients et objectifs' },
  { icon: '📊', label: 'Bilan santé hebdomadaire',          desc: 'Rapport complet nutrition, sport, sommeil' },
  { icon: '💊', label: 'Conditions médicales intégrées',    desc: 'Diabète, gluten, inflammatoire, hypothyroïdie...' },
  { icon: '📱', label: 'App installable sur mobile',        desc: 'PWA — sans App Store, comme une vraie app' },
]

const TESTIMONIALS = [
  { name: 'Sophie M.', role: 'Perte de poids', text: 'En 3 semaines, Waty m\'a aidée à comprendre mes erreurs alimentaires. J\'ai perdu 2kg sans régime strict !', stars: 5 },
  { name: 'Thomas K.', role: 'Prise de masse', text: 'Le calcul automatique des macros est bluffant. Je n\'avais jamais réussi à atteindre mes objectifs protéines avant.', stars: 5 },
  { name: 'Marie L.', role: 'Forme générale', text: 'Le bilan santé du dimanche est devenu mon rituel. Je vois enfin mes progrès en un coup d\'œil.', stars: 5 },
]

export default function PricingPage() {
  const [billing,    setBilling]    = useState<'monthly' | 'yearly'>('yearly')
  const [loading,    setLoading]    = useState<string | null>(null)
  const [promoCode,  setPromoCode]  = useState('')
  const [promoError, setPromoError] = useState('')
  const [showPromo,  setShowPromo]  = useState(false)
  const [referredBy, setReferredBy] = useState<string | null>(null)

  const router   = useRouter()
  const supabase = createClient()

  // Lire le code parrain depuis localStorage
  useEffect(() => {
    const code = localStorage.getItem('myta_referral')
    if (code) setReferredBy(code)
  }, [])

  const savings = Math.round((1 - 39.99 / (3.99 * 12)) * 100)

  async function handleSubscribe(plan: 'monthly' | 'yearly') {
    setLoading(plan)
    setPromoError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); setLoading(null); return }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, promoCode: promoCode.trim() || undefined, referredBy: referredBy || undefined }),
      })
      const data = await res.json()

      if (res.status === 400 && data.error === 'Code promo invalide') {
        setPromoError('Ce code promo est invalide ou expiré.')
        setLoading(null)
        return
      }

      if (data.url) window.location.href = data.url
      else { alert('Erreur : ' + (data.error ?? 'Impossible de créer la session')); setLoading(null) }
    } catch (err) { console.error(err); setLoading(null) }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>
      <div className="max-w-sm mx-auto w-full px-5 py-10 flex flex-col gap-8">

        {/* Header */}
        <div className="text-center flex flex-col items-center gap-3">
          <img src="/logo_my_twin_app.png" alt="MYTA" className="w-40 object-contain" />
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Ton coach digital personnel
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Nutrition · Sport · Sommeil — tout en une app
            </p>
          </div>
        </div>

        {/* Badges confiance */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: <Zap size={11} />, label: '3 jours gratuits' },
            { icon: <Shield size={11} />, label: 'Sans engagement' },
            { icon: <Smartphone size={11} />, label: 'App mobile' },
          ].map(b => (
            <span key={b.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              {b.icon}{b.label}
            </span>
          ))}
        </div>

        {/* Toggle billing */}
        <div className="flex bg-white rounded-2xl p-1 border border-zinc-100 shadow-sm">
          <button onClick={() => setBilling('monthly')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${billing === 'monthly' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400'}`}>
            Mensuel
          </button>
          <button onClick={() => setBilling('yearly')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${billing === 'yearly' ? 'text-white shadow-sm' : 'text-zinc-400'}`}
            style={billing === 'yearly' ? { background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' } : {}}>
            Annuel
            {billing === 'yearly' && (
              <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full">-{savings}%</span>
            )}
          </button>
        </div>

        {/* Card prix */}
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden">

          {/* Bandeau populaire */}
          {billing === 'yearly' && (
            <div className="text-center text-xs font-bold text-white py-2"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              ⭐ Choix le plus populaire — économise {savings}%
            </div>
          )}

          <div className="p-6 flex flex-col gap-5">
            {/* Prix */}
            <div>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-zinc-900">
                  {billing === 'yearly' ? '39,99' : '3,99'}€
                </span>
                <span className="text-zinc-400 text-sm mb-2">/{billing === 'yearly' ? 'an' : 'mois'}</span>
              </div>
              {billing === 'yearly' ? (
                <p className="text-sm text-zinc-400">
                  soit <span className="font-bold text-[#4B47A0]">3,33€/mois</span>
                  {' '}— au lieu de 3,99€
                </p>
              ) : (
                <p className="text-sm text-zinc-400">
                  Passe à l'annuel et économise{' '}
                  <span className="font-bold text-[#4B47A0]">{savings}%</span>
                </p>
              )}
            </div>

            {/* Essai */}
            <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-sm text-green-700 font-medium">
              🎁 3 jours gratuits — aucun débit pendant l'essai
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-2.5">
              {FEATURES.map(f => (
                <li key={f.label} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
                    <Check size={11} className="text-white" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{f.label}</p>
                    <p className="text-xs text-zinc-400">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Code promo */}
            <div className="flex flex-col gap-1.5">
              {!showPromo ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#4B47A0] transition-colors w-fit"
                >
                  <Tag size={12} />
                  J'ai un code promo
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Code promo"
                        value={promoCode}
                        onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError('') }}
                        className="w-full pl-9 pr-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowPromo(false); setPromoCode(''); setPromoError('') }}
                      className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <span>⚠️</span> {promoError}
                    </p>
                  )}
                  {promoCode && !promoError && (
                    <p className="text-xs text-[#4B47A0] flex items-center gap-1.5">
                      <span>✅</span> Code appliqué au moment du paiement
                    </p>
                  )}
                </>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={() => handleSubscribe(billing)}
              disabled={!!loading}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
              style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}>
              {loading === billing
                ? <Loader2 size={18} className="animate-spin" />
                : <><Crown size={16} /> Commencer l'essai gratuit</>
              }
            </button>
            <p className="text-center text-zinc-400 text-xs">
              Annulable à tout moment · Paiement sécurisé par Stripe 🔒
            </p>
          </div>
        </div>

        {/* Témoignages */}
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-bold text-zinc-500">Ce que disent nos utilisateurs</p>
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed italic">"{t.text}"</p>
              <div>
                <p className="text-xs font-bold text-zinc-800">{t.name}</p>
                <p className="text-[10px] text-zinc-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Garanties */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex flex-col gap-2">
          <p className="text-sm font-bold text-zinc-900 text-center">Tes garanties</p>
          {[
            '✅ 3 jours d\'essai gratuit — aucune CB débitée',
            '✅ Annulation en 1 clic depuis l\'app',
            '✅ Données sécurisées et hébergées en Europe',
            '✅ Support par email sous 24h',
          ].map(g => (
            <p key={g} className="text-xs text-zinc-500">{g}</p>
          ))}
        </div>

        {/* Legal */}
        <div className="flex justify-center gap-4 pb-4">
          <a href="/legal" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">CGU</a>
          <a href="/legal" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">Confidentialité</a>
          <a href="mailto:contact@mytwinapp.fr" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">Contact</a>
        </div>
      </div>
    </div>
  )
}
