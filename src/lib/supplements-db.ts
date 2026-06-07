// ── Base de données compléments alimentaires ─────────────────────────────────
// Chaque complément contient : nom, emoji, catégorie,
// micronutriments apportés, effet anti-inflammatoire (true/false/null),
// et une note santé Waty.

export interface Supplement {
  id:          string
  name:        string
  emoji:       string
  category:    'plante' | 'minéral' | 'vitamine' | 'acide aminé' | 'autre'
  dose:        string          // dose usuelle ex: "1 cuillère à café"
  // Micronutriments pour la dose standard (valeurs approximatives)
  micros: {
    vitC?:  number  // mg
    vitD?:  number  // µg
    vitB12?: number // µg
    vitE?:  number  // mg
    magnesium?: number // mg
    calcium?:   number // mg
    fer?:       number // mg
    zinc?:      number // mg
    omega3?:    number // g
    curcumin?:  number // mg (actif curcuma)
    polyphenols?: number // mg estimé
  }
  antiInflam:  true | false | null  // true=anti-inflam, false=neutre, null=variable
  watyNote:    string
}

export const SUPPLEMENTS: Supplement[] = [
  {
    id: 'moringa',
    name: 'Moringa', emoji: '🌿', category: 'plante', dose: '1 cuillère à café (3g)',
    micros: { vitC: 12, fer: 2.8, calcium: 124, magnesium: 27, vitE: 0.4, polyphenols: 150 },
    antiInflam: true,
    watyNote: 'Super-aliment riche en antioxydants et minéraux — anti-inflammatoire reconnu.',
  },
  {
    id: 'curcuma',
    name: 'Curcuma (poudre)', emoji: '🟡', category: 'plante', dose: '1 cuillère à café (3g)',
    micros: { curcumin: 60, fer: 2.1, polyphenols: 80 },
    antiInflam: true,
    watyNote: 'La curcumine est l\'un des anti-inflammatoires naturels les plus étudiés.',
  },
  {
    id: 'gingembre',
    name: 'Gingembre (poudre)', emoji: '🫚', category: 'plante', dose: '1 cuillère à café (2g)',
    micros: { magnesium: 12, polyphenols: 40 },
    antiInflam: true,
    watyNote: 'Les gingérols réduisent l\'inflammation et améliorent la digestion.',
  },
  {
    id: 'spiruline',
    name: 'Spiruline', emoji: '🟢', category: 'plante', dose: '1 cuillère à café (5g)',
    micros: { vitB12: 1.6, fer: 2.4, magnesium: 19, vitE: 0.5, polyphenols: 30 },
    antiInflam: true,
    watyNote: 'Riche en phycocyanine, un pigment aux propriétés anti-inflammatoires puissantes.',
  },
  {
    id: 'chlorella',
    name: 'Chlorella', emoji: '💚', category: 'plante', dose: '3g',
    micros: { fer: 2.6, vitB12: 0.8, magnesium: 15, vitC: 3 },
    antiInflam: true,
    watyNote: 'Détoxifiant naturel, aide à éliminer les métaux lourds et soutient le système immunitaire.',
  },
  {
    id: 'magnesium',
    name: 'Magnésium (bisglycinate)', emoji: '⚡', category: 'minéral', dose: '1 gélule (300mg)',
    micros: { magnesium: 300 },
    antiInflam: null,
    watyNote: 'Essentiel à plus de 300 réactions enzymatiques. Favorise le sommeil et réduit le stress.',
  },
  {
    id: 'vitamine-d',
    name: 'Vitamine D3', emoji: '☀️', category: 'vitamine', dose: '1 gélule (25µg)',
    micros: { vitD: 25 },
    antiInflam: true,
    watyNote: 'Module le système immunitaire et réduit l\'inflammation chronique.',
  },
  {
    id: 'vitamine-c',
    name: 'Vitamine C', emoji: '🍊', category: 'vitamine', dose: '1 comprimé (500mg)',
    micros: { vitC: 500 },
    antiInflam: true,
    watyNote: 'Puissant antioxydant, soutient le système immunitaire et la synthèse de collagène.',
  },
  {
    id: 'vitamine-b12',
    name: 'Vitamine B12', emoji: '💊', category: 'vitamine', dose: '1 gélule (250µg)',
    micros: { vitB12: 250 },
    antiInflam: null,
    watyNote: 'Indispensable au système nerveux et à la production de globules rouges.',
  },
  {
    id: 'omega3',
    name: 'Oméga-3 (huile de poisson)', emoji: '🐟', category: 'autre', dose: '2 gélules (1g EPA+DHA)',
    micros: { omega3: 1, vitD: 2 },
    antiInflam: true,
    watyNote: 'Les EPA et DHA sont des anti-inflammatoires majeurs, bénéfiques pour le cœur et le cerveau.',
  },
  {
    id: 'zinc',
    name: 'Zinc', emoji: '🔵', category: 'minéral', dose: '1 gélule (15mg)',
    micros: { zinc: 15 },
    antiInflam: true,
    watyNote: 'Renforce l\'immunité et possède des propriétés anti-inflammatoires.',
  },
  {
    id: 'fer',
    name: 'Fer bisglycinate', emoji: '🔴', category: 'minéral', dose: '1 gélule (14mg)',
    micros: { fer: 14 },
    antiInflam: null,
    watyNote: 'Indispensable au transport de l\'oxygène dans le sang.',
  },
  {
    id: 'calcium',
    name: 'Calcium', emoji: '🦴', category: 'minéral', dose: '1 comprimé (500mg)',
    micros: { calcium: 500 },
    antiInflam: null,
    watyNote: 'Essentiel aux os, aux muscles et à la contraction musculaire.',
  },
  {
    id: 'ashwagandha',
    name: 'Ashwagandha', emoji: '🌱', category: 'plante', dose: '1 gélule (300mg)',
    micros: { polyphenols: 50 },
    antiInflam: true,
    watyNote: 'Adaptogène puissant : réduit le cortisol, le stress et l\'inflammation.',
  },
  {
    id: 'rhodiola',
    name: 'Rhodiola Rosea', emoji: '🌺', category: 'plante', dose: '1 gélule (200mg)',
    micros: { polyphenols: 30 },
    antiInflam: true,
    watyNote: 'Adaptogène qui améliore la résistance au stress et réduit la fatigue.',
  },
  {
    id: 'gelules-probiotiques',
    name: 'Probiotiques', emoji: '🦠', category: 'autre', dose: '1 gélule',
    micros: {},
    antiInflam: true,
    watyNote: 'Favorisent l\'équilibre du microbiome intestinal, réduisant l\'inflammation systémique.',
  },
  {
    id: 'glutamine',
    name: 'L-Glutamine', emoji: '💪', category: 'acide aminé', dose: '5g (1 cuillère à café)',
    micros: {},
    antiInflam: null,
    watyNote: 'Soutient la récupération musculaire et la santé de la paroi intestinale.',
  },
  {
    id: 'collagene',
    name: 'Collagène marin', emoji: '✨', category: 'autre', dose: '10g (1 dose)',
    micros: {},
    antiInflam: null,
    watyNote: 'Soutient les articulations, la peau et les tendons.',
  },
  {
    id: 'the-vert',
    name: 'Thé vert (extrait)', emoji: '🍵', category: 'plante', dose: '1 gélule (250mg EGCG)',
    micros: { polyphenols: 200 },
    antiInflam: true,
    watyNote: 'L\'EGCG est l\'un des antioxydants les plus puissants, aux effets anti-inflammatoires prouvés.',
  },
  {
    id: 'reishi',
    name: 'Reishi (champignon)', emoji: '🍄', category: 'plante', dose: '1 gélule (500mg)',
    micros: { polyphenols: 60 },
    antiInflam: true,
    watyNote: 'Champignon médicinal adaptogène, puissamment anti-inflammatoire et immunostimulant.',
  },
  {
    id: 'vitamine-e',
    name: 'Vitamine E', emoji: '🌻', category: 'vitamine', dose: '1 gélule (15mg)',
    micros: { vitE: 15 },
    antiInflam: true,
    watyNote: 'Antioxydant liposoluble qui protège les membranes cellulaires.',
  },
  {
    id: 'piperine',
    name: 'Pipérine (poivre noir)', emoji: '🌶️', category: 'plante', dose: '5mg',
    micros: {},
    antiInflam: true,
    watyNote: 'Améliore l\'absorption du curcuma jusqu\'à 2000% et a ses propres effets anti-inflammatoires.',
  },
  {
    id: 'charbon-actif',
    name: 'Charbon végétal activé', emoji: '⬛', category: 'autre', dose: '1 gélule',
    micros: {},
    antiInflam: false,
    watyNote: 'Adsorbant, utile en cas de ballonnements. N\'a pas d\'effet anti-inflammatoire direct.',
  },
  {
    id: 'acide-hyaluronique',
    name: 'Acide hyaluronique', emoji: '💧', category: 'autre', dose: '1 gélule (150mg)',
    micros: {},
    antiInflam: null,
    watyNote: 'Soutient l\'hydratation articulaire et cutanée.',
  },
  {
    id: 'ail-noir',
    name: 'Ail noir', emoji: '🧄', category: 'plante', dose: '1 gélule',
    micros: { polyphenols: 80 },
    antiInflam: true,
    watyNote: 'Encore plus riche en antioxydants que l\'ail frais, puissamment anti-inflammatoire.',
  },
]

// Micronutriments de référence journalière (AJR)
export const MICRO_RDA = {
  vitC:      { label: 'Vitamine C',   unit: 'mg', rda: 80,   color: '#f97316' },
  vitD:      { label: 'Vitamine D',   unit: 'µg', rda: 15,   color: '#eab308' },
  vitB12:    { label: 'Vitamine B12', unit: 'µg', rda: 2.4,  color: '#8b5cf6' },
  vitE:      { label: 'Vitamine E',   unit: 'mg', rda: 12,   color: '#06b6d4' },
  magnesium: { label: 'Magnésium',    unit: 'mg', rda: 375,  color: '#22c55e' },
  calcium:   { label: 'Calcium',      unit: 'mg', rda: 800,  color: '#3b82f6' },
  fer:       { label: 'Fer',          unit: 'mg', rda: 14,   color: '#ef4444' },
  zinc:      { label: 'Zinc',         unit: 'mg', rda: 10,   color: '#14b8a6' },
  omega3:    { label: 'Oméga-3',      unit: 'g',  rda: 2,    color: '#6366f1' },
  curcumin:  { label: 'Curcumine',    unit: 'mg', rda: 100,  color: '#f59e0b' },  // objectif fonctionnel
  polyphenols: { label: 'Polyphénols', unit: 'mg', rda: 500, color: '#a855f7' },  // objectif fonctionnel
}

export type MicroKey = keyof typeof MICRO_RDA

export function searchSupplements(query: string): Supplement[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return SUPPLEMENTS.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q) ||
    s.watyNote.toLowerCase().includes(q)
  ).slice(0, 8)
}

export function calcSupplementMicros(supplements: { supplement: Supplement; qty: number }[]) {
  const result: Partial<Record<MicroKey, number>> = {}
  for (const { supplement, qty } of supplements) {
    for (const [key, val] of Object.entries(supplement.micros)) {
      if (val !== undefined) {
        result[key as MicroKey] = (result[key as MicroKey] ?? 0) + val * qty
      }
    }
  }
  return result
}
