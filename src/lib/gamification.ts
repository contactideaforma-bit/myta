// ============================================================
// MYTA — Gamification : badges, série, challenges du jour
// ============================================================

// ── Types ────────────────────────────────────────────────────
export interface BadgeLevel {
  key:         string
  label:       string
  emoji:       string
  minStreak:   number
  watyMessage: string
  color:       string
  textColor:   string
  image?:      string   // chemin vers l'image dans /public/badges/
}

export interface DailyChallenge {
  key:         string
  label:       string
  emoji:       string
  watyMessage: string
}

export interface SmokingDay {
  log_date: string
  count:    number
}

// ── Niveaux de badges (série) ────────────────────────────────
export const BADGE_LEVELS: BadgeLevel[] = [
  {
    key:         ‘stagiaire’,
    label:       ‘Stagiaire de Waty’,
    emoji:       ‘😅’,
    minStreak:   1,
    watyMessage: "Tu débutes — et c’est déjà énorme ! Chaque jour noté est une victoire.",
    color:       ‘bg-zinc-100’,
    textColor:   ‘text-zinc-600’,
    image:       ‘/badges/badge-stagiaire.png’,
  },
  {
    key:         ‘acolyte’,
    label:       ‘Acolyte de Waty’,
    emoji:       ‘💪’,
    minStreak:   7,
    watyMessage: ‘7 jours consécutifs ! Tu commences à prendre de bonnes habitudes. Je suis fier de toi.’,
    color:       ‘bg-amber-50’,
    textColor:   ‘text-amber-800’,
    image:       ‘/badges/badge-acolyte.png’,
  },
  {
    key:         ‘heros’,
    label:       ‘Héros de Waty’,
    emoji:       ‘🦸’,
    minStreak:   30,
    watyMessage: ‘30 jours ! Tu es officiellement un héros. Ton engagement est une inspiration.’,
    color:       ‘bg-zinc-100’,
    textColor:   ‘text-zinc-500’,
    image:       ‘/badges/badge-heros.png’,
  },
  {
    key:         ‘waty’,
    label:       ‘Waty lui-même’,
    emoji:       ‘🤖✨’,
    minStreak:   90,
    watyMessage: "90 jours ! Tu ES Waty désormais. On ne fait plus qu’un. Légendaire.",
    color:       ‘bg-yellow-50’,
    textColor:   ‘text-yellow-700’,
    image:       ‘/badges/badge-waty.png’,
  },
  {
    key:         ‘legende’,
    label:       ‘Légende Waty’,
    emoji:       ‘💎’,
    minStreak:   150,
    watyMessage: ‘150 jours ! Tu es une légende absolue. Waty se prosterne devant toi.’,
    color:       ‘bg-purple-50’,
    textColor:   ‘text-purple-700’,
    image:       ‘/badges/badge-legende.png’,
  },
]

// Retourne le badge correspondant à une série donnée
export function getBadgeFromStreak(streak: number): BadgeLevel | null {
  if (streak < 1) return null
  const earned = BADGE_LEVELS.filter(b => streak >= b.minStreak)
  return earned[earned.length - 1] ?? null
}

// Badge suivant à atteindre
export function getNextBadge(streak: number): BadgeLevel | null {
  return BADGE_LEVELS.find(b => streak < b.minStreak) ?? null
}

// ── Calcul de la série (streak) ──────────────────────────────
// Reçoit un tableau de dates ISO "yyyy-MM-dd" (dates avec au moins 1 entrée)
export function calcStreak(dates: string[]): number {
  if (!dates.length) return 0

  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a)) // desc
  const today  = new Date().toISOString().split('T')[0]
  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })()

  // La série doit commencer aujourd'hui ou hier
  if (unique[0] !== today && unique[0] !== yesterday) return 0

  let streak = 0
  let current = unique[0]

  for (const date of unique) {
    if (date === current) {
      streak++
      // Recule d'un jour
      const d = new Date(current + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      current = d.toISOString().split('T')[0]
    } else {
      break
    }
  }

  return streak
}

// ── Pool de challenges du jour ───────────────────────────────
const CHALLENGE_POOL: DailyChallenge[] = [
  {
    key:         'water',
    label:       'Boire un verre d\'eau',
    emoji:       '💧',
    watyMessage: 'L\'hydratation c\'est la base ! Un verre, et c\'est parti.',
  },
  {
    key:         'log_meal',
    label:       'Noter au moins 1 repas',
    emoji:       '📝',
    watyMessage: 'Un repas noté, c\'est un pas de plus vers tes objectifs.',
  },
  {
    key:         'walk',
    label:       'Faire 10 min de marche',
    emoji:       '🚶',
    watyMessage: '10 minutes, c\'est accessible pour tout le monde. Même toi 😉',
  },
  {
    key:         'fruit',
    label:       'Manger au moins un fruit',
    emoji:       '🍎',
    watyMessage: 'Un fruit par jour, Waty se porte mieux !',
  },
  {
    key:         'weigh',
    label:       'Te peser ce matin',
    emoji:       '⚖️',
    watyMessage: 'Suivre son poids régulièrement, c\'est la clé de la progression.',
  },
  {
    key:         'no_soda',
    label:       'Zéro soda aujourd\'hui',
    emoji:       '🚫🥤',
    watyMessage: 'Remplace par de l\'eau ou une tisane. Ton corps te dira merci.',
  },
  {
    key:         'homemade',
    label:       'Préparer un repas maison',
    emoji:       '🍳',
    watyMessage: 'Cuisiner soi-même, c\'est contrôler ce qu\'on mange. Bravo chef !',
  },
  {
    key:         'stretch',
    label:       '5 min d\'étirements',
    emoji:       '🧘',
    watyMessage: 'Prendre soin de son corps c\'est aussi savoir se détendre.',
  },
  {
    key:         'sleep_early',
    label:       'Se coucher avant minuit',
    emoji:       '🌙',
    watyMessage: 'Le sommeil c\'est 50% de la récupération. Dodo tôt !',
  },
  {
    key:         'log_3meals',
    label:       'Noter 3 repas complets',
    emoji:       '🍽️',
    watyMessage: 'Petit-déj, déjeuner, dîner — la trilogie gagnante !',
  },
]

// Sélectionne 2 challenges pseudo-aléatoires mais stables pour la journée
// (même challenges toute la journée, change le lendemain)
export function getChallengesForToday(): DailyChallenge[] {
  const today    = new Date().toISOString().split('T')[0]
  const seed     = today.replace(/-/g, '')
  const idx1     = parseInt(seed.slice(-2)) % CHALLENGE_POOL.length
  const idx2     = (parseInt(seed.slice(-4, -2)) + 3) % CHALLENGE_POOL.length

  const c1 = CHALLENGE_POOL[idx1]
  const c2 = CHALLENGE_POOL[idx2 === idx1 ? (idx2 + 1) % CHALLENGE_POOL.length : idx2]

  // Toujours inclure "boire de l'eau" comme challenge ultra-facile
  const waterChallenge = CHALLENGE_POOL.find(c => c.key === 'water')!
  if (c1.key !== 'water' && c2.key !== 'water') {
    return [waterChallenge, c1]
  }
  return [c1, c2]
}

// ── Messages Waty proactif (dashboard) ───────────────────────
export function getWatyProactifMessage(params: {
  firstName:    string
  goal:         string | null
  calToday:     number
  calTarget:    number
  streak:       number
  weekSessions: number
}): string {
  const { firstName, goal, calToday, calTarget, streak, weekSessions } = params
  const name = firstName || 'toi'
  const remaining = calTarget - calToday
  const hour = new Date().getHours()

  // Série longue → félicitation
  if (streak >= 30) return `🔥 ${streak} jours de série — tu es une légende, ${name} ! Continuons ensemble.`
  if (streak >= 7)  return `💪 ${streak} jours consécutifs, ${name} ! Ton objectif : ${goal ?? 'bien-être'} — tu es sur la bonne voie.`

  // Matin
  if (hour < 11) {
    if (calToday === 0) return `☀️ Bonjour ${name} ! Commence par noter ton petit-déjeuner — chaque repas compte pour ${goal ?? 'tes objectifs'}.`
    return `☀️ Bien commencé, ${name} ! Tu as déjà ${Math.round(calToday)} kcal. Encore ${Math.round(remaining > 0 ? remaining : 0)} kcal pour atteindre ton objectif.`
  }

  // Après-midi
  if (hour < 17) {
    if (calToday < calTarget * 0.5) return `🌤️ ${name}, tu as mangé ${Math.round(calToday)} kcal — pense à un déjeuner équilibré pour atteindre ${calTarget} kcal aujourd'hui.`
    if (weekSessions === 0) return `💡 ${name}, une petite séance sport aujourd'hui aiderait beaucoup pour ${goal ?? 'tes objectifs'} !`
    return `✅ Bonne progression ${name} ! ${Math.round(calToday)} kcal sur ${calTarget}. ${Math.round(remaining > 0 ? remaining : 0)} kcal restantes.`
  }

  // Soir
  if (calToday < calTarget * 0.6) return `🌆 ${name}, tu n'as mangé que ${Math.round(calToday)} kcal. Pense à dîner pour bien récupérer cette nuit.`
  if (calToday > calTarget * 1.15) return `🌇 ${name}, tu as légèrement dépassé ton objectif (${Math.round(calToday)} kcal). Pas de panique — demain c'est un nouveau départ !`
  return `🌆 Bonne journée ${name} ! ${Math.round(calToday)} kcal — tu es proche de ton objectif de ${calTarget} kcal.`
}

// ── Analyse tabac ────────────────────────────────────────────
export function getSmokingWatyMessage(today: number, yesterday: number | null, streak0days: number): string {
  if (today === 0 && streak0days >= 1) {
    if (streak0days === 1) return '🎉 Première journée à zéro cigarette ! Waty est TELLEMENT fier de toi !'
    if (streak0days >= 7) return `🏆 ${streak0days} jours sans fumer ! Tu mérites le badge or — continue !`
    return `✨ ${streak0days} jours sans fumer ! Waty danse de joie pour toi !`
  }
  if (yesterday !== null && today < yesterday) return `💪 ${today} cigarettes aujourd'hui — c'est moins qu'hier (${yesterday}). Chaque cigarette en moins compte !`
  if (yesterday !== null && today > yesterday) return `💙 ${today} cigarettes aujourd'hui — c'est une journée difficile. Demain tu repars à zéro, Waty est là.`
  if (today === 0) return '🌟 Zéro cigarette pour l\'instant — garde le cap !'
  return `📊 ${today} cigarette${today > 1 ? 's' : ''} aujourd'hui. Tu peux y arriver — Waty croit en toi.`
}
