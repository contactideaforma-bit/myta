// ============================================================
// MYTA — Phases hormonales (périménopause / ménopause)
// Source unique de vérité : libellés, ajustements métaboliques,
// aliments à privilégier / limiter, conseils sport, messages Waty.
// Utilisé par le profil (ProfileBilan), le conseil du jour et le bilan IA.
// ============================================================

export type HormonalPhase = 'perimenopause' | 'menopause'

export interface HormonalPhaseInfo {
  value:        HormonalPhase
  label:        string
  /** Phrase courte affichée sous la puce de sélection dans le profil */
  short:        string
  /** Facteur appliqué au métabolisme de base (1 = inchangé) */
  bmrFactor:    number
  /** Protéines recommandées en g/kg de poids corporel */
  protPerKg:    number
  /** Texte affiché dans la bannière du bilan */
  banner:       { title: string; body: string }
  /** Ce que Waty dit en ouvrant le bloc conseils */
  waty:         string
  /** Notes ajoutées à l'explication des objectifs calculés */
  macroNotes:   string[]
  /** Aliments à privilégier — { pourquoi, exemples } */
  favor:        { why: string; foods: string }[]
  /** À limiter (jamais « interdit ») */
  limit:        string[]
  /** Conseils sport */
  sport:        string[]
  /** Phrase transmise au bilan IA (health-report) */
  aiNote:       string
}

export const HORMONAL_PHASES: Record<HormonalPhase, HormonalPhaseInfo> = {
  perimenopause: {
    value:     'perimenopause',
    label:     'Périménopause',
    short:     'Protéines renforcées, glycémie stable, calcium et oméga-3 au premier plan',
    bmrFactor: 1,
    protPerKg: 1.5,
    banner: {
      title: 'Mode Périménopause activé',
      body:  "Les hormones fluctuent : l'énergie, le sommeil et l'appétit aussi. Waty mise sur des repas réguliers, riches en protéines et en fibres, pour lisser les variations de glycémie et préserver ta masse musculaire. Parles-en à ton médecin ou ta gynécologue pour un suivi personnalisé.",
    },
    waty: "Pendant la périménopause, ton corps change de rythme — ce n'est pas toi qui « fais mal ». Je t'aide à t'adapter plutôt qu'à te restreindre : des protéines à chaque repas, du calcium, des bonnes graisses, et du renforcement musculaire pour garder tes muscles et tes os solides.",
    macroNotes: [
      'Périménopause : protéines ≈ 1,5 g/kg pour préserver la masse musculaire, réparties sur les 3 repas',
      'Glucides plutôt complets et riches en fibres — ils stabilisent la glycémie et l\'énergie',
      'Pas de déficit sévère : un déficit modéré préserve mieux le métabolisme à cette période',
    ],
    favor: [
      { why: 'Protéines — garder le muscle',          foods: 'Œufs, poisson, volaille, tofu, légumineuses, fromage blanc, yaourt grec' },
      { why: 'Calcium — des os solides',              foods: 'Laitages, sardines, amandes, brocoli, chou kale, eaux minérales riches en calcium' },
      { why: 'Oméga-3 — cœur, humeur, inflammation',  foods: 'Sardines, maquereau, saumon, graines de lin, noix, huile de colza' },
      { why: 'Fibres — glycémie et satiété',          foods: 'Avoine, quinoa, pain complet, lentilles, légumes, fruits entiers' },
      { why: 'Phytoestrogènes — en douceur',          foods: 'Soja (tofu, edamame, lait de soja), graines de lin moulues, pois chiches' },
      { why: 'Magnésium — sommeil et nerfs',          foods: 'Chocolat noir, oléagineux, légumes verts, banane, céréales complètes' },
      { why: 'Vitamine D — pour fixer le calcium',    foods: 'Poissons gras, jaune d\'œuf, 15 min de lumière du jour ; supplément sur avis médical' },
    ],
    limit: [
      'Alcool et caféine en soirée (sommeil, bouffées de chaleur)',
      'Sucres rapides et produits ultra-transformés (pics de glycémie, fringales)',
      'Plats très épicés et boissons très chaudes si tu as des bouffées de chaleur',
    ],
    sport: [
      'Renforcement musculaire 2 à 3 fois par semaine — le levier n°1 contre la fonte musculaire',
      'Activités avec impact modéré (marche rapide, danse, escaliers) pour stimuler les os',
      'Yoga, Pilates ou respiration : utiles pour le sommeil et le stress',
    ],
    // ≤ 160 caractères : la route /api/health-report tronque le champ « condition » à 200
    aiNote: "Périménopause : protéines ≈1,5 g/kg, calcium, vit. D, oméga-3, fibres, renfo musculaire ; cite des aliments à privilégier ; pas de déficit sévère.",
  },

  menopause: {
    value:     'menopause',
    label:     'Ménopause',
    short:     'Métabolisme ajusté (−5 %), protéines renforcées, calcium 1 200 mg/j',
    bmrFactor: 0.95,
    protPerKg: 1.6,
    banner: {
      title: 'Mode Ménopause activé',
      body:  "Après la ménopause, le métabolisme ralentit légèrement et la masse musculaire comme la densité osseuse demandent plus d'attention. Waty ajuste tes calories (−5 % sur le métabolisme de base), renforce tes protéines et te propose des aliments riches en calcium, vitamine D et oméga-3. Un suivi médical reste la référence.",
    },
    waty: "La ménopause n'est pas une panne, c'est un nouveau réglage. Je baisse légèrement tes besoins, j'augmente tes protéines, et je mets le paquet sur le calcium, la vitamine D et le renforcement musculaire : c'est ce qui protège le mieux tes muscles, tes os et ton cœur.",
    macroNotes: [
      'Ménopause : métabolisme de base ajusté de −5 %, protéines ≈ 1,6 g/kg pour préserver muscles et os',
      'Calcium 1 200 mg/j et vitamine D : laitages, sardines, amandes, légumes verts',
      'Déficit modéré uniquement : un régime strict accélère la perte musculaire à cette période',
    ],
    favor: [
      { why: 'Protéines — préserver muscles et os',   foods: 'Poisson, œufs, volaille, tofu, légumineuses, fromage blanc, yaourt grec' },
      { why: 'Calcium — 1 200 mg/j',                  foods: 'Laitages, sardines avec arêtes, amandes, brocoli, chou kale, eaux riches en calcium' },
      { why: 'Vitamine D — fixation du calcium',      foods: 'Poissons gras, jaune d\'œuf, lumière du jour ; supplément souvent utile, sur avis médical' },
      { why: 'Oméga-3 — cœur et inflammation',        foods: 'Sardines, maquereau, saumon, graines de lin, noix, huile de colza' },
      { why: 'Fibres — glycémie, cholestérol, transit', foods: 'Avoine, légumineuses, légumes, fruits entiers, pain complet' },
      { why: 'Phytoestrogènes',                       foods: 'Soja (tofu, edamame), graines de lin moulues, pois chiches, lentilles' },
      { why: 'Antioxydants et potassium — tension',   foods: 'Fruits rouges, légumes colorés, banane, avocat, haricots' },
    ],
    limit: [
      'Sel en excès (tension) et alcool (os, sommeil, bouffées de chaleur)',
      'Sucres rapides et produits ultra-transformés (graisse abdominale, cholestérol)',
      'Caféine en fin de journée et repas très copieux le soir',
    ],
    sport: [
      'Renforcement musculaire 2 à 3 fois par semaine — priorité absolue pour muscles et os',
      'Activités en charge (marche rapide, randonnée, montée d\'escaliers) pour la densité osseuse',
      'Équilibre et mobilité (yoga, Pilates, tai-chi) pour prévenir les chutes et garder la souplesse',
    ],
    // ≤ 160 caractères : la route /api/health-report tronque le champ « condition » à 200
    aiNote: "Ménopause : MB −5 %, protéines ≈1,6 g/kg, calcium 1200 mg, vit. D, oméga-3, renfo musculaire et os ; cite des aliments à privilégier ; pas de déficit sévère.",
  },
}

/** Vrai si la condition du profil est une phase hormonale (périménopause / ménopause). */
export function isHormonalPhase(condition?: string | null): condition is HormonalPhase {
  return condition === 'perimenopause' || condition === 'menopause'
}

/** Infos de la phase, ou null si la condition n'en est pas une. */
export function getHormonalPhase(condition?: string | null): HormonalPhaseInfo | null {
  return isHormonalPhase(condition) ? HORMONAL_PHASES[condition] : null
}
