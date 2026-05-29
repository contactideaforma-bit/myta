// ─── Inflammation & Gluten classifier ────────────────────────────────────────

const VERY_INFLAM = [
  'sucre blanc','sucre glace','sucre poudre','sucre raffiné',
  'sirop de glucose','sirop de fructose','glucose-fructose',
  'huile de tournesol','huile de maïs','huile de soja','huile de palme','margarine',
  'jambon fumé','lardons fumés','salami','saucisson','mortadelle',
  'chorizo','pepperoni','bacon','charcuterie',
  'nugget','hamburger','hot dog','kebab',
  'chips','bonbon','confiserie',
  'soda','coca','cola','limonade',
]

const ANTI_INFLAM = [
  'saumon','sardine','maquereau','hareng','anchois',
  "huile d'olive",'huile olive',
  'curcuma','gingembre','cannelle',
  'fraise','framboise','myrtille','mûre','cassis','cerise','groseille','airelle','baie',
  'épinard','brocoli','chou kale','kale','cresson','roquette','mâche',
  'noix','amande','noisette','noix du brésil','noix de cajou','pistache',
  'graine de lin','graine de chia','graine de courge',
  'ail','thé vert','matcha','avocat','patate douce',
  'lentille','pois chiche','haricot rouge','haricot noir',
  'tomate','poivron','betterave',
]

const INFLAM_KW = [
  'bœuf','boeuf','agneau','veau','mouton',
  'lait entier','crème fraîche','crème entière','beurre','fromage',
  'farine blanche','farine de blé','pain blanc','baguette',
  'croissant','viennoiserie','frites','friture','pané',
]

const GLUTEN_KW = [
  'blé','orge','seigle','épeautre','kamut',
  'pain','baguette','pita','naan',
  'farine de blé','farine blanche','farine complète',
  'pâtes','spaghetti','tagliatelle','penne','fusilli','macaroni','linguine','gnocchi',
  'biscuit','gâteau','cake','muffin','cookie','tarte','quiche','pizza',
  'croissant','brioche','viennoiserie','crêpe','gaufre',
  'semoule','boulgour','bulgur','bière',
  'sauce soja','chapelure','panko',
  "flocons d'avoine",'flocons d avoine',
]

export function classifyInflam(name: string): -2 | -1 | 0 | 1 {
  const n = name.toLowerCase()
  if (VERY_INFLAM.some(kw => n.includes(kw))) return -2
  if (ANTI_INFLAM.some(kw => n.includes(kw))) return 1
  if (INFLAM_KW.some(kw => n.includes(kw)))   return -1
  return 0
}

export function hasGluten(name: string): boolean {
  const n = name.toLowerCase()
  return GLUTEN_KW.some(kw => n.includes(kw))
}

export interface InflamScore {
  score: number
  veryInflam: number
  inflam: number
  anti: number
  neutral: number
  total: number
}

export function calcInflamScore(entries: { food_name: string }[]): InflamScore | null {
  if (!entries.length) return null
  let score = 0, veryInflam = 0, inflam = 0, anti = 0, neutral = 0
  for (const e of entries) {
    const lvl = classifyInflam(e.food_name)
    score += lvl
    if      (lvl === -2) veryInflam++
    else if (lvl === -1) inflam++
    else if (lvl ===  1) anti++
    else                 neutral++
  }
  return { score, veryInflam, inflam, anti, neutral, total: entries.length }
}

export function inflamGaugePct(score: number, total: number): number {
  if (!total) return 50
  const clamped = Math.max(-total, Math.min(total, score))
  return Math.round(((clamped + total) / (total * 2)) * 100)
}

export function inflamAdvice(s: InflamScore) {
  if (s.score >= 2)  return { icon: '🌿', cls: 'bg-nutri-light border-nutri/30 text-nutri-dark',   text: 'Excellente journée anti-inflammatoire ! Vos choix alimentaires soutiennent votre santé.' }
  if (s.score >= 1)  return { icon: '✅', cls: 'bg-nutri-light border-nutri/30 text-nutri-dark',   text: 'Bonne journée ! Continuez à privilégier poissons gras, légumes verts et fruits rouges.' }
  if (s.score === 0) return { icon: '⚖️', cls: 'bg-zinc-50 border-zinc-200 text-zinc-600',         text: "Journée neutre. Ajoutez un aliment anti-inflammatoire : saumon, noix, myrtilles ou avocat." }
  if (s.score === -1) return { icon: '⚠️', cls: 'bg-orange-50 border-orange-200 text-orange-700', text: 'Quelques aliments inflammatoires. Compensez avec des légumes verts ou du poisson gras.' }
  return { icon: '🔴', cls: 'bg-red-50 border-red-200 text-red-700', text: 'Score inflammatoire élevé. Limitez charcuteries, sucres raffinés. Ajoutez curcuma, poissons gras ou fruits rouges.' }
}

// ─── Micronutriments (base CIQUAL) ───────────────────────────────────────────
// [vitD_µg, vitC_mg, b12_µg, fe_mg, ca_mg, mg_mg, zn_mg, o3_g, k_mg, b9_µg, iode_µg, se_µg]

export const MICROS_NAMES = ['Vit. D','Vit. C','Vit. B12','Fer','Calcium','Magnésium','Zinc','Oméga-3','Potassium','Folates B9','Iode','Sélénium']
export const MICROS_UNITS = ['µg','mg','µg','mg','mg','mg','mg','g','mg','µg','µg','µg']
export const MICROS_AJR   = [15, 110, 2.4, 14, 1000, 375, 11, 2, 2000, 400, 150, 55]
export const MICROS_COLORS = ['#f97316','#22c55e','#3b82f6','#ef4444','#60a5fa','#8b5cf6','#06b6d4','#0ea5e9','#eab308','#84cc16','#a78bfa','#f59e0b']

const MICROS_DB: Record<string, number[]> = {
  'cq001':[2.2,0,1.1,1.7,53,12,1.3,0.04,126,46,13,32],
  'cq002':[2.2,0,1.1,1.7,53,12,1.3,0.04,126,46,13,32],
  'cq003':[2.0,0,1.0,1.5,50,11,1.2,0.04,120,42,12,30],
  'cq004':[2.2,0,1.0,1.7,53,12,1.3,0.05,126,44,13,30],
  'cq005':[0,0,0.1,0.1,7,10,0.1,0,150,4,4,15],
  'cq006':[3.8,0,2.5,4.6,130,15,2.8,0.09,110,149,25,56],
  'cq010':[0.1,0,0.3,0.7,13,25,0.9,0.03,310,5,5,25],
  'cq011':[0.1,0,0.3,1.0,14,22,2.0,0.05,280,8,5,20],
  'cq012':[0.1,0,2.0,2.5,18,20,4.5,0.04,310,9,5,18],
  'cq013':[0.1,0,2.1,2.0,14,22,4.1,0.03,330,8,5,20],
  'cq014':[0.1,0,0.4,0.7,12,24,1.8,0.04,290,6,5,22],
  'cq015':[0.2,0,2.5,2.0,17,21,3.8,0.1,280,10,5,16],
  'cq016':[0.2,0,1.5,0.9,11,22,2.9,0.03,300,8,5,14],
  'cq017':[0.1,0,0.3,0.9,14,23,1.5,0.04,250,7,5,22],
  'cq020':[11,0,3.2,0.4,19,26,0.5,2.2,363,25,4,36],
  'cq021':[4.0,0,1.8,1.0,16,31,0.6,0.3,285,3,4,90],
  'cq022':[1.2,0,0.9,0.3,20,28,0.4,0.15,350,8,100,43],
  'cq023':[0.5,0,1.2,1.0,60,34,1.1,0.1,185,5,80,38],
  'cq024':[7.5,0,8.9,2.7,382,39,1.8,1.5,397,10,45,50],
  'cq025':[8.0,0,8.7,1.4,13,30,0.7,3.3,314,12,5,44],
  'cq026':[0.5,4,1.5,0.5,35,34,0.9,0.15,310,16,100,25],
  'cq027':[5.0,0,3.0,0.5,20,27,0.6,0.8,350,15,5,30],
  'cq028':[1.5,0,0.8,0.3,20,25,0.4,0.1,340,6,80,35],
  'cq030':[0,0,0,0.4,4,12,0.5,0,35,2,1,7],
  'cq031':[0,0,0,0.8,8,20,1.0,0.01,90,8,1,12],
  'cq032':[0,0,0,1.5,20,26,1.4,0.02,180,10,1,45],
  'cq033':[0,0,0,1.7,22,35,1.6,0.04,200,15,1,48],
  'cq034':[0,0,0,1.4,28,25,0.8,0.02,105,28,5,24],
  'cq035':[0,0,0,2.0,34,68,1.9,0.06,220,37,5,35],
  'cq036':[0,15,0,0.8,10,23,0.4,0.01,480,25,5,1],
  'cq037':[0,0,0,1.5,17,64,1.1,0.15,172,42,3,8],
  'cq038':[0,0,0,3.8,55,135,3.6,0.11,390,60,3,15],
  'cq039':[0,0,0,0.8,14,18,0.5,0.01,120,10,1,8],
  'cq040':[0,0,0,0.9,12,32,0.6,0.02,148,14,2,5],
  'cq041':[0,20,0,0.7,38,23,0.4,0.02,480,22,3,0.5],
  'cq043':[1.5,5,0,7.5,5,14,0.4,0.05,110,100,5,5],
  'cq044':[0,0,0,3.0,52,100,2.4,0.2,350,50,3,12],
  'cq050':[0,56,0,0.8,37,12,0.4,0.1,270,42,3,0.3],
  'cq051':[0,14,0,1.5,90,58,0.9,0.1,790,187,3,1],
  'cq052':[0,189,0,0.7,12,16,0.3,0.06,225,75,3,0.3],
  'cq053':[0,40,0,1.0,90,25,0.6,0.1,340,93,3,0.5],
  'cq054':[0,47,0,0.4,40,16,0.4,0.06,340,28,3,0.4],
  'cq055':[0,8,0,0.4,50,18,0.4,0.05,280,50,5,1],
  'cq056':[0,6,0,0.6,25,12,0.3,0.04,300,60,3,0.4],
  'cq060':[0,2,0,3.3,35,36,1.3,0.09,369,181,3,3],
  'cq061':[0,2,0,2.5,43,48,1.5,0.06,390,172,3,2],
  'cq062':[0,2,0,2.1,61,46,1.2,0.1,380,140,3,2],
  'cq070':[0.1,0.5,0.4,0.1,120,11,0.4,0.03,162,5,14,3],
  'cq071':[0.1,0.5,0.5,0.1,160,15,0.5,0.04,190,7,15,4],
  'cq072':[0.5,0,1.5,0.2,950,32,3.5,0.2,100,9,12,12],
  'cq073':[0.3,0,0.7,0.3,700,28,2.8,0.15,112,7,10,8],
  'cq080':[0,52,0,0.3,11,11,0.1,0.05,195,11,2,0.1],
  'cq081':[0,93,0,0.3,34,17,0.1,0.04,312,25,2,0.2],
  'cq082':[0,10,0,0.1,8,6,0.1,0.06,358,5,2,0.1],
  'cq083':[0,7,0,0.4,12,6,0.1,0.04,170,20,2,0.1],
  'cq084':[0,18,0,0.4,11,12,0.2,0.1,220,8,2,0.1],
  'cq090':[0,0,0,3.1,250,255,3.3,1.7,670,50,3,4],
  'cq091':[0,0,0,2.1,105,171,2.9,9.1,441,66,3,5],
  'cq092':[0,0,0,2.3,62,160,2.7,0.05,600,72,3,19],
}

export interface MicroTotal {
  name: string
  unit: string
  value: number
  ajr: number
  pct: number
  color: string
  hasData: boolean
}

// Map nom normalisé → id CIQUAL pour fallback par nom
const NAME_TO_CQ: Record<string, string> = {
  'oeuf entier cru': 'cq001', 'oeuf dur': 'cq002', 'oeuf a la coque': 'cq003',
  'oeuf au plat': 'cq004', 'blanc d oeuf cru': 'cq005',
  'blanc de poulet cru': 'cq010', 'blanc de poulet cuit vapeur': 'cq011',
  'blanc de poulet grille': 'cq012', 'blanc de poulet roti': 'cq013',
  'cuisse de poulet crue': 'cq014', 'poulet entier roti': 'cq015',
  'escalope de dinde crue': 'cq016', 'escalope de dinde grille': 'cq017',
  'saumon cru': 'cq020', 'saumon grille': 'cq021', 'saumon vapeur': 'cq022',
  'thon en conserve au naturel': 'cq023', 'sardine en conserve a l huile': 'cq024',
  'maquereau cru': 'cq025', 'cabillaud cru': 'cq026', 'cabillaud cuit': 'cq027',
  'crevette cuite': 'cq028',
  'boeuf steak cru': 'cq030', 'boeuf steak grille': 'cq031',
  'boeuf hache cru': 'cq032', 'boeuf hache cuit': 'cq033',
  'porc cote crue': 'cq034', 'porc filet cru': 'cq035',
  'epinard cru': 'cq036', 'lentille cuite': 'cq037', 'pois chiche cuit': 'cq038',
  'haricot vert cuit': 'cq039', 'brocoli cuit': 'cq040', 'tomate crue': 'cq041',
  'foie de veau cru': 'cq043', 'moule cuite': 'cq044',
  'orange': 'cq050', 'brocoli cru': 'cq051', 'poivron rouge cru': 'cq052',
  'chou de bruxelles cuit': 'cq053', 'fraise': 'cq054', 'epinard cuit': 'cq055',
  'kiwi': 'cq056',
  'riz blanc cuit': 'cq060', 'riz complet cuit': 'cq061', 'pates cuites': 'cq062',
  'lait entier': 'cq070', 'lait demi-ecreme': 'cq071',
  'fromage emmental': 'cq072', 'fromage camembert': 'cq073',
  'pomme': 'cq080', 'kiwi jaune': 'cq081', 'banane': 'cq082',
  'poire': 'cq083', 'peche': 'cq084',
  'amande': 'cq090', 'noix': 'cq091', 'graine de chia': 'cq092',
}

function normName(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

export function calcMicros(entries: { food_id: string | number; food_name?: string; quantity: number }[]): MicroTotal[] {
  const totals = new Array(12).fill(0)
  const hasData = new Array(12).fill(false)

  for (const e of entries) {
    const idStr = String(e.food_id)
    // Cherche d'abord par ID direct (aliments cq*)
    let row = MICROS_DB[idStr]

    // Sinon cherche par nom normalisé
    if (!row && e.food_name) {
      const normed = normName(e.food_name)
      const cqId = NAME_TO_CQ[normed]
      if (cqId) row = MICROS_DB[cqId]

      // Dernier recours : cherche une correspondance partielle
      if (!row) {
        const words = normed.split(' ').filter(w => w.length > 3)
        for (const [key, cqid] of Object.entries(NAME_TO_CQ)) {
          if (words.some(w => key.includes(w))) {
            row = MICROS_DB[cqid]
            break
          }
        }
      }
    }

    if (!row) continue
    const ratio = (e.quantity || 100) / 100
    row.forEach((val, i) => {
      totals[i] += val * ratio
      if (val > 0) hasData[i] = true
    })
  }

  return MICROS_NAMES.map((name, i) => ({
    name,
    unit: MICROS_UNITS[i],
    value: Math.round(totals[i] * 10) / 10,
    ajr: MICROS_AJR[i],
    pct: MICROS_AJR[i] > 0 ? Math.min(Math.round((totals[i] / MICROS_AJR[i]) * 100), 150) : 0,
    color: MICROS_COLORS[i],
    hasData: hasData[i],
  }))
}
