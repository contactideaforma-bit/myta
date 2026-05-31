import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

interface FoodResult {
  id: string
  name: string
  nameFr: string
  cat: string
  cal: number
  prot: number
  carb: number
  fat: number
  image_url: string | null
  source: 'usda' | 'off'
}

// ─── USDA FoodData Central ────────────────────────────────────────────────────
async function searchUSDA(query: string): Promise<FoodResult[]> {
  try {
    const apiKey = process.env.USDA_API_KEY ?? 'DEMO_KEY'
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=${apiKey}&dataType=Foundation,SR%20Legacy,Branded`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.foods ?? []).map((f: any) => {
      const nutrients = f.foodNutrients ?? []
      const get = (name: string) =>
        nutrients.find((n: any) =>
          n.nutrientName?.toLowerCase().includes(name.toLowerCase()) &&
          (n.unitName === 'G' || n.unitName === 'KCAL')
        )?.value ?? 0
      return {
        id: `usda_${f.fdcId}`,
        name: f.description ?? '',
        nameFr: '',
        cat: f.foodCategory ?? 'aliment',
        cal: Math.round(get('Energy') || get('energy')),
        prot: Math.round(get('Protein') * 10) / 10,
        carb: Math.round(get('Carbohydrate') * 10) / 10,
        fat: Math.round(get('Total lipid') * 10) / 10,
        image_url: null,
        source: 'usda' as const,
      }
    }).filter((f: FoodResult) => f.cal > 0)
  } catch { return [] }
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────
async function searchOFF(query: string): Promise<FoodResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6&fields=id,product_name,nutriments,image_small_url`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = await res.json()
    return (data.products ?? [])
      .filter((p: any) => p.product_name && p.nutriments?.['energy-kcal_100g'])
      .map((p: any) => ({
        id: `off_${p.id ?? p.code}`,
        name: p.product_name,
        nameFr: '',
        cat: 'produit',
        cal: Math.round(p.nutriments['energy-kcal_100g'] ?? 0),
        prot: Math.round((p.nutriments.proteins_100g ?? 0) * 10) / 10,
        carb: Math.round((p.nutriments.carbohydrates_100g ?? 0) * 10) / 10,
        fat: Math.round((p.nutriments.fat_100g ?? 0) * 10) / 10,
        image_url: p.image_small_url ?? null,
        source: 'off' as const,
      }))
  } catch { return [] }
}

// ─── Traduction Claude Haiku ──────────────────────────────────────────────────
async function translateToFrench(
  items: { id: string; name: string; cat: string }[]
): Promise<Record<string, { nameFr: string; catFr: string }>> {
  if (!items.length) return {}

  // Détecte si un nom a besoin d'être traduit
  const needsTranslation = items.filter(item => {
    const n = item.name.toLowerCase()
    const englishWords = ['raw','cooked','dried','fresh','frozen','whole','sliced',
      'juice','sauce','cream','butter','oil','beef','chicken','pork','fish',
      'bread','cake','milk','egg','fruit','vegetable','bean','nut','seed',
      'sugar','salt','water','rice','wheat','corn','oat','apple','orange']
    return englishWords.some(w => n.includes(w)) || /^[a-zA-Z0-9\s,\-()'%]+$/.test(item.name)
  })

  // Items déjà en français
  const alreadyFr = items.filter(i => !needsTranslation.find(n => n.id === i.id))
  const result: Record<string, { nameFr: string; catFr: string }> = {}
  alreadyFr.forEach(i => { result[i.id] = { nameFr: i.name, catFr: i.cat } })

  if (!needsTranslation.length) return result

  const list = needsTranslation.map((i, idx) => `${idx + 1}. "${i.name}"`).join('\n')

  const prompt = `Traduis ces noms d'aliments en français. JSON uniquement, sans texte autour.
Format : {"1": {"nom": "...", "cat": "..."}, "2": {...}}
Catégories possibles : fruit, légume, viande, poisson, céréale, légumineuse, produit laitier, noix, huile, sucre, plat cuisiné, boisson, produit transformé
Règle : nom court et naturel (ex: "Dragon fruit, raw" → "Fruit du dragon", "Chicken breast, cooked" → "Blanc de poulet cuit")

${list}`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (msg.content[0] as any).text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    const translations = JSON.parse(match[0])
    needsTranslation.forEach((item, idx) => {
      const t = translations[String(idx + 1)]
      result[item.id] = {
        nameFr: t?.nom ?? item.name,
        catFr: t?.cat ?? item.cat,
      }
    })
  } catch {
    needsTranslation.forEach(i => { result[i.id] = { nameFr: i.name, catFr: i.cat } })
  }

  return result
}

// ─── Route GET /api/search-food?q=... ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 50)) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
  }
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) return NextResponse.json({ results: [] })

  // Recherche parallèle USDA + OFF
  const [usdaResults, offResults] = await Promise.all([
    searchUSDA(query),
    searchOFF(query),
  ])

  // Fusion + déduplication
  const seen = new Set<string>()
  const merged: FoodResult[] = []
  for (const food of [...usdaResults, ...offResults]) {
    const key = food.name.toLowerCase().trim().slice(0, 30)
    if (!seen.has(key) && food.cal > 0) {
      seen.add(key)
      merged.push(food)
    }
  }

  const toProcess = merged.slice(0, 12)

  // Traduction française
  const translations = await translateToFrench(
    toProcess.map(f => ({ id: f.id, name: f.name, cat: f.cat }))
  )

  const results = toProcess.map(f => ({
    id: f.id,
    name: translations[f.id]?.nameFr ?? f.name,
    cat: translations[f.id]?.catFr ?? f.cat,
    cal: f.cal,
    prot: f.prot,
    carb: f.carb,
    fat: f.fat,
    image_url: f.image_url,
  }))

  return NextResponse.json({ results })
}
