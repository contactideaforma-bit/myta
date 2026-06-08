'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

// ─── Tarifs ────────────────────────────────────────────────────────────────────
const PLANS = {
  solo: [
    {
      id: 'essentiel',
      label: 'Essentiel',
      price: 2.99,
      highlight: false,
      features: [
        '📋 Journal alimentaire & sport',
        '🌙 Suivi du sommeil',
        '📸 3 analyses repas IA / jour',
        '🎙️ 2 analyses séance IA / jour',
        '🏆 Défis & groupes d\'amis',
        '❌ Recettes IA',
        '❌ Rapport santé IA 7j',
      ],
      cta: 'Commencer',
      href: '/pricing',
    },
    {
      id: 'premium',
      label: 'Premium',
      price: 4.99,
      highlight: true,
      badge: '⭐ Populaire',
      features: [
        '📋 Journal alimentaire & sport',
        '🌙 Suivi du sommeil',
        '📸 Analyses repas IA illimitées',
        '🎙️ Analyses séance IA illimitées',
        '🍽️ Recettes IA personnalisées',
        '📊 Rapport santé IA 7 jours',
        '🏆 Défis & groupes d\'amis',
      ],
      cta: 'Essayer Premium',
      href: '/pricing',
    },
  ],
  couple: [
    {
      id: 'essentiel_couple',
      label: 'Essentiel Couple',
      price: 5.99,
      highlight: false,
      features: [
        '👫 2 profils adultes',
        '📸 3 analyses repas IA / jour chacun',
        '🎙️ 2 analyses séance IA / jour chacun',
        '🌙 Suivi sommeil pour chacun',
        '🏆 Défis communs',
        '❌ Recettes IA',
        '❌ Rapport santé IA 7j',
      ],
      cta: 'Commencer',
      href: '/pricing',
    },
    {
      id: 'premium_couple',
      label: 'Premium Couple',
      price: 8.99,
      highlight: true,
      badge: '⭐ Populaire',
      features: [
        '👫 2 profils adultes',
        '📸 Analyses repas IA illimitées',
        '🎙️ Analyses séance IA illimitées',
        '🍽️ Recettes IA personnalisées',
        '📊 Rapport santé IA 7 jours',
        '🌙 Suivi sommeil pour chacun',
        '🏆 Défis communs',
      ],
      cta: 'Essayer Premium',
      href: '/pricing',
    },
  ],
  famille: [
    {
      id: 'essentiel_famille',
      label: 'Essentiel Famille',
      price: 9.99,
      highlight: false,
      features: [
        '👨‍👩‍👧‍👦 2 adultes + jusqu\'à 3 enfants',
        '📸 3 analyses repas IA / jour / adulte',
        '🎙️ 2 analyses séance IA / jour / adulte',
        '🌙 Suivi sommeil pour tous',
        '🏆 Défis famille',
        '❌ Recettes IA',
        '❌ Rapport santé IA 7j',
      ],
      cta: 'Commencer',
      href: '/pricing',
    },
    {
      id: 'premium_famille',
      label: 'Premium Famille',
      price: 13.99,
      highlight: true,
      badge: '⭐ Meilleure valeur',
      features: [
        '👨‍👩‍👧‍👦 2 adultes + jusqu\'à 3 enfants',
        '📸 Analyses repas IA illimitées (adultes)',
        '🎙️ Analyses séance IA illimitées (adultes)',
        '🍽️ Recettes IA personnalisées',
        '📊 Rapport santé IA 7 jours',
        '🌙 Suivi sommeil pour tous',
        '🏆 Défis famille',
      ],
      cta: 'Essayer Premium',
      href: '/pricing',
    },
  ],
}

// ─── Captures d'écran ──────────────────────────────────────────────────────────
const SCREENSHOTS = [
  { src: '/screenshots/journal.png',   label: '📋 Journal alimentaire', desc: 'Loggez vos repas en un clic ou par photo' },
  { src: '/screenshots/sport.png',     label: '🏋️ Séance sport vocale',  desc: "Décrivez votre séance à voix haute, l'IA l'analyse" },
  { src: '/screenshots/sommeil.png',   label: '🌙 Suivi sommeil',        desc: 'Qualité, durée, score chaque matin' },
  { src: '/screenshots/dashboard.png', label: '🎯 Tableau de bord',      desc: 'Défis, objectifs et progression en temps réel' },
  { src: '/screenshots/profil.png',    label: '👤 Profil santé',         desc: 'Conditions médicales, objectifs, personnalisation IA' },
]

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    emoji: '📸', title: 'Photo de votre assiette',
    desc: "Prenez votre assiette en photo. L'IA détecte les aliments, estime les calories et les macros instantanément.",
    color: 'from-orange-50 to-yellow-50 border-orange-100',
  },
  {
    emoji: '🎙️', title: 'Vocal sport & nutrition',
    desc: '"J\'ai fait 30 min de vélo et mangé une salade composée" — l\'IA transcrit et logue tout automatiquement.',
    color: 'from-blue-50 to-sky-50 border-blue-100',
  },
  {
    emoji: '🌙', title: 'Suivi du sommeil',
    desc: "Heure de coucher, de réveil, qualité ressentie. Analysez l'impact de votre sommeil sur votre forme.",
    color: 'from-purple-50 to-violet-50 border-purple-100',
  },
  {
    emoji: '📊', title: 'Rapport santé IA 7j',
    desc: 'Waty votre coach IA analyse vos 7 derniers jours et vous donne des conseils personnalisés concrets.',
    color: 'from-green-50 to-emerald-50 border-green-100', premium: true,
  },
  {
    emoji: '🍽️', title: 'Recettes personnalisées',
    desc: "L'IA génère des recettes adaptées à vos objectifs caloriques, vos goûts et vos conditions de santé.",
    color: 'from-rose-50 to-pink-50 border-rose-100', premium: true,
  },
  {
    emoji: '🏆', title: "Défis entre amis",
    desc: "Créez des groupes, lancez des défis nutrition ou sport, suivez le classement en temps réel.",
    color: 'from-amber-50 to-orange-50 border-amber-100',
  },
]

type TabKey = 'solo' | 'couple' | 'famille'

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>('solo')
  const [screenIdx, setScreenIdx] = useState(0)

  const plans = PLANS[tab]

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo_my_twin_app.png" alt="MYTA" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-gray-900 text-lg">MyTwinApp</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Connexion
            </Link>
            <Link
              href="/auth?mode=signup"
              className="text-sm bg-teal-600 text-white px-4 py-2 rounded-full font-medium hover:bg-teal-700 transition-colors"
            >
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-400 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10">

          {/* Texte */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <span>🥗</span>
              <span className="font-medium">Nutrition · Sport · Sommeil · IA</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Votre coach santé<br />
              <span className="text-yellow-300">dans la poche</span>
            </h1>
            <p className="text-white/90 text-lg md:text-xl mb-8 max-w-lg">
              Prenez votre assiette en photo, décrivez votre sport à la voix, suivez votre sommeil.
              MYTA analyse tout et vous guide vers vos objectifs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                href="/auth?mode=signup"
                className="bg-white text-teal-700 font-bold px-8 py-3.5 rounded-full text-base hover:bg-yellow-50 transition-colors shadow-lg"
              >
                Démarrer gratuitement →
              </Link>
              <a
                href="#screenshots"
                className="border border-white/40 text-white px-6 py-3.5 rounded-full text-base hover:bg-white/10 transition-colors"
              >
                Voir l&apos;app ↓
              </a>
            </div>
            <p className="mt-4 text-white/70 text-sm">Dès 2,99 €/mois · Sans engagement · Annulation à tout moment</p>
          </div>

          {/* Mockup téléphone */}
          <div className="flex-shrink-0 relative">
            <div className="w-52 md:w-60 h-[440px] md:h-[500px] bg-white/10 rounded-[2.5rem] border-2 border-white/30 shadow-2xl overflow-hidden relative">
              {SCREENSHOTS.map((s, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 transition-opacity duration-500 ${i === screenIdx ? 'opacity-100' : 'opacity-0'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={s.label} className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-0 right-0 text-center text-white text-xs font-medium">
                {SCREENSHOTS[screenIdx].label}
              </div>
            </div>
            {/* Dots */}
            <div className="flex gap-1.5 justify-center mt-3">
              {SCREENSHOTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setScreenIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === screenIdx ? 'bg-white w-5' : 'bg-white/40 w-2'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-3 gap-4 text-center">
          {[
            { v: 'Dès 2,99€', l: 'par mois' },
            { v: '6 formules', l: 'Solo · Couple · Famille' },
            { v: 'IA intégrée', l: 'Claude + Whisper' },
          ].map((s) => (
            <div key={s.v}>
              <p className="text-lg md:text-2xl font-extrabold text-teal-600">{s.v}</p>
              <p className="text-xs md:text-sm text-gray-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SCREENSHOTS */}
      <section id="screenshots" className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-2">
          L&apos;app en action
        </h2>
        <p className="text-gray-500 text-center mb-10">Aperçu des écrans principaux</p>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {SCREENSHOTS.map((s, i) => (
            <div
              key={i}
              onClick={() => setScreenIdx(i)}
              className={`flex-shrink-0 w-40 snap-center cursor-pointer transition-transform ${screenIdx === i ? 'scale-105' : ''}`}
            >
              <div className={`w-40 h-72 rounded-2xl overflow-hidden border-2 shadow-md transition-all ${
                screenIdx === i ? 'border-teal-500 shadow-teal-200' : 'border-gray-200'
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.label} className="w-full h-full object-cover" />
              </div>
              <p className="text-center text-xs font-medium text-gray-700 mt-2">{s.label}</p>
              <p className="text-center text-xs text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-2">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-gray-500 text-center mb-10">Conçu pour être simple et puissant au quotidien</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className={`relative bg-gradient-to-br ${f.color} border rounded-2xl p-5`}>
                {f.premium && (
                  <span className="absolute top-3 right-3 text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full font-medium">
                    Premium
                  </span>
                )}
                <div className="text-3xl mb-3">{f.emoji}</div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-10">
          Démarrer en 3 étapes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '1', icon: '📝',
              title: 'Créez votre profil',
              desc: "Renseignez votre objectif (perte de poids, maintien, prise de masse) et vos éventuelles conditions de santé.",
            },
            {
              step: '2', icon: '📸',
              title: 'Loggez sans effort',
              desc: "Photo de votre assiette, message vocal pour votre sport ou sommeil — MYTA se charge du reste.",
            },
            {
              step: '3', icon: '📊',
              title: "Progressez avec l'IA",
              desc: "Recettes adaptées, rapport hebdomadaire Waty, défis entre amis pour rester motivé.",
            },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center font-extrabold text-xl mx-auto mb-4">
                {s.step}
              </div>
              <div className="text-4xl mb-3">{s.icon}</div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-2">
            Choisissez votre formule
          </h2>
          <p className="text-gray-500 text-center mb-8">
            Tous les forfaits incluent le journal, le sport et le suivi sommeil
          </p>

          {/* Tabs */}
          <div className="flex bg-gray-200 rounded-full p-1 max-w-xs mx-auto mb-8">
            {(['solo', 'couple', 'famille'] as TabKey[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === t ? 'bg-white text-teal-600 shadow' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'solo' ? 'Solo' : t === 'couple' ? 'Couple' : 'Famille'}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 transition-all ${
                  plan.highlight
                    ? 'border-teal-500 bg-white shadow-xl shadow-teal-100'
                    : 'border-gray-200 bg-white shadow-md'
                }`}
              >
                {'badge' in plan && plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-extrabold text-gray-900 text-xl mb-1">{plan.label}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-4xl font-extrabold text-teal-600">
                    {plan.price.toFixed(2).replace('.', ',')}€
                  </span>
                  <span className="text-gray-400 text-sm">/mois</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className={`text-sm flex items-start gap-2 ${f.startsWith('❌') ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="flex-shrink-0 text-base leading-none mt-0.5">{f.slice(0, 2)}</span>
                      <span>{f.slice(2).trim()}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block w-full py-3 rounded-xl font-bold text-center transition-colors ${
                    plan.highlight
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Sans engagement · Résiliable à tout moment depuis les réglages
          </p>
        </div>
      </section>

      {/* PWA INSTALL */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-500 rounded-2xl p-8 text-white text-center">
          <div className="text-5xl mb-4">📱</div>
          <h2 className="text-2xl font-extrabold mb-2">Installez l&apos;app sur votre téléphone</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            MYTA fonctionne comme une vraie appli — installez-la sur votre écran d&apos;accueil sans passer par l&apos;App Store.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left">
            <div className="bg-white/15 rounded-xl p-4">
              <p className="font-bold mb-1">🍎 iPhone / Safari</p>
              <p className="text-sm text-white/80">
                Ouvrez mytwinapp.fr → <strong>Partager</strong> (↑) → <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong>
              </p>
            </div>
            <div className="bg-white/15 rounded-xl p-4">
              <p className="font-bold mb-1">🤖 Android / Chrome</p>
              <p className="text-sm text-white/80">
                Ouvrez mytwinapp.fr → Menu (⋮) → <strong>&quot;Ajouter à l&apos;écran d&apos;accueil&quot;</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 px-4 max-w-2xl mx-auto pb-16">
        <h2 className="text-xl font-extrabold text-gray-900 mb-6 text-center">Questions fréquentes</h2>
        <div className="space-y-3">
          {[
            {
              q: 'Puis-je changer de forfait ?',
              a: 'Oui, à tout moment depuis vos réglages. Le changement est immédiat.',
            },
            {
              q: "L'IA a-t-elle des limites en formule Essentiel ?",
              a: "Oui : 3 analyses repas et 2 analyses séance sport par jour. Les recettes IA et le rapport hebdomadaire sont réservés au Premium. Les compteurs se remettent à zéro chaque nuit à minuit.",
            },
            {
              q: 'Comment fonctionne le compte Famille ?',
              a: "Le propriétaire du forfait invite son partenaire et ses enfants par email. Chaque membre a son propre espace, objectifs et données.",
            },
            {
              q: 'Mes données sont-elles sécurisées ?',
              a: "Vos données sont stockées sur Supabase (infrastructure européenne) et ne sont jamais revendues.",
            },
          ].map((faq) => (
            <details key={faq.q} className="bg-gray-50 rounded-xl border border-gray-200 group">
              <summary className="px-5 py-4 font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                {faq.q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-teal-600 text-white text-center py-16 px-4">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
          Prêt à transformer votre quotidien santé ?
        </h2>
        <p className="text-white/80 mb-8 text-lg">Rejoignez MYTA dès aujourd&apos;hui</p>
        <Link
          href="/auth?mode=signup"
          className="inline-block bg-white text-teal-700 font-bold px-10 py-4 rounded-full text-lg hover:bg-yellow-50 transition-colors shadow-xl"
        >
          Commencer — dès 2,99 €/mois →
        </Link>
        <p className="mt-4 text-white/60 text-sm">Pas de carte bancaire requise pour découvrir</p>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Image src="/logo_my_twin_app.png" alt="MYTA" width={20} height={20} className="rounded opacity-60" />
            <span>© 2025 MyTwinApp · Fait avec ❤️ en France</span>
          </div>
          <div className="flex gap-4">
            <Link href="/legal" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link>
            <Link href="/auth" className="hover:text-white transition-colors">Connexion</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
