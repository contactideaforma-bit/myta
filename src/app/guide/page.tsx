'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Play } from 'lucide-react'

// ─── Données du guide ─────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'dashboard',
    emoji: '🏠',
    title: 'Tableau de bord',
    color: '#4B47A0',
    bg: '#EBEBFF',
    description: 'Le dashboard est ta page centrale. Tu y retrouves tes objectifs, la courbe de poids, l\'accès rapide à la nutrition et au sport.',
    tips: [
      'Bascule entre vue "Semaine" et "Mois" pour voir ta progression sur différentes périodes',
      'Le coach Waty analyse ton bilan et te donne des conseils personnalisés en bas de chaque carte',
      'Pèse-toi chaque matin pour des données précises sur ta courbe',
    ],
  },
  {
    id: 'nutrition',
    emoji: '🥗',
    title: 'Nutrition',
    color: '#16A34A',
    bg: '#F0FDF4',
    description: 'Le journal alimentaire te permet de noter tous tes repas et de suivre tes calories, protéines, glucides et lipides au quotidien.',
    tips: [
      'Ajoute chaque repas dès que tu le prends pour ne rien oublier',
      'Utilise "Recettes" pour générer des idées de repas adaptées à tes objectifs grâce à l\'IA',
      'L\'onglet "Conseils" te propose des astuces nutrition personnalisées selon ton profil',
      'Ton objectif calorique est calculé automatiquement depuis ton profil (TDEE)',
    ],
  },
  {
    id: 'sport',
    emoji: '🏋️',
    title: 'Sport',
    color: '#5C60C0',
    bg: '#F0F0FF',
    description: 'Enregistre tes séances sportives, utilise le timer Tabata HIIT et consulte tout ton historique d\'entraînements.',
    tips: [
      'Clique sur "Séance" pour logger un entraînement — choisis la discipline, la durée et l\'intensité',
      'Le timer Tabata est configurable (temps de travail, récupération, cycles) pour tes séances HIIT',
      '"Historique" affiche toutes tes séances passées avec les calories brûlées et la durée',
      'Les calories brûlées sont comptabilisées dans ton bilan calorique du dashboard',
    ],
  },
  {
    id: 'sleep',
    emoji: '😴',
    title: 'Sommeil',
    color: '#4B47A0',
    bg: '#EBEBFF',
    description: 'Suis la qualité et la durée de tes nuits pour optimiser ta récupération et tes performances.',
    tips: [
      'Note ton heure de coucher et de réveil chaque jour',
      'Une bonne récupération améliore directement tes performances sportives',
      'Vise 7 à 9 heures de sommeil pour une récupération optimale',
    ],
  },
  {
    id: 'profile',
    emoji: '👤',
    title: 'Profil & Bilan',
    color: '#2BA8B0',
    bg: '#E8FBF8',
    description: 'Ton profil centralise tes informations personnelles, tes objectifs et tes statistiques globales sur la durée.',
    tips: [
      'Remplis ton poids, taille et âge pour que MYTA calcule ton TDEE avec précision',
      'Définis ton objectif calorique et tes macros cibles (protéines, glucides, lipides)',
      'Le bilan hebdomadaire te donne une vue consolidée de ta semaine',
      'Tu peux modifier ton objectif (perte de poids, prise de masse…) à tout moment',
    ],
  },
  {
    id: 'waty',
    emoji: '🤖',
    title: 'Coach Waty',
    color: '#f97316',
    bg: '#FFF7ED',
    description: 'Waty est ton coach IA intégré. Il analyse ton activité en temps réel et t\'envoie des messages de motivation et de conseil adaptés.',
    tips: [
      'Waty apparaît automatiquement quand il a quelque chose à te dire (objectif atteint, manque de protéines…)',
      'Ses messages sont contextuels : ils changent selon l\'heure, ton activité et tes objectifs',
      'Tu peux fermer un message Waty en cliquant sur la croix — il reviendra si nécessaire',
    ],
  },
]

// ─── Page guide ───────────────────────────────────────────────────────────────
export default function GuidePage() {
  const router = useRouter()

  function launchTour() {
    router.push('/dashboard?tour=1')
  }

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-2xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} className="text-zinc-600" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">Guide d'utilisation</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Tout ce que tu peux faire sur MYTA</p>
        </div>
      </div>

      {/* ── Bouton relancer le tour ── */}
      <button
        onClick={launchTour}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-[0.98] transition-all"
        style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}
      >
        <Play size={15} />
        Relancer le tour interactif
      </button>

      {/* ── Sections ── */}
      {SECTIONS.map(section => (
        <div key={section.id} className="card flex flex-col gap-4">

          {/* Titre section */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: section.bg }}
            >
              {section.emoji}
            </div>
            <h2 className="font-extrabold text-zinc-900 text-lg">{section.title}</h2>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-600 leading-relaxed">{section.description}</p>

          {/* Tips */}
          <div className="flex flex-col gap-2">
            {section.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: section.color }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-zinc-600 leading-relaxed flex-1">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Footer ── */}
      <div className="card text-center flex flex-col items-center gap-3 py-6">
        <div className="text-4xl">🎯</div>
        <p className="font-extrabold text-zinc-900">Des questions ?</p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Si tu as un problème ou une suggestion, utilise le bouton{' '}
          <span className="font-bold text-zinc-600">"Signaler un problème"</span>{' '}
          dans le menu ☰ pour nous contacter.
        </p>
        <button
          onClick={launchTour}
          className="text-sm font-bold text-tta-mid hover:underline"
        >
          ← Relancer le tour interactif
        </button>
      </div>
    </div>
  )
}
