import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, checkRateLimit } from '@/lib/auth'
import { checkAiQuota } from '@/lib/ai-guard'

export const maxDuration = 60

const client = new Anthropic()

const CATEGORY_PROMPTS: Record<string, string> = {
  'anti-inflammatoire': 'anti-inflammatoires riches en omega-3 et antioxydants',
  'sans-gluten':        '100% sans gluten',
  'faible-calories':    'legeres moins de 400 kcal par portion',
  'rapide':             'rapides pretes en 20 minutes maximum',
  'cheat-meal':         'gourmandes burger pizza pasta desserts',
  'proteinee':          'riches en proteines minimum 30g par portion',
  'vegetarien':         'vegetariennes sans viande ni poisson',
  'monde':              'du monde marocain japonais mexicain indien thai',
}

function cleanJSON(text: string): string {
  // Enlever les blocs markdown
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  // Trouver le tableau JSON
  const start = clean.indexOf('[')
  const end   = clean.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array found')
  return clean.slice(start, end + 1)
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 15)) {
    return NextResponse.json({ error: 'Trop de requêtes — réessaie dans 1h' }, { status: 429 })
  }
  // Vérification quota IA selon le plan d'abonnement
  const aiCheck = await checkAiQuota(auth.userId, 'recipe')
  if (!aiCheck.allowed) return aiCheck.error!
  // Validation catégorie + troncature keywords
  const rawCategory = req.nextUrl.searchParams.get('category') ?? ''
  const category    = Object.keys(CATEGORY_PROMPTS).includes(rawCategory) ? rawCategory : ''
  const keywords    = (req.nextUrl.searchParams.get('keywords') ?? '').slice(0, 200)

  let context = ''
  if (keywords && category) {
    context = `${CATEGORY_PROMPTS[category]} avec ces ingredients: ${keywords}`
  } else if (keywords) {
    context = `utilisant ces ingredients: ${keywords}`
  } else if (category) {
    context = CATEGORY_PROMPTS[category]
  } else {
    context = 'rapides et savoureuses'
  }

  const keywordsNote = keywords
    ? `IMPORTANT: Les recettes DOIVENT utiliser: ${keywords}`
    : ''

  const prompt = `Tu es un chef cuisinier. Genere exactement 4 recettes ${context}.
${keywordsNote}

Reponds UNIQUEMENT avec du JSON valide, rien d'autre, pas de markdown.
Format:
[{"id":"1","titre":"Nom","description":"Description courte.","temps_prep":10,"temps_cuisson":15,"temps":25,"portions":2,"calories":350,"proteines":25,"glucides":30,"lipides":10,"difficulte":"Facile","ustensiles":["poele"],"ingredients":[{"qte":"200g","nom":"saumon","note":"sans peau"},{"qte":"2","nom":"citrons","note":""},{"qte":"1 c.s.","nom":"huile olive","note":""}],"etapes":[{"num":1,"titre":"Preparation","detail":"Couper les ingredients.","duree":"5 min","astuce":"Conseil"},{"num":2,"titre":"Cuisson","detail":"Cuire a feu moyen.","duree":"10 min","astuce":"Surveiller"}],"conseils_chef":"Conseil chef.","accompagnements":["Riz"],"photo_keyword":"salmon lemon dish"},{"id":"2",...},{"id":"3",...},{"id":"4",...}]

Regles strictes:
- Exactement 4 recettes dans le tableau
- Titres en francais
- photo_keyword en anglais 3 mots max
- 3 a 5 ingredients
- 2 a 3 etapes
- JSON valide sans apostrophes problematiques dans les cles`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw  = (msg.content[0] as any).text ?? ''
    const json = cleanJSON(raw)
    const recipes = JSON.parse(json)

    if (!Array.isArray(recipes)) throw new Error('Response is not an array')

    return NextResponse.json({ recipes })

  } catch (err: any) {
    console.error('[generate-recipes] error:', err.message)
    return NextResponse.json({ error: 'Erreur lors de la génération des recettes' }, { status: 500 })
  }
}
