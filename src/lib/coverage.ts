/**
 * Couverture du suivi — l'utilisateur ne note pas 100 % de ses repas ni de ses nuits.
 *
 * Règle : un jour sans saisie est un jour NON RENSEIGNÉ, jamais un jour à 0 kcal
 * ni une nuit blanche. Les moyennes, déficits et objectifs se calculent uniquement
 * sur les jours réellement renseignés ; un jour « partiel » (une collation notée
 * puis plus rien) n'est pas compté comme une journée complète.
 */

export type DayStatus = 'complete' | 'partial' | 'none'

export interface DayCoverage { date: string; cal: number; entries: number; status: DayStatus }

/** Seuils : journée considérée complète si ≥ 55 % de l'objectif OU ≥ 3 saisies (repas). */
export const COMPLETE_RATIO = 0.55
export const COMPLETE_ENTRIES = 3

export function dayStatus(cal: number, entries: number, calTarget: number): DayStatus {
  if (entries <= 0 && cal <= 0) return 'none'
  if (cal >= Math.max(300, calTarget * COMPLETE_RATIO) || entries >= COMPLETE_ENTRIES) return 'complete'
  return 'partial'
}

/**
 * Agrège des lignes de journal (date, cal) en jours couverts.
 * `days` liste les dates attendues (ex. les 7 derniers jours) pour compter les jours sans rien.
 */
export function buildCoverage(rows: { date: string; cal: number | string | null }[], calTarget: number, days?: string[]): DayCoverage[] {
  const map: Record<string, { cal: number; entries: number }> = {}
  for (const r of rows) {
    const m = (map[r.date] ??= { cal: 0, entries: 0 })
    m.cal += Number(r.cal ?? 0); m.entries += 1
  }
  const dates = days ?? Object.keys(map).sort()
  return dates.map(date => {
    const m = map[date] ?? { cal: 0, entries: 0 }
    return { date, cal: Math.round(m.cal), entries: m.entries, status: dayStatus(m.cal, m.entries, calTarget) }
  })
}

export interface CoverageSummary {
  expected: number        // jours de la période
  complete: number        // journées complètes → base des moyennes
  partial: number         // journées partielles (ignorées des moyennes)
  none: number
  avgCal: number | null   // moyenne sur les journées complètes seulement
  reliable: boolean       // ≥ 3 journées complètes
}

export function summarizeCoverage(cov: DayCoverage[]): CoverageSummary {
  const complete = cov.filter(d => d.status === 'complete')
  const partial = cov.filter(d => d.status === 'partial').length
  const none = cov.filter(d => d.status === 'none').length
  const avgCal = complete.length ? Math.round(complete.reduce((s, d) => s + d.cal, 0) / complete.length) : null
  return { expected: cov.length, complete: complete.length, partial, none, avgCal, reliable: complete.length >= 3 }
}

/** Phrase courte pour l'écran : « 4 jours renseignés sur 7 (1 partiel ignoré) ». */
export function coverageLabel(s: CoverageSummary, unit = 'jour'): string {
  const u = (n: number) => `${n} ${unit}${n > 1 ? 's' : ''}`
  if (s.complete === 0 && s.partial === 0) return `aucun ${unit} renseigné`
  const base = `${u(s.complete)} renseigné${s.complete > 1 ? 's' : ''} sur ${s.expected}`
  return s.partial ? `${base} (${s.partial} partiel${s.partial > 1 ? 's' : ''} ignoré${s.partial > 1 ? 's' : ''})` : base
}

/** Liste des N derniers jours (ISO), du plus ancien au plus récent, aujourd'hui inclus. */
export function lastDays(n: number, today = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return out
}
