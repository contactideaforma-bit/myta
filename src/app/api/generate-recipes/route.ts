import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const CATEGORY_PROMPTS: Record<string, string> = {
  'anti-inflammatoire': 'recettes anti-inflammatoires à base de saumon, sardines, maquereau, avocat, myrtilles, noix, curcuma, gingembre, épinards, brocoli, huile d\'olive',
  'sans-gluten':        'recettes 100% sans gluten avec riz, quinoa, patate douce, lentilles, maïs, sarrasin, tapioca — sans blé, orge, seigle ni avoine',
  'faible-calories':    'recettes légères de moins de 400 kcal par portion, rassasiantes et savoureuses',
  'rapide':             'recettes prêtes en 20 minutes maximum, simples et délicieuses',
  'cheat-meal':         'recettes gourmandes et indulgentes : burger maison, pizza, pasta crémeuses, desserts généreux',
  'proteinee':          'recettes riches en protéines (plus de 30g par portion) pour la musculation et la récupération',
  'vegetarien':         'recettes végétariennes savoureuses sans viande ni poisson',
  'monde':              'recettes du monde variées : marocain, japonais, mexicain, indien, libanais, thaï',
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? 'rapide'
  const context = CATEGORY_PROMPTS[category] ?? CATEGORY_PROMPTS['rapide']

  const prompt = `Génère 12 recettes ${context}.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour.
Format exact :
[
  {
    "id": "1",
    "titre": "Nom de la recette",
    "description": "Une phrase appétissante de description",
    "temps": 25,
    "portions": 2,
    "calories": 380,
    "difficulte": "Facile",
    "ingredients": ["200g de saumon", "1 citron", "2 gousses d'ail"],
    "etapes": ["Préchauffer le four à 180°C.", "Assaisonner le saumon.", "Cuire 20 min."],
    "photo_keyword": "grilled salmon lemon herbs"
  }
]

Contraintes :
- Titres et descriptions en français uniquement
- photo_keyword en anglais (2-3 mots pour recherche photo de qualité)
- calories = estimation réaliste par portion
- difficulte = "Facile", "Moyen" ou "Avancé"
- 3 à 6 ingrédients
- 3 à 5 étapes claires
- Recettes variées et réalistes`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (msg.content[0] as any).text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array')
    const recipes = JSON.parse(match[0])
    return NextResponse.json({ recipes })
  } catch (err) {
    console.error('[generate-recipes]', err)
    return NextResponse.json({ error: 'Erreur génération recettes' }, { status: 500 })
  }
}
