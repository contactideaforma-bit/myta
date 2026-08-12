'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hasActiveAccess } from '@/lib/access'
import { isIosApp } from '@/lib/app-platform'
import {
  Camera, Mic, Moon, LineChart, UtensilsCrossed, Flame,
  ClipboardList, Dumbbell, Target, UserRound,
  Check, Minus, CreditCard, Users, Trophy, MessageCircle, Lock,
  UserPlus, ScanLine, Rocket, ArrowRight, ArrowDown,
} from 'lucide-react'
import { StoreBadges } from '@/components/ui/StoreBadges'
import { TrustBand } from '@/components/ui/TrustBand'

// ─── Tarifs ────────────────────────────────────────────────────────────────────
interface PlanFeature { ok: boolean; text: string }

const F = {
  journal:   { ok: true,  text: 'Journal alimentaire & sport' },
  sommeil:   { ok: true,  text: 'Suivi du sommeil' },
  defis:     { ok: true,  text: "Défis & groupes d'amis" },
  repas3:    { ok: true,  text: '3 analyses repas IA / jour' },
  sport2:    { ok: true,  text: '2 analyses séance IA / jour' },
  repasMax:  { ok: true,  text: 'Analyses repas IA illimitées' },
  sportMax:  { ok: true,  text: 'Analyses séance IA illimitées' },
  recettes:  { ok: true,  text: 'Recettes IA personnalisées' },
  rapport:   { ok: true,  text: 'Rapport santé IA 7 jours' },
  noRecette: { ok: false, text: 'Recettes IA' },
  noRapport: { ok: false, text: 'Rapport santé IA 7j' },
} satisfies Record<string, PlanFeature>

const PLANS = {
  solo: [
    {
      id: 'essentiel', label: 'Essentiel', price: 2.99, highlight: false,
      features: [F.journal, F.sommeil, F.repas3, F.sport2, F.defis, F.noRecette, F.noRapport],
      cta: 'Commencer', href: '/pricing',
    },
    {
      id: 'premium', label: 'Premium', price: 4.99, highlight: true, badge: 'Populaire',
      features: [F.journal, F.sommeil, F.repasMax, F.sportMax, F.recettes, F.rapport, F.defis],
      cta: 'Essayer Premium', href: '/pricing',
    },
  ],
  couple: [
    {
      id: 'essentiel_couple', label: 'Essentiel Couple', price: 5.99, highlight: false,
      features: [
        { ok: true, text: '2 profils adultes' },
        { ok: true, text: '3 analyses repas IA / jour chacun' },
        { ok: true, text: '2 analyses séance IA / jour chacun' },
        { ok: true, text: 'Suivi sommeil pour chacun' },
        { ok: true, text: 'Défis communs' },
        F.noRecette, F.noRapport,
      ],
      cta: 'Commencer', href: '/pricing',
    },
    {
      id: 'premium_couple', label: 'Premium Couple', price: 8.99, highlight: true, badge: 'Populaire',
      features: [
        { ok: true, text: '2 profils adultes' },
        F.repasMax, F.sportMax, F.recettes, F.rapport,
        { ok: true, text: 'Suivi sommeil pour chacun' },
        { ok: true, text: 'Défis communs' },
      ],
      cta: 'Essayer Premium', href: '/pricing',
    },
  ],
  famille: [
    {
      id: 'essentiel_famille', label: 'Essentiel Famille', price: 9.99, highlight: false,
      features: [
        { ok: true, text: "2 adultes + jusqu'à 3 enfants" },
        { ok: true, text: '3 analyses repas IA / jour / adulte' },
        { ok: true, text: '2 analyses séance IA / jour / adulte' },
        { ok: true, text: 'Suivi sommeil pour tous' },
        { ok: true, text: 'Défis famille' },
        F.noRecette, F.noRapport,
      ],
      cta: 'Commencer', href: '/pricing',
    },
    {
      id: 'premium_famille', label: 'Premium Famille', price: 13.99, highlight: true, badge: 'Meilleure valeur',
      features: [
        { ok: true, text: "2 adultes + jusqu'à 3 enfants" },
        { ok: true, text: 'Analyses repas IA illimitées (adultes)' },
        { ok: true, text: 'Analyses séance IA illimitées (adultes)' },
        F.recettes, F.rapport,
        { ok: true, text: 'Suivi sommeil pour tous' },
        { ok: true, text: 'Défis famille' },
      ],
      cta: 'Essayer Premium', href: '/pricing',
    },
  ],
}

// ─── Captures d'écran ──────────────────────────────────────────────────────────
const SCREENSHOTS = [
  { src: '/screenshots/journal.png',   Icon: ClipboardList, label: 'Journal alimentaire', desc: 'Loggez vos repas en un clic ou par photo' },
  { src: '/screenshots/sport.png',     Icon: Dumbbell,      label: 'Séance sport vocale', desc: "Décrivez votre séance à voix haute, l'IA l'analyse" },
  { src: '/screenshots/sommeil.png',   Icon: Moon,          label: 'Suivi sommeil',       desc: 'Qualité, durée, score chaque matin' },
  { src: '/screenshots/dashboard.png', Icon: Target,        label: 'Tableau de bord',     desc: 'Défis, objectifs et progression en temps réel' },
  { src: '/screenshots/profil.png',    Icon: UserRound,     label: 'Profil santé',        desc: 'Conditions médicales, objectifs, personnalisation IA' },
]

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Camera, title: 'Photo de ton assiette',
    desc: "Prends ton assiette en photo. Waty détecte les aliments, estime les calories et les macros instantanément.",
    tint: 'bg-orange-50 text-orange-600',
  },
  {
    Icon: Mic, title: 'Vocal sport & nutrition',
    desc: '"J\'ai fait 30 min de vélo et mangé une salade composée" — Waty transcrit et logue tout automatiquement.',
    tint: 'bg-sky-50 text-sky-600',
  },
  {
    Icon: Moon, title: 'Suivi du sommeil',
    desc: "Heure de coucher, de réveil, qualité ressentie. Analyse l'impact de ton sommeil sur ta forme.",
    tint: 'bg-violet-50 text-violet-600',
  },
  {
    Icon: LineChart, title: 'Rapport santé IA 7j',
    desc: 'Waty analyse tes 7 derniers jours et te donne des conseils personnalisés concrets, chaque semaine.',
    tint: 'bg-emerald-50 text-emerald-600', premium: true,
  },
  {
    Icon: UtensilsCrossed, title: 'Recettes personnalisées',
    desc: "Des recettes générées selon tes objectifs caloriques, tes goûts et tes conditions de santé.",
    tint: 'bg-rose-50 text-rose-600', premium: true,
  },
  {
    Icon: Flame, title: 'Série & badges',
    desc: "Chaque jour noté fait grandir ta série — elle ne retombe jamais à zéro. Débloque 5 badges jusqu'à la Légende.",
    tint: 'bg-amber-50 text-amber-600',
  },
]

type TabKey = 'solo' | 'couple' | 'famille'

const BRAND_GRADIENT = 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)'

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>('solo')
  const [screenIdx, setScreenIdx] = useState(0)
  // true = app iOS détectée → on masque la landing (redirection en cours)
  const [iosRedirecting, setIosRedirecting] = useState(false)

  // ── Redirect to dashboard if already logged in ────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    // App iOS (Capacitor) : ne JAMAIS afficher la landing web (contenu
    // Stripe/CB interdit — Apple 3.1.1) et ne JAMAIS forcer l'inscription :
    // sans session → paywall in-app directement (achat possible sans compte,
    // Apple 5.1.1(v)). La connexion reste proposée (optionnelle) sur /pricing.
    if (isIosApp()) {
      setIosRedirecting(true)
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) { window.location.replace('/pricing'); return }
        try {
          const { data: profile } = await supabase
            .from('profiles').select('subscription_status, trial_ends_at').eq('id', session.user.id).single()
          const hasAccess = hasActiveAccess(profile?.subscription_status, profile?.trial_ends_at)
          window.location.replace(hasAccess ? '/dashboard' : '/pricing')
        } catch {
          window.location.replace('/pricing')
        }
      })
      return
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        const { data: profile } = await supabase
          .from('profiles').select('subscription_status, trial_ends_at').eq('id', session.user.id).single()
        const hasAccess = hasActiveAccess(profile?.subscription_status, profile?.trial_ends_at)
        window.location.href = hasAccess ? '/dashboard' : '/pricing'
      } catch {
        window.location.href = '/dashboard'
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carrousel auto du mockup ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setScreenIdx(i => (i + 1) % SCREENSHOTS.length), 4000)
    return () => clearInterval(id)
  }, [])

  const plans = PLANS[tab]

  // App iOS : écran neutre pendant la redirection vers le paywall in-app
  // (évite tout flash de la landing web avec prix Stripe — Apple 3.1.1)
  if (iosRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <img src="/logo_my_twin_app.png" alt="MYTA" className="w-40 object-contain animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo_my_twin_app.png" alt="MYTA" width={110} height={28} className="object-contain" />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
              Connexion
            </Link>
            <Link
              href="/auth?mode=signup"
              className="text-sm text-white px-5 py-2.5 rounded-full font-bold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all"
              style={{ background: BRAND_GRADIENT }}
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #2D2A5E 0%, #4B47A0 45%, #2BA8B0 100%)' }}>
        {/* Blobs lumineux */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20 animate-myta-blob"
          style={{ background: 'radial-gradient(circle, #7BCB8E, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full opacity-20 animate-myta-blob"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)', animationDelay: '2s' }} />

        <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 flex flex-col md:flex-row items-center gap-12">

          {/* Texte */}
          <div className="flex-1 text-center md:text-left animate-myta-fadeup">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 backdrop-blur rounded-full px-4 py-1.5 text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span className="font-medium">Nutrition · Sport · Sommeil · IA</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.08] tracking-tight mb-5">
              Ton coach santé,<br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 bg-clip-text text-transparent">
                propulsé par l&apos;IA
              </span>
            </h1>
            <p className="text-white/85 text-lg md:text-xl mb-8 max-w-lg mx-auto md:mx-0 leading-relaxed">
              Photographie ton assiette, dicte ta séance de sport, suis ton sommeil.
              <strong className="text-white"> Waty</strong> analyse tout et te guide chaque jour vers tes objectifs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                href="/auth?mode=signup"
                className="bg-white text-[#2D2A5E] font-extrabold px-8 py-4 rounded-full text-base shadow-2xl hover:scale-[1.04] active:scale-[0.98] transition-transform"
              >
                <span className="inline-flex items-center gap-1.5">Démarrer — 3 jours gratuits <ArrowRight size={16} strokeWidth={2.5} /></span>
              </Link>
              <a
                href="#screenshots"
                className="inline-flex items-center justify-center gap-1.5 border-2 border-white/30 text-white px-6 py-4 rounded-full text-base font-semibold hover:bg-white/10 transition-colors"
              >
                Découvrir l&apos;app <ArrowDown size={16} strokeWidth={2.5} />
              </a>
            </div>

            {/* Téléchargement — la preuve la plus forte : l'app existe vraiment */}
            <StoreBadges className="mt-7 flex flex-col items-center md:items-start" />

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 justify-center md:justify-start text-white/70 text-sm">
              {['Dès 2,99 €/mois', 'Sans engagement', 'Hébergé en Europe'].map(t => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check size={14} strokeWidth={3} className="text-emerald-300" />{t}
                </span>
              ))}
            </div>
            <div className="mt-4 inline-flex items-start gap-2.5 bg-white/10 border border-white/20 backdrop-blur rounded-2xl px-4 py-3 text-left max-w-md">
              <CreditCard size={16} className="flex-shrink-0 mt-0.5 text-white/80" />
              <p className="text-xs text-white/85 leading-relaxed">
                Une carte bancaire est demandée pour activer l&apos;essai gratuit, mais{' '}
                <strong className="text-white">aucun prélèvement pendant les 3 jours</strong>.
                Paiement sécurisé par Stripe, résiliable en 1 clic à tout moment.
              </p>
            </div>
          </div>

          {/* Mockup téléphone + Waty */}
          <div className="flex-shrink-0 relative animate-myta-fadeup" style={{ animationDelay: '0.2s' }}>
            <div className="animate-myta-float">
              <div className="w-56 md:w-64 h-[460px] md:h-[520px] bg-zinc-900 rounded-[2.8rem] border-[6px] border-zinc-800 shadow-2xl overflow-hidden relative ring-1 ring-white/20">
                {SCREENSHOTS.map((s, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-opacity duration-700 ${i === screenIdx ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt={s.label} className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                  {(() => { const I = SCREENSHOTS[screenIdx].Icon; return <I size={13} /> })()}
                  {SCREENSHOTS[screenIdx].label}
                </div>
              </div>
            </div>
            {/* Waty qui regarde le téléphone */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/waty-sport.png" alt="Waty"
              className="absolute -bottom-6 -left-16 w-28 md:w-32 drop-shadow-2xl animate-myta-float"
              style={{ animationDelay: '1s' }} />
            {/* Dots */}
            <div className="flex gap-1.5 justify-center mt-5">
              {SCREENSHOTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setScreenIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === screenIdx ? 'bg-white w-6' : 'bg-white/40 w-2'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Vague de transition */}
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" style={{ height: 40 }}>
          <path d="M0 60 C 360 0, 1080 0, 1440 60 L 1440 60 L 0 60 Z" fill="white" />
        </svg>
      </section>

      {/* STATS */}
      <section className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-3 gap-4 text-center">
        {[
          { v: 'Dès 2,99 €', l: 'par mois, sans engagement' },
          { v: '6 formules', l: 'Solo · Couple · Famille' },
          { v: 'IA Waty', l: 'photo, voix, recettes, rapport' },
        ].map((s) => (
          <div key={s.v} className="py-3">
            <p className="text-lg md:text-2xl font-black bg-clip-text text-transparent"
              style={{ backgroundImage: BRAND_GRADIENT }}>{s.v}</p>
            <p className="text-xs md:text-sm text-zinc-500">{s.l}</p>
          </div>
        ))}
      </section>

      {/* CONFIANCE */}
      <TrustBand />

      {/* SCREENSHOTS */}
      <section id="screenshots" className="py-14 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-black text-center text-zinc-900 mb-2 tracking-tight">
          L&apos;app en action
        </h2>
        <p className="text-zinc-500 text-center mb-10">Simple, rapide, motivante — au quotidien</p>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {SCREENSHOTS.map((s, i) => (
            <div
              key={i}
              onClick={() => setScreenIdx(i)}
              className={`flex-shrink-0 w-44 snap-center cursor-pointer transition-transform hover:-translate-y-1 ${screenIdx === i ? 'scale-105' : ''}`}
            >
              <div className={`w-44 h-80 rounded-3xl overflow-hidden border-2 shadow-lg transition-all ${
                screenIdx === i ? 'border-[#4B47A0] shadow-indigo-200' : 'border-zinc-200'
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.label} className="w-full h-full object-cover" />
              </div>
              <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-700 mt-2">
                <s.Icon size={13} className="text-[#4B47A0]" />{s.label}
              </p>
              <p className="text-center text-xs text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 px-4 bg-zinc-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-center text-zinc-900 mb-2 tracking-tight">
            Tout ce qu&apos;il te faut
          </h2>
          <p className="text-zinc-500 text-center mb-10">Conçu pour être simple et puissant au quotidien</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="relative bg-white border border-zinc-200/80 rounded-3xl p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-zinc-300">
                {f.premium && (
                  <span className="absolute top-4 right-4 text-[10px] text-white px-2.5 py-1 rounded-full font-bold"
                    style={{ background: BRAND_GRADIENT }}>
                    PREMIUM
                  </span>
                )}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${f.tint}`}>
                  <f.Icon size={22} strokeWidth={2} />
                </div>
                <h3 className="font-extrabold text-zinc-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAUVER WATY — gamification */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <div className="rounded-[2rem] overflow-hidden text-white relative"
          style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7c3aed 55%, #db2777 100%)' }}>
          <div className="flex flex-col md:flex-row items-center gap-8 p-8 md:p-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lava-3.png" alt="Sauver Waty"
              className="w-56 md:w-72 rounded-3xl shadow-2xl ring-4 ring-white/20 animate-myta-float" />
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-black uppercase tracking-widest text-pink-200 mb-2">Jouez en équipe</p>
              <h2 className="text-2xl md:text-4xl font-black mb-4 tracking-tight">
                Sauvez Waty de la lave
              </h2>
              <p className="text-white/85 leading-relaxed mb-6">
                Créez un groupe avec vos amis ou votre famille. Chaque jour à minuit, Waty retombe
                en bas de la lave — remplissez vos journaux et atteignez vos objectifs pour le faire
                grimper les <strong>6 étapes</strong> jusqu&apos;à la coupe. Défis, messages de groupe,
                classement : la santé devient un jeu d&apos;équipe.
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {[
                  { Icon: Users,         t: "Jusqu'à 10 amis" },
                  { Icon: Trophy,        t: 'Coupes hebdomadaires' },
                  { Icon: MessageCircle, t: 'Messages de groupe' },
                  { Icon: Flame,         t: 'Séries & badges' },
                ].map(({ Icon, t }) => (
                  <span key={t} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3.5 py-1.5 text-xs font-bold">
                    <Icon size={13} strokeWidth={2.5} />{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="py-14 px-4 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-black text-center text-zinc-900 mb-12 tracking-tight">
          Démarre en 3 étapes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '1', Icon: UserPlus,
              title: 'Crée ton profil',
              desc: "Ton objectif (perte de poids, maintien, prise de masse), tes mensurations — MYTA calcule tes besoins.",
            },
            {
              step: '2', Icon: ScanLine,
              title: 'Logue sans effort',
              desc: "Photo de ton assiette, message vocal pour ton sport ou ton sommeil — Waty se charge du reste.",
            },
            {
              step: '3', Icon: Rocket,
              title: "Progresse avec Waty",
              desc: "Recettes adaptées, rapport hebdo, défis entre amis et badges pour rester motivé jour après jour.",
            },
          ].map((s) => (
            <div key={s.step} className="text-center group">
              <div className="w-14 h-14 text-white rounded-2xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform"
                style={{ background: BRAND_GRADIENT }}>
                {s.step}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                <s.Icon size={22} className="text-zinc-600" strokeWidth={2} />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-lg mb-2">{s.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-16 px-4 bg-zinc-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-black text-center text-zinc-900 mb-2 tracking-tight">
            Choisis ta formule
          </h2>
          <p className="text-zinc-500 text-center mb-8">
            Journal, sport et sommeil inclus partout · 3 jours d&apos;essai gratuit
          </p>

          {/* Tabs */}
          <div className="flex bg-zinc-200/70 rounded-full p-1 max-w-xs mx-auto mb-10">
            {(['solo', 'couple', 'famille'] as TabKey[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
                  tab === t ? 'text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700'
                }`}
                style={tab === t ? { background: BRAND_GRADIENT } : {}}
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
                className={`relative rounded-3xl border-2 p-7 bg-white transition-all hover:-translate-y-1 ${
                  plan.highlight
                    ? 'border-[#4B47A0] shadow-xl shadow-indigo-100'
                    : 'border-zinc-200 shadow-md'
                }`}
              >
                {'badge' in plan && plan.badge && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap shadow-md"
                    style={{ background: BRAND_GRADIENT }}>
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-extrabold text-zinc-900 text-xl mb-1">{plan.label}</h3>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-4xl font-black bg-clip-text text-transparent"
                    style={{ backgroundImage: BRAND_GRADIENT }}>
                    {plan.price.toFixed(2).replace('.', ',')}€
                  </span>
                  <span className="text-zinc-400 text-sm">/mois</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`text-sm flex items-start gap-2 ${f.ok ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      {f.ok
                        ? <Check size={16} strokeWidth={3} className="flex-shrink-0 mt-0.5 text-emerald-500" />
                        : <Minus size={16} strokeWidth={3} className="flex-shrink-0 mt-0.5 text-zinc-300" />}
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block w-full py-3.5 rounded-2xl font-bold text-center transition-all active:scale-[0.98] ${
                    plan.highlight ? 'text-white shadow-lg hover:shadow-xl' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                  style={plan.highlight ? { background: BRAND_GRADIENT } : {}}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="max-w-lg mx-auto mt-6 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <Lock size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <p className="text-xs text-blue-900 leading-relaxed">
              <strong>Bon à savoir :</strong> une carte bancaire est demandée pour démarrer
              l&apos;essai gratuit — c&apos;est sécurisé par <strong>Stripe</strong>, et{' '}
              <strong>rien n&apos;est prélevé pendant la période d&apos;essai</strong>.
              Tu peux résilier à tout moment, en 1 clic, depuis Mon compte.
            </p>
          </div>
        </div>
      </section>

      {/* TÉLÉCHARGEMENT */}
      <section id="telecharger" className="py-16 px-4 max-w-5xl mx-auto">
        <div className="rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden"
          style={{ background: BRAND_GRADIENT }}>
          <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #7BCB8E, transparent 70%)' }} />

          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-2">
                Disponible maintenant
              </p>
              <h2 className="text-2xl md:text-4xl font-black mb-3 tracking-tight">
                Télécharge MYTA
              </h2>
              <p className="text-white/85 leading-relaxed mb-7 max-w-md mx-auto md:mx-0">
                Sur iPhone et sur Android. Ton compte, tes données et ton abonnement
                te suivent d&apos;un appareil à l&apos;autre.
              </p>
              <StoreBadges className="flex flex-col items-center md:items-start" />
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/store_icon.png" alt="Icône de l'application MYTA"
              className="w-32 md:w-40 rounded-[1.75rem] shadow-2xl ring-1 ring-white/25 flex-shrink-0" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 px-4 max-w-2xl mx-auto pb-16">
        <h2 className="text-xl md:text-2xl font-black text-zinc-900 mb-6 text-center tracking-tight">Questions fréquentes</h2>
        <div className="space-y-3">
          {[
            {
              q: "Pourquoi demander ma carte bancaire pour un essai gratuit ?",
              a: "La carte sert uniquement à activer ton abonnement à la fin de l'essai si tu décides de rester. Rien n'est prélevé pendant les 3 jours d'essai. Le paiement est entièrement géré par Stripe (MYTA ne voit ni ne stocke jamais ta carte), et tu peux annuler en 1 clic avant la fin de l'essai — tu ne paieras alors rien du tout.",
            },
            {
              q: 'Puis-je changer de forfait ?',
              a: 'Oui, à tout moment depuis Mon compte. Le changement est immédiat, avec un calcul au prorata.',
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
              a: "Tes données sont chiffrées et hébergées en Europe (Supabase). Elles ne sont jamais revendues, et tu peux supprimer ton compte et toutes tes données en 1 clic.",
            },
          ].map((faq) => (
            <details key={faq.q} className="bg-zinc-50 rounded-2xl border border-zinc-200 group">
              <summary className="px-5 py-4 font-bold text-zinc-900 cursor-pointer list-none flex items-center justify-between text-sm md:text-base">
                {faq.q}
                <span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-zinc-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden text-white text-center py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #2D2A5E 0%, #4B47A0 50%, #2BA8B0 100%)' }}>
        <div className="absolute -top-20 left-1/4 w-72 h-72 rounded-full opacity-20 animate-myta-blob"
          style={{ background: 'radial-gradient(circle, #7BCB8E, transparent 70%)' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/waty-rapport.png" alt="Waty" className="w-24 mx-auto mb-5 drop-shadow-xl animate-myta-float" />
        <h2 className="text-2xl md:text-4xl font-black mb-3 tracking-tight relative">
          Prêt à transformer ton quotidien ?
        </h2>
        <p className="text-white/80 mb-8 text-lg relative">Waty t&apos;attend. 3 jours gratuits, sans engagement.</p>
        <Link
          href="/auth?mode=signup"
          className="relative inline-block bg-white text-[#2D2A5E] font-black px-10 py-4 rounded-full text-lg hover:scale-[1.04] active:scale-[0.98] transition-transform shadow-2xl"
        >
          <span className="inline-flex items-center gap-2">Commencer gratuitement <ArrowRight size={18} strokeWidth={2.5} /></span>
        </Link>
        <p className="mt-4 text-white/60 text-sm relative">Dès 2,99 €/mois ensuite · Annulable à tout moment</p>

        <div className="relative mt-10 pt-8 border-t border-white/15 max-w-md mx-auto">
          <p className="text-white/70 text-sm mb-4">Ou télécharge l&apos;application</p>
          <StoreBadges showRating={false} className="flex justify-center" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1a1825] text-zinc-400 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Image src="/logo_my_twin_app.png" alt="MYTA" width={90} height={22} className="object-contain opacity-70" />
            <span>© 2026 IDEAFORMA · Conçu en France</span>
          </div>
          <div className="flex gap-4">
            <Link href="/legal" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link>
            <Link href="/auth" className="hover:text-white transition-colors">Connexion</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
