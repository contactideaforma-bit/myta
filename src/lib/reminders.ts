/**
 * MYTA — Rappels (notifications push) réglables par l'utilisateur.
 *
 * Fichier partagé client + serveur (aucun import serveur ici) :
 *  - le type des préférences et leurs valeurs par défaut selon le profil,
 *  - le calcul des rappels « dus » pour un créneau de 15 min,
 *  - les textes des notifications, adaptés à l'objectif.
 *
 * 🩺 Garde-fous santé (cf. CLAUDE.md) : aucun rappel ne culpabilise ni ne
 * pousse à manger moins. La pesée est DÉSACTIVÉE par défaut. On ne parle
 * jamais de calories restantes, seulement d'hydratation, de régularité
 * et (en prise de masse) de protéines.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Heure locale "HH:MM", par pas de 15 min */
export type HHMM = string

/** 1 = lundi … 7 = dimanche */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface ReminderPrefs {
  enabled: boolean
  meals:  { on: boolean; breakfast: HHMM | null; lunch: HHMM | null; dinner: HHMM | null }
  water:  { on: boolean; start: HHMM; end: HHMM; everyMin: number }
  sport:  { on: boolean; time: HHMM; days: Weekday[] }
  sleep:  { on: boolean; time: HHMM }
  streak: { on: boolean; time: HHMM }
  weigh:  { on: boolean; time: HHMM; days: Weekday[] }
  weekly: { on: boolean }
}

/** Champs du profil utiles aux rappels */
export interface ReminderProfile {
  full_name?:         string | null
  goal?:              string | null
  weight_kg?:         number | null
  condition?:         string | null
  health_conditions?: string[] | null
  prot_target?:       number | null
}

export type ReminderKind =
  | 'breakfast' | 'lunch' | 'dinner' | 'water' | 'sport'
  | 'sleep' | 'streak' | 'weigh' | 'weekly'

export interface DueReminder {
  kind: ReminderKind
  /** Clé unique du jour (anti-doublon) : ex. "lunch", "water-14:00" */
  key:  string
  /** Heure prévue, en minutes depuis minuit (heure locale) */
  atMin: number
}

export interface PushPayload {
  title: string
  body:  string
  url:   string
  tag:   string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export const WATER_INTERVALS = [
  { value: 60,  label: '1 h' },
  { value: 90,  label: '1 h 30' },
  { value: 120, label: '2 h' },
  { value: 180, label: '3 h' },
]

export const WEEKDAYS: { value: Weekday; short: string; label: string }[] = [
  { value: 1, short: 'L', label: 'Lundi' },
  { value: 2, short: 'M', label: 'Mardi' },
  { value: 3, short: 'M', label: 'Mercredi' },
  { value: 4, short: 'J', label: 'Jeudi' },
  { value: 5, short: 'V', label: 'Vendredi' },
  { value: 6, short: 'S', label: 'Samedi' },
  { value: 7, short: 'D', label: 'Dimanche' },
]

/** Bilan hebdo : dimanche 10:00 */
const WEEKLY_DAY: Weekday = 7
const WEEKLY_TIME: HHMM   = '10:00'

// ─── Utilitaires heure ────────────────────────────────────────────────────────

export function toMin(t: HHMM): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function toHHMM(min: number): HHMM {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Arrondit une heure au quart d'heure inférieur (les rappels partent par créneaux de 15 min) */
export function floorQuarter(t: HHMM): HHMM {
  return toHHMM(Math.floor(toMin(t) / 15) * 15)
}

/**
 * Date, heure et jour de semaine LOCAUX dans un fuseau donné.
 * Fonctionne côté serveur (Vercel) comme côté navigateur.
 */
export function localParts(timeZone: string, at: Date = new Date()) {
  let tz = timeZone
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: tz }) } catch { tz = 'Europe/Paris' }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(at)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const wd: Record<string, Weekday> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return {
    date:    `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    weekday: wd[get('weekday')] ?? 1,
  }
}

// ─── Hydratation ──────────────────────────────────────────────────────────────

/** Objectif d'eau indicatif (L/jour) : ~33 ml/kg, +0,7 L en allaitement, borné 1,5–3,5 L */
export function waterTargetL(p: ReminderProfile): number {
  const w = Number(p.weight_kg) || 0
  let l = w > 0 ? w * 0.033 : 2
  if (p.condition === 'post-partum-allait') l += 0.7
  else if (p.condition === 'enceinte') l += 0.3
  return Math.min(3.5, Math.max(1.5, Math.round(l * 10) / 10))
}

// ─── Préférences par défaut selon le profil ───────────────────────────────────

function sportDaysFor(goal: string | null | undefined): Weekday[] {
  switch (goal) {
    case 'performance':   return [1, 2, 4, 5, 6]
    case 'endurance':
    case 'prise de masse': return [1, 3, 5]
    default:              return [2, 5]
  }
}

export function defaultPrefs(p: ReminderProfile = {}): ReminderPrefs {
  const goal = p.goal ?? null
  const sportGoal = ['performance', 'endurance', 'prise de masse'].includes(goal ?? '')
  const lactating = p.condition === 'post-partum-allait'
  return {
    enabled: true,
    meals:  { on: true, breakfast: '08:00', lunch: '12:30', dinner: '19:30' },
    water:  { on: true, start: '09:00', end: '20:00', everyMin: lactating ? 90 : 120 },
    sport:  { on: sportGoal, time: '18:00', days: sportDaysFor(goal) },
    sleep:  { on: false, time: '22:30' },
    streak: { on: true, time: '20:30' },
    weigh:  { on: false, time: '08:00', days: [1] },   // désactivé par défaut (garde-fou)
    weekly: { on: true },
  }
}

/** Fusionne des préférences enregistrées (éventuellement partielles/anciennes) avec les défauts */
export function normalizePrefs(raw: unknown, p: ReminderProfile = {}): ReminderPrefs {
  const d = defaultPrefs(p)
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ReminderPrefs>
  const t = (v: unknown, fb: HHMM): HHMM =>
    typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? floorQuarter(v) : fb
  const tn = (v: unknown, fb: HHMM | null): HHMM | null =>
    v === null ? null : t(v, fb ?? '12:00')
  const days = (v: unknown, fb: Weekday[]): Weekday[] =>
    Array.isArray(v) ? (v.filter(x => [1, 2, 3, 4, 5, 6, 7].includes(x)) as Weekday[]) : fb
  const b = (v: unknown, fb: boolean) => (typeof v === 'boolean' ? v : fb)
  const every = Number(r.water?.everyMin)
  return {
    enabled: b(r.enabled, d.enabled),
    meals: {
      on:        b(r.meals?.on, d.meals.on),
      breakfast: r.meals && 'breakfast' in r.meals ? tn(r.meals.breakfast, d.meals.breakfast) : d.meals.breakfast,
      lunch:     r.meals && 'lunch' in r.meals ? tn(r.meals.lunch, d.meals.lunch) : d.meals.lunch,
      dinner:    r.meals && 'dinner' in r.meals ? tn(r.meals.dinner, d.meals.dinner) : d.meals.dinner,
    },
    water: {
      on:       b(r.water?.on, d.water.on),
      start:    t(r.water?.start, d.water.start),
      end:      t(r.water?.end, d.water.end),
      everyMin: WATER_INTERVALS.some(i => i.value === every) ? every : d.water.everyMin,
    },
    sport:  { on: b(r.sport?.on, d.sport.on), time: t(r.sport?.time, d.sport.time), days: days(r.sport?.days, d.sport.days) },
    sleep:  { on: b(r.sleep?.on, d.sleep.on), time: t(r.sleep?.time, d.sleep.time) },
    streak: { on: b(r.streak?.on, d.streak.on), time: t(r.streak?.time, d.streak.time) },
    weigh:  { on: b(r.weigh?.on, d.weigh.on), time: t(r.weigh?.time, d.weigh.time), days: days(r.weigh?.days, d.weigh.days) },
    weekly: { on: b(r.weekly?.on, d.weekly.on) },
  }
}

// ─── Rappels dus sur un créneau de 15 min ─────────────────────────────────────

/** Heures des rappels d'eau de la journée (début → fin, tous les N min) */
export function waterTimes(w: ReminderPrefs['water']): HHMM[] {
  const out: HHMM[] = []
  const start = toMin(w.start), end = toMin(w.end)
  const step = Math.max(60, w.everyMin)
  for (let m = start; m <= end && out.length < 16; m += step) out.push(toHHMM(m))
  return out
}

/**
 * Rappels dont l'heure tombe dans le créneau [slotMin, slotMin + 15[.
 * @param slotMin minutes locales arrondies au quart d'heure
 */
export function dueReminders(prefs: ReminderPrefs, slotMin: number, weekday: Weekday): DueReminder[] {
  if (!prefs.enabled) return []
  const due: DueReminder[] = []
  const hit = (t: HHMM | null) => t !== null && Math.floor(toMin(t) / 15) * 15 === slotMin
  const add = (kind: ReminderKind, t: HHMM, key: string = kind) => due.push({ kind, key, atMin: toMin(t) })

  if (prefs.meals.on) {
    if (hit(prefs.meals.breakfast)) add('breakfast', prefs.meals.breakfast!)
    if (hit(prefs.meals.lunch))     add('lunch',     prefs.meals.lunch!)
    if (hit(prefs.meals.dinner))    add('dinner',    prefs.meals.dinner!)
  }
  if (prefs.water.on) {
    for (const t of waterTimes(prefs.water)) if (hit(t)) add('water', t, `water-${t}`)
  }
  if (prefs.sport.on && prefs.sport.days.includes(weekday) && hit(prefs.sport.time)) add('sport', prefs.sport.time)
  if (prefs.sleep.on && hit(prefs.sleep.time))   add('sleep',  prefs.sleep.time)
  if (prefs.streak.on && hit(prefs.streak.time)) add('streak', prefs.streak.time)
  if (prefs.weigh.on && prefs.weigh.days.includes(weekday) && hit(prefs.weigh.time)) add('weigh', prefs.weigh.time)
  if (prefs.weekly.on && weekday === WEEKLY_DAY && hit(WEEKLY_TIME)) add('weekly', WEEKLY_TIME)
  return due
}

// ─── Textes des notifications ─────────────────────────────────────────────────

export interface MessageContext {
  profile: ReminderProfile
  /** Protéines déjà notées aujourd'hui (g) — utilisé en prise de masse */
  protToday?: number
  /** Index du rappel d'eau dans la journée (0 = premier) */
  waterIndex?: number
  waterCount?: number
}

function firstName(p: ReminderProfile): string {
  return (p.full_name ?? '').trim().split(/\s+/)[0] ?? ''
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

export function buildMessage(kind: ReminderKind, ctx: MessageContext, seed = new Date().getDate()): PushPayload {
  const p     = ctx.profile
  const name  = firstName(p)
  const hi    = name ? `${name}, ` : ''
  const goal  = p.goal ?? ''
  const hc    = p.health_conditions ?? []
  const diab  = hc.includes('diabete_type1') || hc.includes('diabete_type2')
  const gain  = goal === 'prise de masse'
  const protLeft = gain && p.prot_target
    ? Math.round(Number(p.prot_target) - (ctx.protToday ?? 0))
    : 0

  const mealBody = (moment: string): string => {
    if (diab)            return `${hi}pense à noter ton ${moment} pour suivre tes glucides.`
    if (gain && protLeft > 15) return `${hi}note ton ${moment} : il te reste environ ${protLeft} g de protéines à caser aujourd'hui.`
    if (goal === 'endurance' || goal === 'performance')
      return `${hi}un ${moment} bien noté, c'est de l'énergie pour ta prochaine séance.`
    return `${hi}une photo de ton assiette et c'est noté.`
  }

  switch (kind) {
    case 'breakfast':
      return { title: 'Petit-déjeuner', body: mealBody('petit-déjeuner'), url: '/nutrition/journal', tag: 'meal' }
    case 'lunch':
      return { title: 'Déjeuner', body: mealBody('déjeuner'), url: '/nutrition/journal', tag: 'meal' }
    case 'dinner':
      return { title: 'Dîner', body: mealBody('dîner'), url: '/nutrition/journal', tag: 'meal' }
    case 'water': {
      const target = waterTargetL(p).toFixed(1).replace('.', ',')
      const last   = ctx.waterCount !== undefined && ctx.waterIndex === ctx.waterCount - 1
      const bodies = [
        `Un grand verre d'eau maintenant ? Objectif du jour : environ ${target} L.`,
        `Petite pause hydratation. Ton corps te dit merci.`,
        `${hi}c'est l'heure d'un verre d'eau.`,
      ]
      return {
        title: 'Hydratation',
        body:  last ? `Dernier rappel d'eau de la journée. Objectif : environ ${target} L.` : pick(bodies, seed + (ctx.waterIndex ?? 0)),
        url: '/dashboard', tag: 'water',
      }
    }
    case 'sport': {
      const bodies: Record<string, string> = {
        'prise de masse': `${hi}séance prévue aujourd'hui. Raconte-la à Waty en fin de séance.`,
        endurance:        `${hi}ta sortie du jour t'attend. Même courte, elle compte.`,
        performance:      `${hi}jour d'entraînement. Échauffement, puis on y va.`,
      }
      return { title: 'Séance du jour', body: bodies[goal] ?? `${hi}un peu de mouvement aujourd'hui ? 10 minutes, c'est déjà bien.`, url: '/sport/session', tag: 'sport' }
    }
    case 'sleep':
      return { title: 'Bientôt l\'heure de dormir', body: 'Écrans rangés, lumière douce : ta récupération commence maintenant.', url: '/sleep', tag: 'sleep' }
    case 'streak':
      return { title: 'Ta série t\'attend', body: `${hi}note au moins un repas aujourd'hui pour faire grandir ta série.`, url: '/nutrition/journal', tag: 'streak' }
    case 'weigh':
      return { title: 'Pesée', body: 'Si tu en as envie, note ton poids. Une seule mesure par semaine suffit pour voir la tendance.', url: '/nutrition/journal', tag: 'weigh' }
    case 'weekly':
      return { title: 'Ta semaine avec Waty', body: `${hi}fais le point sur tes 7 derniers jours.`, url: '/bilan', tag: 'weekly' }
  }
}
