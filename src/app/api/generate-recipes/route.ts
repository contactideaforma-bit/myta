import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Augmenter le timeout Vercel à 60s
export const maxDuration = 60

const client = new Anthropic()

const CATEGORY_PROMPTS: Record<string, string> = {
  'anti-inflammatoire': 'anti-inflammatoires à base de saumon, avocat, myrtilles, noix, curcuma, épinards, huile d\'olive',
  'sans-gluten':        '100% sans gluten avec riz, quinoa, patate douce, lentilles, sarrasin',
  'faible-calories':    'légères de moins de 400 kcal par portion, rassasiantes',
  'rapide':             'prêtes en 20 minutes maximum, simples',
  'cheat-meal':         'gourmandes : burger maison, pizza, pasta crémeuses, desserts',
  'proteinee':          'riches en protéines (plus de 30g par portion) pour la musculation',
  'vegetarien':         'végétariennes savoureuses sans viande ni poisson',
  'monde':              'du monde : marocain, japonais, mexicain, indien, thaï',
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? 'rapide'
  const context  = CATEGORY_PROMPTS[category] ?? CATEGORY_PROMPTS['rapide']

  const prompt = `Tu es un chef cuisinier expert. Génère 4 recettes ${context}.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans markdown.
Format exact :
[
  {
    "id": "1",
    "titre": "Nom de la recette",
    "description": "Description courte appétissante.",
    "temps_prep": 10,
    "temps_cuisson": 20,
    "temps": 30,
    "portions": 2,
    "calories": 380,
    "proteines": 28,
    "glucides": 35,
    "lipides": 12,
    "difficulte": "Facile",
    "ustensiles": ["poêle", "spatule"],
    "ingredients": [
      { "qte": "200g", "nom": "filet de saumon", "note": "sans peau" },
      { "qte": "2 c.s.", "nom": "huile d'olive", "note": "" }
    ],
    "etapes": [
      { "num": 1, "titre": "Préparation", "detail": "Instructions claires.", "duree": "5 min", "astuce": "Conseil utile" },
      { "num": 2, "titre": "Cuisson", "detail": "Instructions claires.", "duree": "10 min", "astuce": "Conseil utile" }
    ],
    "conseils_chef": "Conseil principal du chef.",
    "accompagnements": ["Riz", "Salade"],
    "photo_keyword": "salmon lemon garlic"
  }
]

Règles :
- 4 recettes variées en français
- photo_keyword en anglais (3 mots max)
- 4 à 6 ingrédients
- 3 à 4 étapes concises
- Valeurs nutritionnelles réalistes`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text  = (msg.content[0] as any).text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array in response')
    const recipes = JSON.parse(match[0])
    return NextResponse.json({ recipes })
  } catch (err) {
    console.error('[generate-recipes]', err)
    return NextResponse.json({ error: 'Erreur génération recettes' }, { status: 500 })
  }
}
