/**
 * Score MYTA — indice nutritionnel interne, calculé localement (aucun appel réseau).
 *
 * Ce n'est PAS le Nutri-Score (marque déposée de Santé publique France).
 * On applique l'algorithme public (points négatifs : énergie, sucres, AGS, sodium ;
 * points positifs : fruits/légumes/légumineuses, fibres, protéines) pour 100 g,
 * sous un nom et un design propres à MYTA.
 *
 * Les kcal / protéines / glucides / lipides des ingrédients reconnus dans
 * foods-db.ts (CIQUAL) remplacent l'estimation IA. Les sucres, AGS, fibres,
 * sel et part fruits/légumes viennent de l'estimation IA (foods-db ne les porte pas).
 *
 * `confidence` = part de la masse reconnue dans foods-db.
 * Sous 70 % → pas de note lettre (grade null), seulement des valeurs « estimation partielle ».
 */

import { FOODS_DB, type FoodItem } from './foods-db'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Per100g {
  kcal:    number
  prot:    number
  carb:    number
  sugars:  number
  fat:     number
  satFat:  number
  fiber:   number
  salt:    number   // g
  fvl:     number   // % fruits / légumes / légumineuses / noix (0-100)
}

/** Ingrédient tel que renvoyé par l'IA d'import (quantité en grammes + valeurs/100 g estimées) */
export interface ScoredIngredientInput {
  nom:      string
  grammes:  number
  per100g?: Partial<Per100g> | null
}

export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type ScoreConfidence = 'haute' | 'moyenne' | 'faible'

export interface ScoreMyta {
  per100g:     Per100g
  perPortion:  Per100g & { poids: number }
  total:       Per100g & { poids: number }
  grade:       ScoreGrade | null       // null = non affichable (confiance faible)
  points:      number
  confidence:  ScoreConfidence
  matchedPct:  number                  // % de masse reconnue dans foods-db
  matched:     { nom: string; food: string }[]
  unmatched:   string[]
  portions:    number
}

// ─── Normalisation + matching foods-db ─────────────────────────────────────────

export function normalizeFoodName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(de|du|des|la|le|les|l|d|en|a|au|aux|et|ou|un|une|frais|fraiche|fraiches|cru|crue|crus|crues|entier|entiere|entiers|bio|nature)\b/g, ' ')
    .replace(/\b(cuite|cuits|cuites)\b/g, 'cuit')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Mots qui décrivent une découpe / un contenant, pas l'aliment : ignorés pour le matching */
const GENERIC = new Set([
  'filet', 'morceau', 'tranche', 'pave', 'gros', 'grosse', 'petit', 'petite', 'bouquet', 'botte', 'feuille',
  'brin', 'gousse', 'pincee', 'poignee', 'boite', 'sachet', 'pot', 'verre', 'cuillere', 'cs', 'cc', 'soupe', 'cafe',
  'moyen', 'moyenne', 'beau', 'belle', 'quelques', 'environ', 'g', 'gr', 'kg', 'ml', 'cl', 'l',
])

function singular(w: string): string {
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1)
  if (w.length > 4 && w.endsWith('x')) return w.slice(0, -1)
  return w
}

function tokensOf(norm: string): string[] {
  return norm.split(' ').map(singular).filter(t => t.length > 1 && !GENERIC.has(t) && !/^\d+$/.test(t))
}

const INDEX: { food: FoodItem; norm: string; tokens: string[]; cooked: boolean }[] = FOODS_DB.map(f => {
  const norm = normalizeFoodName(f.name)
  const tokens = tokensOf(norm)
  return { food: f, norm, tokens: tokens.filter(t => t !== 'cuit'), cooked: tokens.includes('cuit') }
})

/**
 * Trouve l'aliment CIQUAL le plus proche d'un nom libre ("200 g de blanc de poulet" → "Blanc de poulet cru").
 * Règles : le mot principal doit correspondre, au moins la moitié des mots de chaque côté doivent être communs,
 * et un aliment « cuit » n'est retenu que si l'ingrédient est dit cuit (les quantités de recette sont crues).
 */
export function matchFood(nom: string): FoodItem | null {
  const norm = normalizeFoodName(nom)
  if (!norm) return null
  const all = tokensOf(norm)
  const wantsCooked = all.includes('cuit')
  const tokens = all.filter(t => t !== 'cuit')
  if (tokens.length === 0) return null

  const exact = INDEX.find(e => e.norm === norm)
  if (exact) return exact.food

  let best: { food: FoodItem; score: number } | null = null
  for (const e of INDEX) {
    if (e.cooked && !wantsCooked) continue
    if (e.tokens.length === 0) continue
    let common = 0
    for (const t of tokens) if (e.tokens.includes(t)) common++
    if (common === 0) continue
    const covIng  = common / tokens.length
    const covFood = common / e.tokens.length
    if (covIng < 0.5 || covFood < 0.5) continue
    if (common < 2 && tokens.length > 1) continue   // « pâtes penne » ne doit pas matcher « pâte de dattes »
    if (!e.tokens.includes(tokens[0]) && !tokens.includes(e.tokens[0])) continue   // le mot principal doit matcher
    const score = covIng + covFood + (e.tokens[0] === tokens[0] ? 0.3 : 0) + (e.cooked === wantsCooked ? 0.1 : 0) - e.tokens.length * 0.1
    if (!best || score > best.score) best = { food: e.food, score }
  }
  return best ? best.food : null
}

// ─── Algorithme de points (aliments généraux, pour 100 g) ──────────────────────

function pts(value: number, thresholds: number[]): number {
  let p = 0
  for (const t of thresholds) if (value > t) p++
  return p
}

const KJ        = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]
const SUGARS    = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]
const SATFAT    = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const SODIUM    = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]
const FIBER     = [0.9, 1.9, 2.8, 3.7, 4.7]
const PROTEIN   = [1.6, 3.2, 4.8, 6.4, 8]

function fvlPoints(pct: number): number {
  if (pct > 80) return 5
  if (pct > 60) return 2
  if (pct > 40) return 1
  return 0
}

export function computePoints(p: Per100g): number {
  const nEnergy = pts(p.kcal * 4.184, KJ)
  const nSugar  = pts(p.sugars, SUGARS)
  const nSat    = pts(p.satFat, SATFAT)
  const nSodium = pts(p.salt * 400, SODIUM)   // 1 g sel ≈ 400 mg sodium
  const N = nEnergy + nSugar + nSat + nSodium

  const pFvl   = fvlPoints(p.fvl)
  const pFiber = pts(p.fiber, FIBER)
  const pProt  = pts(p.prot, PROTEIN)

  if (N < 11 || pFvl === 5) return N - (pFvl + pFiber + pProt)
  return N - (pFvl + pFiber)   // protéines non comptées
}

export function gradeFromPoints(points: number): ScoreGrade {
  if (points <= -1) return 'A'
  if (points <= 2)  return 'B'
  if (points <= 10) return 'C'
  if (points <= 18) return 'D'
  return 'E'
}

// ─── Calcul principal ──────────────────────────────────────────────────────────

const EMPTY: Per100g = { kcal: 0, prot: 0, carb: 0, sugars: 0, fat: 0, satFat: 0, fiber: 0, salt: 0, fvl: 0 }

function r1(n: number) { return Math.round(n * 10) / 10 }

export function scoreRecipe(
  ingredients: ScoredIngredientInput[],
  portions: number,
  poidsTotalOverride?: number | null,
): ScoreMyta {
  const nPortions = Math.max(1, Math.round(portions || 1))
  const totals = { ...EMPTY }      // valeurs absolues sur toute la recette (fvl = masse FVL en g)
  let mass = 0, matchedMass = 0
  const matched: { nom: string; food: string }[] = []
  const unmatched: string[] = []

  for (const ing of ingredients) {
    const g = Math.max(0, Number(ing.grammes) || 0)
    if (g === 0) continue
    const est = { ...EMPTY, ...(ing.per100g ?? {}) }
    const food = matchFood(ing.nom)
    if (food) {
      est.kcal = food.cal; est.prot = food.prot; est.carb = food.carb; est.fat = food.fat
      matchedMass += g
      matched.push({ nom: ing.nom, food: food.name })
      // Catégorie CIQUAL → part fruits/légumes/légumineuses si l'IA n'a rien dit
      if (!ing.per100g?.fvl && ['fruit', 'légume', 'legume', 'légumineuse', 'legumineuse', 'noix'].includes((food.cat || '').toLowerCase())) est.fvl = 100
    } else {
      unmatched.push(ing.nom)
    }
    const k = g / 100
    totals.kcal   += est.kcal   * k
    totals.prot   += est.prot   * k
    totals.carb   += est.carb   * k
    totals.sugars += est.sugars * k
    totals.fat    += est.fat    * k
    totals.satFat += est.satFat * k
    totals.fiber  += est.fiber  * k
    totals.salt   += est.salt   * k
    totals.fvl    += g * (Math.min(100, Math.max(0, est.fvl)) / 100)
    mass += g
  }

  const poidsTotal = poidsTotalOverride && poidsTotalOverride > 0 ? poidsTotalOverride : mass
  const safeMass = Math.max(1, poidsTotal)
  const per100g: Per100g = {
    kcal:   r1(totals.kcal   / safeMass * 100),
    prot:   r1(totals.prot   / safeMass * 100),
    carb:   r1(totals.carb   / safeMass * 100),
    sugars: r1(totals.sugars / safeMass * 100),
    fat:    r1(totals.fat    / safeMass * 100),
    satFat: r1(totals.satFat / safeMass * 100),
    fiber:  r1(totals.fiber  / safeMass * 100),
    salt:   r1(totals.salt   / safeMass * 100),
    fvl:    Math.round(mass > 0 ? totals.fvl / mass * 100 : 0),
  }
  const perPortion = {
    kcal:   Math.round(totals.kcal / nPortions),
    prot:   r1(totals.prot   / nPortions),
    carb:   r1(totals.carb   / nPortions),
    sugars: r1(totals.sugars / nPortions),
    fat:    r1(totals.fat    / nPortions),
    satFat: r1(totals.satFat / nPortions),
    fiber:  r1(totals.fiber  / nPortions),
    salt:   r1(totals.salt   / nPortions),
    fvl:    per100g.fvl,
    poids:  Math.round(poidsTotal / nPortions),
  }

  const matchedPct = mass > 0 ? Math.round(matchedMass / mass * 100) : 0
  const confidence: ScoreConfidence = matchedPct >= 85 ? 'haute' : matchedPct >= 70 ? 'moyenne' : 'faible'
  const points = mass > 0 ? computePoints(per100g) : 0
  const grade  = mass > 0 && confidence !== 'faible' ? gradeFromPoints(points) : null

  return {
    per100g, perPortion,
    total: { ...per100g, kcal: Math.round(totals.kcal), prot: r1(totals.prot), carb: r1(totals.carb), fat: r1(totals.fat), poids: Math.round(poidsTotal) },
    grade, points, confidence, matchedPct, matched, unmatched, portions: nPortions,
  }
}

/** Phrases « on situe, on ne prescrit pas » — jamais culpabilisantes */
export function describeScore(s: ScoreMyta): string[] {
  const out: string[] = []
  const p = s.per100g
  if (p.prot >= 8)        out.push('riche en protéines')
  else if (p.prot < 3)    out.push('peu de protéines')
  if (p.fiber >= 3.7)     out.push('bonne source de fibres')
  else if (p.fiber < 1.5) out.push('pauvre en fibres')
  if (p.satFat > 5)       out.push('riche en graisses saturées')
  else if (p.fat >= 15)   out.push('plutôt riche en lipides')
  if (p.sugars > 13.5)    out.push('sucrée')
  if (p.salt > 1.2)       out.push('plutôt salée')
  if (p.fvl > 60)         out.push('beaucoup de végétaux')
  if (out.length === 0)   out.push('profil équilibré')
  return out
}

export const SCORE_COLORS: Record<ScoreGrade, { bg: string; text: string; ring: string }> = {
  // Design MYTA (pas le dégradé vert→rouge officiel), aucun rouge : on ne culpabilise pas
  A: { bg: 'bg-nutri',      text: 'text-white',      ring: 'ring-nutri/30' },
  B: { bg: 'bg-nutri-mid',  text: 'text-white',      ring: 'ring-nutri/20' },
  C: { bg: 'bg-amber-300',  text: 'text-amber-900',  ring: 'ring-amber-200' },
  D: { bg: 'bg-orange-300', text: 'text-orange-900', ring: 'ring-orange-200' },
  E: { bg: 'bg-zinc-400',   text: 'text-white',      ring: 'ring-zinc-200' },
}
