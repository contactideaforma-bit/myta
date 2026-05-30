'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Zap, Crown } from 'lucide-react'

const FEATURES = [
  'Journal nutritionnel illimité',
  'Suivi sport & historique complet',
  'Coach IA personnalisé (Waty)',
  'Recettes IA anti-inflammatoires',
  'Suivi du sommeil',
  'Rapport santé hebdomadaire',
  'Mode sombre',
  'App installable sur mobile',
]

async function handleSubscribe(plan: 'monthly' | 'yearly') {
  setLoading(plan)
  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),  // on envoie 'monthly' ou 'yearly'
    })

    const data = await res.json()
    
    if (data.url) {
      window.location.href = data.url
    } else {
      console.error('Erreur Stripe:', data.error)
      alert('Erreur : ' + (data.error || 'Impossible de créer la session'))
      setLoading(null)
    }
  } catch (err) {
    console.error(err)
    setLoading(null)
  }
}

  const monthlyPrice  = billing === 'yearly' ? '3,33' : '3,99'
  const yearlyTotal   = '39,99'
  const savings       = Math.round((1 - 39.99 / (3.99 * 12)) * 100)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}
    >
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <img src="/logo_my_twin_app.png" alt="MYTA" className="w-40 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            Commence gratuitement
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            3 jours d'essai · Sans engagement · Annule quand tu veux
          </p>
        </div>

        {/* Toggle mensuel / annuel */}
        <div className="flex bg-white rounded-2xl p-1 border border-zinc-100 shadow-sm">
          <button
            onClick={() => setBilling('monthly')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              billing === 'monthly'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-400'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              billing === 'yearly'
                ? 'text-white shadow-sm'
                : 'text-zinc-400'
            }`}
            style={billing === 'yearly' ? { background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' } : {}}
          >
            Annuel
            {billing === 'yearly' && (
              <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full">
                -{savings}%
              </span>
            )}
          </button>
        </div>

        {/* Card prix */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-lg">

          {/* Badge essai */}
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              <Zap size={11} /> 3 jours gratuits
            </span>
            <span className="text-xs text-zinc-400">puis facturation automatique</span>
          </div>

          {/* Prix */}
          <div className="mb-5">
            <div className="flex items-end gap-1">
              <span className="text-4xl font-extrabold text-zinc-900">
                {billing === 'yearly' ? yearlyTotal : '3,99'}€
              </span>
              <span className="text-zinc-400 text-sm mb-1.5">
                /{billing === 'yearly' ? 'an' : 'mois'}
              </span>
            </div>
            {billing === 'yearly' && (
              <p className="text-xs text-zinc-400 mt-0.5">
                soit <span className="font-bold text-[#4B47A0]">3,33€/mois</span> — économise {savings}% vs mensuel
              </p>
            )}
            {billing === 'monthly' && (
              <p className="text-xs text-zinc-400 mt-0.5">
                Passe à l'annuel et économise <span className="font-bold text-[#4B47A0]">{savings}%</span>
              </p>
            )}
          </div>

          {/* Features */}
          <ul className="flex flex-col gap-2.5 mb-6">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-700">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
                  <Check size={11} className="text-white" strokeWidth={3} />
                </div>
                {f}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={() => handleSubscribe(billing)}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-70"
            style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}
          >
            {loading === billing
              ? <Loader2 size={16} className="animate-spin" />
              : <>
                  <Crown size={15} />
                  Commencer l'essai gratuit
                </>
            }
          </button>

          <p className="text-center text-zinc-400 text-xs mt-3">
            Aucun débit pendant 3 jours · Annulable à tout moment
          </p>
        </div>

        {/* Retour */}
        <button
          onClick={() => router.back()}
          className="text-center text-zinc-400 text-xs hover:text-zinc-600 transition-colors"
        >
          ← Retour
        </button>

      </div>
    </div>
  )
}