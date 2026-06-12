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
    description: 'Le dashboard est ta page centrale : objectifs du jour, courbe de poids, série, badges, challenges du jour et conseils de Waty.',
    tips: [
      'Bascule entre vue "Semaine" et "Mois" pour voir ta progression sur différentes périodes',
      'Pèse-toi régulièrement le matin pour une courbe de poids fiable',
      'Les calories brûlées en sport sont déduites de ton bilan calorique du jour',
      'Coche tes challenges du jour directement depuis le dashboard',
    ],
  },
  {
    id: 'nutrition',
    emoji: '🥗',
    title: 'Journal alimentaire',
    color: '#16A34A',
    bg: '#F0FDF4',
    description: 'Note tous tes repas et suis calories, protéines, glucides et lipides en temps réel. Trois façons d\'ajouter un aliment : recherche, photo ou voix.',
    tips: [
      'Recherche un aliment et indique la quantité en grammes — tu peux la modifier à tout moment avec le crayon ✏️',
      '📸 Prends ton repas en photo : Waty identifie les aliments et les macros automatiquement',
      '🎙️ Dicte ton repas à la voix ("une assiette de pâtes et un yaourt") — Waty fait le reste',
      'Ton objectif calorique est calculé depuis ton profil (TDEE) et ajustable à tout moment',
      'La section Compléments suit aussi tes vitamines et minéraux',
    ],
  },
  {
    id: 'sport',
    emoji: '🏋️',
    title: 'Sport & Tabata',
    color: '#5C60C0',
    bg: '#F0F0FF',
    description: 'Enregistre tes séances (manuellement ou à la voix), lance le timer Tabata guidé et consulte ton historique complet.',
    tips: [
      '🎙️ Décris ta séance à la voix : Waty en déduit la discipline, la durée et les calories brûlées',
      'Le timer Tabata est configurable (effort, récupération, séries) avec guidage vocal',
      'Un défi du jour sportif accompli (ex. 100 pompes) s\'ajoute automatiquement à ton historique comme une séance',
      '"Historique" regroupe toutes tes séances avec durée et calories brûlées',
    ],
  },
  {
    id: 'sleep',
    emoji: '😴',
    title: 'Sommeil',
    color: '#4B47A0',
    bg: '#EBEBFF',
    description: 'Suis la durée et la qualité de tes nuits pour optimiser ta récupération.',
    tips: [
      'Note ton heure de coucher et de réveil chaque jour',
      'Vise 7 à 9 heures de sommeil pour une récupération optimale',
      'Le sommeil est pris en compte dans ton rapport santé hebdomadaire',
    ],
  },
  {
    id: 'serie',
    emoji: '🔥',
    title: 'Série & badges',
    color: '#f97316',
    bg: '#FFF7ED',
    description: 'Chaque jour où tu remplis ton journal, ta série augmente de +1. Un jour manqué la met simplement en pause — elle ne retombe jamais à zéro et reprend dès ton retour.',
    tips: [
      'Ta série cumule tous tes jours actifs : 1 jour = Stagiaire, 7 = Acolyte, 30 = Héros, 90 = Waty, 150 = Légende',
      'Pas de pression : si tu manques un jour, tu reprends exactement où tu en étais',
      'Les challenges du jour (2 proposés + tes challenges persos) te font progresser plus vite',
      'Crée ton propre challenge avec le bouton "Mon challenge" — coche "Objectif sportif" pour qu\'il compte comme une séance',
    ],
  },
  {
    id: 'friends',
    emoji: '🤝',
    title: 'Amis & Challenges — Sauver Waty',
    color: '#7c3aed',
    bg: '#F3EEFF',
    description: 'Crée un groupe (10 membres max), invite tes amis avec un code, et jouez ensemble : en mode Équipe, vous devez sauver Waty de la lave chaque jour.',
    tips: [
      'Chaque jour à minuit (ton heure locale), tout repart à zéro : Waty est en bas de la lave',
      'Remplis ton journal et atteins au moins 70 % de ton objectif → tu fais monter Waty',
      'Il y a 6 étapes jusqu\'à la coupe — Waty grimpe selon les résultats de chaque membre dans la journée',
      'Un score hebdo d\'équipe ≥ 70 % rapporte une Coupe au classement global',
      'Discutez dans le groupe : une pastille rouge 🔴 t\'indique les messages non lus, dans le menu et sur le groupe',
    ],
  },
  {
    id: 'famille',
    emoji: '👨‍👩‍👧',
    title: 'Couple & Famille',
    color: '#db2777',
    bg: '#FDF2F8',
    description: 'Avec un forfait Couple ou Famille, lie jusqu\'à 2 adultes (et 3 enfants en Famille) sous un même abonnement.',
    tips: [
      'Invite ton partenaire depuis Mon compte → Gérer mes membres famille',
      'Les enfants ont un journal simplifié, sans IA, que les parents peuvent suivre',
      'Change de profil actif depuis le menu pour remplir le journal d\'un enfant',
    ],
  },
  {
    id: 'waty',
    emoji: '🤖',
    title: 'Coach Waty & IA',
    color: '#2BA8B0',
    bg: '#E8FBF8',
    description: 'Waty est ton coach IA. Il analyse tes repas en photo ou à la voix, génère des recettes, rédige ton rapport santé hebdo et te conseille en continu.',
    tips: [
      'Ses messages sont contextuels : ils changent selon l\'heure, ton activité et tes objectifs',
      'Forfait Essentiel : 3 analyses repas et 2 analyses séance par jour (compteurs remis à zéro à minuit)',
      'Forfait Premium : IA illimitée + recettes + rapport hebdo',
      'Tu peux fermer un message Waty avec la croix — il reviendra quand il aura quelque chose d\'utile à dire',
    ],
  },
  {
    id: 'compte',
    emoji: '⚙️',
    title: 'Mon compte',
    color: '#52525b',
    bg: '#F4F4F5',
    description: 'Gère ton profil, ton abonnement et tes préférences depuis le menu ☰ → Mon compte.',
    tips: [
      'Change de forfait à tout moment — la différence est calculée au prorata',
      'Mets à jour ta carte bancaire ou résilie en 1 clic via le portail sécurisé Stripe',
      'Active le mode sombre 🌙 depuis le menu',
      'Tu peux supprimer définitivement ton compte et toutes tes données en bas de la page Mon compte',
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
