'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type WatyMode = 'nutrition' | 'sport'
type WatySize = 'sm' | 'md' | 'lg'

interface WatyProps {
  mode?: WatyMode
  message: string
  size?: WatySize
  dismissible?: boolean
  className?: string
  animate?: boolean
}

// ─── Messages prédéfinis par contexte ────────────────────────────────────────
export const WATY_MESSAGES = {
  // Dashboard
  dashboard_welcome_morning:   "Bonjour ! Prêt(e) pour une belle journée ? Commence par noter ton petit-déjeuner 🌅",
  dashboard_welcome_afternoon: "Bon après-midi ! N'oublie pas de t'hydrater entre les repas 💧",
  dashboard_welcome_evening:   "Bonsoir ! Comment s'est passée ta journée ? Pense à noter ton dîner 🌙",
  dashboard_no_data:           "Bienvenue sur MYTA ! Commence par remplir ton profil pour que je puisse te guider 🍉",

  // Journal — objectifs
  journal_goal_reached:        "Objectif calorique atteint ! Tu as parfaitement géré ton alimentation aujourd'hui 🎉",
  journal_goal_near:           "Plus que quelques calories pour atteindre ton objectif. Un fruit ou un yaourt ? 🍎",
  journal_over_goal:           "Tu as dépassé ton objectif aujourd'hui. Pas de panique, demain c'est reparti ! 💪",
  journal_empty:               "Ton journal est vide ! Ajoute ton premier repas de la journée 🥗",
  journal_good_protein:        "Excellent apport en protéines aujourd'hui ! Tes muscles te remercient 💪",
  journal_low_protein:         "Pense à ajouter une source de protéines — œufs, poulet, lentilles ou yaourt grec 🥚",
  journal_hydration:           "N'oublie pas de boire ! Vise 1,5L d'eau minimum par jour 💧",
  journal_balanced:            "Superbe équilibre nutritionnel aujourd'hui ! Continue comme ça 🌟",

  // Sport — séances
  sport_no_session:            "Aucune séance cette semaine encore. Un petit 20 minutes suffit pour commencer ! 🏃",
  sport_good_week:             "Belle semaine sportive ! Tu es régulier(e), c'est la clé du progrès 🔥",
  sport_session_done:          "Séance enregistrée ! La récupération est aussi importante que l'effort 🧘",
  sport_streak:                "Incroyable, tu enchaînes les séances ! Pense à bien récupérer 💤",
  sport_start:                 "Prêt(e) à bouger ? Choisis ta discipline et c'est parti ! ⚡",
  sport_after_session:         "Bien joué ! Pense à manger des protéines dans l'heure qui suit 🥛",
  sport_tabata:                "Le Tabata c'est intense mais super efficace ! N'oublie pas de t'échauffer avant 🔥",

  // Profil
  profile_incomplete:          "Remplis ton profil pour que je calcule ton TDEE et tes macros personnalisés 📊",
  profile_weight_loss:         "Pour perdre du poids, vise un déficit de 300 à 500 kcal/jour. Progressif et durable 🎯",
  profile_muscle_gain:         "Pour prendre de la masse, mange en légère surplus et cible 1,6g de protéines par kg 💪",

  // Inflammation & micronutriments
  inflammation_high:           "Score inflammatoire élevé aujourd'hui. Essaie d'ajouter du saumon ou des myrtilles demain 🫐",
  inflammation_good:           "Super journée anti-inflammatoire ! Tes choix alimentaires soutiennent ta santé 🌿",
  micros_low_vitD:             "Manque de vitamine D détecté. Pense aux poissons gras ou à une exposition au soleil ☀️",
  micros_low_iron:             "Apport en fer insuffisant. Les lentilles, épinards et viande rouge sont tes amis 🥬",
  micros_good:                 "Excellent profil micronutritionnel aujourd'hui ! Ton corps est bien nourri 🌈",

  // Recettes
  recipes_encourage:           "Explore les recettes anti-inflammatoires, elles sont délicieuses et font du bien ! 🍽️",

  // Général
  general_motivation:          "Chaque petit effort compte. Tu es sur la bonne voie ! 🍉✨",
  general_weekend:             "Week-end = repos actif ! Une balade ou du yoga sont parfaits 🧘",
  general_tip_sleep:           "Le sommeil c'est 30% des résultats. Vise 7 à 9h par nuit 😴",
  general_tip_stress:          "Le stress fait monter le cortisol et peut bloquer la perte de poids. Respire ! 🌿",
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function Waty({
  mode = 'nutrition',
  message,
  size = 'md',
  dismissible = true,
  className,
  animate = true,
}: WatyProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const sizeConfig = {
    sm: { img: 'w-12 h-12', text: 'text-xs', padding: 'p-2.5', gap: 'gap-2' },
    md: { img: 'w-16 h-16', text: 'text-sm', padding: 'p-3',   gap: 'gap-3' },
    lg: { img: 'w-20 h-20', text: 'text-sm', padding: 'p-4',   gap: 'gap-4' },
  }

  const cfg = sizeConfig[size]
  const isNutri = mode === 'nutrition'

  return (
    <div className={cn(
      'relative flex items-center rounded-2xl border',
      cfg.padding, cfg.gap,
      isNutri
        ? 'bg-nutri-light border-nutri/20'
        : 'bg-indigo-50 border-indigo-200',
      animate && 'animate-in fade-in slide-in-from-bottom-2 duration-300',
      className
    )}>
      {/* Image Waty */}
      <img
        src={isNutri ? '/waty-nutrition.png' : '/waty-sport.png'}
        alt={isNutri ? 'Waty nutrition' : 'Waty sport'}
        className={cn(cfg.img, 'object-contain flex-shrink-0 drop-shadow-sm')}
      />

      {/* Bulle message */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-semibold mb-0.5',
          cfg.text,
          isNutri ? 'text-nutri-mid' : 'text-indigo-700'
        )}>
          Waty dit :
        </p>
        <p className={cn(cfg.text, 'text-zinc-700 leading-snug')}>
          {message}
        </p>
      </div>

      {/* Bouton fermer */}
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className={cn(
            'absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity',
            isNutri ? 'hover:bg-green-200' : 'hover:bg-indigo-200'
          )}>
          <X size={10} />
        </button>
      )}
    </div>
  )
}

// ─── Version mini (avatar seul avec tooltip) ──────────────────────────────────
export function WatyAvatar({
  mode = 'nutrition',
  message,
  size = 'md',
}: {
  mode?: WatyMode
  message: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [showTip, setShowTip] = useState(false)
  const isNutri = mode === 'nutrition'

  const sizes = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-18 h-18' }

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setShowTip(v => !v)}
        className={cn(
          'rounded-full border-2 overflow-hidden transition-transform hover:scale-110 active:scale-95',
          isNutri ? 'border-nutri/30' : 'border-indigo-300',
          sizes[size]
        )}>
        <img
          src={isNutri ? '/waty-nutrition.png' : '/waty-sport.png'}
          alt="Waty"
          className="w-full h-full object-contain"
        />
      </button>
      {showTip && (
        <div className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-xl text-xs shadow-lg z-10 border',
          isNutri ? 'bg-nutri-light border-nutri/20 text-green-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        )}>
          <p className="font-semibold mb-1">Waty dit :</p>
          <p className="leading-snug">{message}</p>
          <div className={cn(
            'absolute top-full left-1/2 -translate-x-1/2 w-0 h-0',
            'border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent',
            isNutri ? 'border-t-green-200' : 'border-t-indigo-200'
          )}/>
        </div>
      )}
    </div>
  )
}

// ─── Helper : choisit le bon message selon les stats ─────────────────────────
export function getWatyMessage(context: {
  type: 'dashboard' | 'journal' | 'sport' | 'profile' | 'recipes' | 'general'
  calToday?: number
  calTarget?: number
  protToday?: number
  protTarget?: number
  weekSessions?: number
  isEmpty?: boolean
  hour?: number
}): { message: string; mode: WatyMode } {
  const { type, calToday = 0, calTarget = 2000, protToday = 0, protTarget = 120, weekSessions = 0, isEmpty, hour = new Date().getHours() } = context

  if (type === 'dashboard') {
    if (isEmpty) return { message: WATY_MESSAGES.dashboard_no_data, mode: 'nutrition' }
    if (hour < 11) return { message: WATY_MESSAGES.dashboard_welcome_morning, mode: 'nutrition' }
    if (hour < 17) return { message: WATY_MESSAGES.dashboard_welcome_afternoon, mode: 'nutrition' }
    return { message: WATY_MESSAGES.dashboard_welcome_evening, mode: 'nutrition' }
  }

  if (type === 'journal') {
    if (isEmpty || calToday === 0) return { message: WATY_MESSAGES.journal_empty, mode: 'nutrition' }
    const pct = calToday / calTarget
    if (pct >= 1.1) return { message: WATY_MESSAGES.journal_over_goal, mode: 'nutrition' }
    if (pct >= 0.9) return { message: WATY_MESSAGES.journal_goal_reached, mode: 'nutrition' }
    if (pct >= 0.7) return { message: WATY_MESSAGES.journal_goal_near, mode: 'nutrition' }
    if (protToday < protTarget * 0.5) return { message: WATY_MESSAGES.journal_low_protein, mode: 'nutrition' }
    if (protToday >= protTarget * 0.9) return { message: WATY_MESSAGES.journal_good_protein, mode: 'nutrition' }
    return { message: WATY_MESSAGES.journal_hydration, mode: 'nutrition' }
  }

  if (type === 'sport') {
    if (isEmpty) return { message: WATY_MESSAGES.sport_start, mode: 'sport' }
    if (weekSessions === 0) return { message: WATY_MESSAGES.sport_no_session, mode: 'sport' }
    if (weekSessions >= 5) return { message: WATY_MESSAGES.sport_streak, mode: 'sport' }
    if (weekSessions >= 3) return { message: WATY_MESSAGES.sport_good_week, mode: 'sport' }
    return { message: WATY_MESSAGES.sport_after_session, mode: 'sport' }
  }

  if (type === 'profile') return { message: WATY_MESSAGES.profile_incomplete, mode: 'nutrition' }
  if (type === 'recipes') return { message: WATY_MESSAGES.recipes_encourage, mode: 'nutrition' }

  // général — varie selon le jour de la semaine
  const day = new Date().getDay()
  if (day === 0 || day === 6) return { message: WATY_MESSAGES.general_weekend, mode: 'sport' }
  return { message: WATY_MESSAGES.general_motivation, mode: 'nutrition' }
}
