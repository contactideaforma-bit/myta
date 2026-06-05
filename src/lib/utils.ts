import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Sport ────────────────────────────────────────────────────────────────────
export const DISCIPLINE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Natation:    { bg: 'bg-swim-light',   text: 'text-swim-dark',   dot: 'bg-swim' },
  Musculation: { bg: 'bg-gym-light',    text: 'text-gym-dark',    dot: 'bg-gym' },
  Cardio:      { bg: 'bg-cardio-light', text: 'text-cardio-dark', dot: 'bg-cardio' },
  Boxe:        { bg: 'bg-boxing-light', text: 'text-boxing-dark', dot: 'bg-boxing' },
}

export function minutesToHuman(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m} min`
}

// ─── Nutrition ────────────────────────────────────────────────────────────────
export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function formatCal(cal: number): string {
  return cal >= 1000 ? `${(cal / 1000).toFixed(1)}k` : `${Math.round(cal)}`
}

export function macroPercent(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

// Retourne la date locale de l'appareil (pas UTC)
// toISOString() retourne UTC — ce qui donnerait "hier" après minuit en Europe
export function todayISO(): string {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = String(now.getMonth() + 1).padStart(2, '0')
  const d   = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Partagé ──────────────────────────────────────────────────────────────────
export function calcIMC(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function calcTDEE(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: 'homme' | 'femme',
  activityFactor = 1.55
): number {
  // Mifflin-St Jeor
  const bmr =
    sex === 'homme'
      ? 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161
  return Math.round(bmr * activityFactor)
}
