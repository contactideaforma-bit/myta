// ============================================================
// MYTA — Actu / Conseil du jour
// Sélection déterministe (stable dans la journée) filtrée par profil
// ============================================================

export interface DailyTip {
  key:        string
  emoji:      string
  title:      string
  body:       string
  tags:       string[]   // goals / conditions / 'general' / 'tabac'
  source?:    string
}

// ── Pool de conseils ─────────────────────────────────────────
const TIPS_POOL: DailyTip[] = [
  // ── Perte de poids ───────────────────────────────────────
  {
    key: 'deficit-200', emoji: '🔥', tags: ['perte de poids'],
    title: 'Déficit modéré = résultats durables',
    body: 'Un déficit de 200 à 300 kcal/jour est plus efficace à long terme qu'un régime strict. Tu perds du gras sans perdre du muscle.',
  },
  {
    key: 'proteines-satiete', emoji: '🥩', tags: ['perte de poids', 'prise de masse'],
    title: 'Protéines = satiété',
    body: 'Les protéines coupent la faim bien mieux que les glucides. Vise 1,6 à 2g/kg de poids pour rester rassasié(e) tout en préservant tes muscles.',
  },
  {
    key: 'marche-avant-repas', emoji: '🚶', tags: ['perte de poids', 'forme generale'],
    title: '10 min de marche avant de manger',
    body: 'Une marche courte avant le repas réduit la glycémie postprandiale de 22%. Simple et redoutablement efficace.',
    source: 'Sports Medicine, 2022',
  },
  {
    key: 'assiette-couleurs', emoji: '🌈', tags: ['perte de poids', 'forme generale'],
    title: 'L'assiette colorée',
    body: 'Plus ton assiette est colorée, plus elle est nutritive. Vise au moins 3 couleurs différentes à chaque repas.',
  },
  {
    key: 'sleep-poids', emoji: '🌙', tags: ['perte de poids'],
    title: 'Le sommeil influence ton poids',
    body: 'Dormir moins de 7h augmente la ghréline (hormone de la faim) et réduit la leptine (satiété). La qualité de ton sommeil est un levier de perte de poids.',
    source: 'Sleep, 2023',
  },

  // ── Prise de masse ───────────────────────────────────────
  {
    key: 'surplus-100', emoji: '💪', tags: ['prise de masse'],
    title: 'Surplus calorique malin',
    body: 'Pour prendre de la masse sans trop de gras, un surplus de 100 à 200 kcal/jour suffit. Plus n'est pas forcément mieux.',
  },
  {
    key: 'creatine', emoji: '⚡', tags: ['prise de masse', 'performance'],
    title: 'Créatine — le complément le plus étudié',
    body: 'La créatine monohydrate est l'un des rares compléments avec des preuves solides : +8% de force en moyenne après 4 semaines. Dose : 3 à 5g/jour.',
    source: 'Journal of Strength & Conditioning, 2021',
  },
  {
    key: 'temps-repos', emoji: '⏱️', tags: ['prise de masse', 'performance'],
    title: 'Le repos entre les séries compte',
    body: 'Pour l'hypertrophie, 60 à 90 secondes de repos entre les séries est optimal. Trop court ou trop long réduit les gains.',
  },

  // ── Endurance ────────────────────────────────────────────
  {
    key: 'zone2', emoji: '🏃', tags: ['endurance'],
    title: 'Zone 2 — le secret des champions',
    body: 'L'entraînement "Zone 2" (conversation possible, pas d'essoufflement) représente 80% du volume des athlètes d'endurance élite. Il améliore les mitochondries.',
  },
  {
    key: 'hydratation-sport', emoji: '💧', tags: ['endurance', 'forme generale'],
    title: 'Hydratation et performance',
    body: 'Une déshydratation de 2% réduit la performance de 10 à 20%. Bois 500ml d'eau 2h avant l'effort, puis régulièrement pendant.',
  },
  {
    key: 'glucides-endurance', emoji: '🍌', tags: ['endurance'],
    title: 'Glucides avant l'effort long',
    body: 'Pour un effort >90 min, consomme 30 à 60g de glucides/h. La banane, les dattes ou les gels restent des classiques efficaces.',
  },

  // ── Forme générale ───────────────────────────────────────
  {
    key: 'eau-matin', emoji: '☀️', tags: ['forme generale', 'general'],
    title: 'Un verre d'eau au réveil',
    body: 'Après 8h sans boire, ton corps est déshydraté. Un grand verre d'eau au réveil booste l'énergie et le transit dès le matin.',
  },
  {
    key: 'fibres', emoji: '🥦', tags: ['forme generale', 'general'],
    title: '30g de fibres par jour',
    body: 'La plupart des gens consomment 2x moins de fibres que recommandé. Légumes, légumineuses, fruits entiers, graines — ton microbiote te remerciera.',
  },
  {
    key: 'stress-cortisol', emoji: '🧘', tags: ['forme generale', 'general'],
    title: 'Le stress stocke la graisse',
    body: 'Le cortisol (hormone du stress) favorise le stockage des graisses abdominales. 5 minutes de respiration profonde par jour réduisent significativement le cortisol.',
  },
  {
    key: 'omega3', emoji: '🐟', tags: ['forme generale', 'general'],
    title: 'Oméga-3 — indispensables',
    body: 'Les oméga-3 (poissons gras, noix, lin) réduisent l'inflammation, améliorent la récupération musculaire et soutiennent le cerveau. 2 à 3 portions de poisson gras/semaine suffisent.',
  },
  {
    key: 'fractionner-repas', emoji: '🍽️', tags: ['forme generale', 'general'],
    title: 'Manger lentement',
    body: 'Le signal de satiété met 20 minutes pour arriver au cerveau. Manger lentement permet de consommer moins sans avoir faim — un des outils les plus simples et efficaces.',
  },

  // ── Diabète ──────────────────────────────────────────────
  {
    key: 'glycemie-ordre', emoji: '🩸', tags: ['diabete_type1', 'diabete_type2'],
    title: 'L'ordre des aliments dans l'assiette',
    body: 'Manger les légumes d'abord, puis les protéines, puis les glucides réduit le pic de glycémie de 37%. Un simple changement d'ordre qui fait la différence.',
    source: 'Diabetes Care, 2023',
  },
  {
    key: 'vinaigre', emoji: '🫙', tags: ['diabete_type2'],
    title: 'Vinaigre et glycémie',
    body: '1 à 2 cuillères à soupe de vinaigre de cidre avant les repas riches en glucides réduit le pic glycémique de 20%. Simple à intégrer.',
    source: 'European Journal of Clinical Nutrition',
  },
  {
    key: 'marche-post-repas', emoji: '🚶', tags: ['diabete_type1', 'diabete_type2'],
    title: 'Marche post-repas',
    body: '10 minutes de marche après le repas réduit le pic de glycémie de 22%. Plus efficace qu'une marche de même durée avant ou 1h après.',
  },

  // ── Hypertension ─────────────────────────────────────────
  {
    key: 'sel-sources', emoji: '🧂', tags: ['hypertension'],
    title: '80% du sel vient des produits transformés',
    body: 'Limiter le sel à table n'est pas suffisant : 80% de notre consommation vient des plats préparés, charcuteries et fromages. Lis les étiquettes.',
  },
  {
    key: 'potassium-tension', emoji: '🍌', tags: ['hypertension'],
    title: 'Potassium contre-balance le sodium',
    body: 'Le potassium réduit naturellement la pression artérielle en aidant les reins à éliminer le sodium. Sources : banane, avocat, haricots, pommes de terre.',
  },

  // ── Tabac ────────────────────────────────────────────────
  {
    key: 'tabac-4min', emoji: '🕐', tags: ['tabac'],
    title: 'L'envie dure 4 minutes',
    body: 'Une envie de fumer dure en moyenne 3 à 4 minutes. Bois un verre d'eau, marche, ou respire profondément — l'envie passe sans que tu aies fumé.',
  },
  {
    key: 'tabac-dopamine', emoji: '🧠', tags: ['tabac'],
    title: 'Ce que tu ressens est chimique',
    body: 'La nicotine libère de la dopamine. L'arrêt crée un manque temporaire — ton cerveau se reconfigure en 3 semaines. Chaque jour sans cigarette renforce les nouvelles connexions.',
  },
  {
    key: 'tabac-argent', emoji: '💰', tags: ['tabac'],
    title: 'Ce que tu économises',
    body: 'Un paquet/jour représente environ 3 600 €/an. Après 1 mois sans fumer, tu as économisé ~300 €. Qu'est-ce que tu pourrais t'offrir ?',
  },
  {
    key: 'tabac-poumons', emoji: '🫁', tags: ['tabac'],
    title: 'Tes poumons récupèrent',
    body: 'Après 72h sans fumer, ta respiration s'améliore déjà. Après 1 mois, la capacité pulmonaire augmente de 30%. Le corps a une capacité de récupération remarquable.',
  },

  // ── Inflammatoire ────────────────────────────────────────
  {
    key: 'curcuma', emoji: '🟡', tags: ['inflammatoire'],
    title: 'Curcuma + poivre noir',
    body: 'La curcumine a des propriétés anti-inflammatoires comparables à l'ibuprofène selon certaines études. Le poivre noir multiplie son absorption par 2000%. Associe-les toujours.',
    source: 'Oncogene, 2004',
  },
  {
    key: 'anti-inflam-aliments', emoji: '🫐', tags: ['inflammatoire'],
    title: 'Les aliments anti-inflammatoires à privilégier',
    body: 'Myrtilles, cerises, saumon, huile d'olive, noix, épinards et thé vert sont vos alliés. Idéalement 2 à 3 de ces aliments chaque jour.',
  },

  // ── Général ──────────────────────────────────────────────
  {
    key: 'soleil-vitd', emoji: '☀️', tags: ['general'],
    title: 'Vitamine D — la vitamine du soleil',
    body: '80% des Français manquent de vitamine D en hiver. Elle joue un rôle clé dans l'immunité, l'humeur et l'absorption du calcium. 15 à 30 min de soleil/jour ou une supplémentation.',
  },
  {
    key: 'magnésium', emoji: '🥜', tags: ['general'],
    title: 'Magnésium — le minéral du calme',
    body: 'Le magnésium réduit le stress, améliore le sommeil et les crampes. Sources : amandes, noix du Brésil, cacao, légumineuses. 300mg/jour recommandés.',
  },
  {
    key: 'jeune-nuit', emoji: '🌙', tags: ['general'],
    title: '12h sans manger — déjà du jeûne',
    body: 'Une fenêtre de jeûne nocturne de 12h (ex: 20h → 8h) améliore la sensibilité à l'insuline et favorise l'autophagie. Simple et sans contraintes.',
    source: 'Cell Metabolism, 2022',
  },
  {
    key: 'pleine-conscience', emoji: '🧠', tags: ['general'],
    title: 'Manger en pleine conscience',
    body: 'Évite les écrans pendant les repas. Les distractions font consommer 10 à 25% de calories de plus. Le repas devient aussi un moment de récupération.',
  },
]

// ── Sélection du tip du jour ──────────────────────────────────
export function getDailyTip(params: {
  goal?:              string | null
  healthConditions?:  string[] | null
  smokingGoal?:       boolean
}): DailyTip {
  const { goal, healthConditions = [], smokingGoal } = params
  const today = new Date().toISOString().split('T')[0]
  const seed  = parseInt(today.replace(/-/g, '')) % 1000

  // Construire la liste filtrée par pertinence
  const tags: string[] = ['general']
  if (goal)           tags.push(goal)
  if (smokingGoal)    tags.push('tabac')
  if (healthConditions?.length) tags.push(...(healthConditions as string[]))

  // Tips pertinents pour ce profil
  const relevant = TIPS_POOL.filter(t => t.tags.some(tag => tags.includes(tag)))
  const pool = relevant.length > 0 ? relevant : TIPS_POOL

  return pool[seed % pool.length]
}
