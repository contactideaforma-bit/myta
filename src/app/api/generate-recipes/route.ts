import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic()

const CATEGORY_PROMPTS: Record<string, string> = {
  'anti-inflammatoire': 'anti-inflammatoires (saumon, avocat, myrtilles, curcuma, noix, huile d\'olive)',
  'sans-gluten':        'sans gluten (riz, quinoa, patate douce, lentilles, sarrasin)',
  'faible-calories':    'légères moins de 400 kcal par portion',
  'rapide':             'prêtes en 20 min max',
  'cheat-meal':         'gourmandes (burger, pizza, pasta crémeuses, desserts)',
  'proteinee':          'riches en protéines 30g+ par portion',
  'vegetarien':         'végétariennes sans viande ni poisson',
  'monde':              'du monde (marocain, japonais, mexicain, indien, thaï)',
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? ''
  const keywords = req.nextUrl.searchParams.get('keywords') ?? ''

  // Construire le contexte de génération
  let context = ''
  if (keywords && category) {
    const catDesc = CATEGORY_PROMPTS[category] ?? category
    context = `${catDesc}, avec obligatoirement ces ingrédients : ${keywords}`
  } else if (keywords) {
    context = `avec obligatoirement ces ingrédients : ${keywords}`
  } else if (category) {
    context = CATEGORY_PROMPTS[category] ?? CATEGORY_PROMPTS['rapide']
  } else {
    context = CATEGORY_PROMPTS['rapide']
  }

  const prompt = `Chef cuisinier expert. Génère 4 recettes ${context}.
JSON uniquement, sans markdown ni texte autour.
[{"id":"1","titre":"...","description":"...","temps_prep":10,"temps_cuisson":15,"temps":25,"portions":2,"calories":350,"proteines":25,"glucides":30,"lipides":10,"difficulte":"Facile","ustensiles":["poêle"],"ingredients":[{"qte":"200g","nom":"ingrédient","note":""}],"etapes":[{"num":1,"titre":"Étape","detail":"Instructions claires.","duree":"5 min","astuce":"Conseil"}],"conseils_chef":"Conseil.","accompagnements":["Accompagnement"],"photo_keyword":"dish photo keyword"}]
Contraintes : 4 recettes variées entre elles, titres et descriptions en français, photo_keyword en anglais 3 mots max, 4-6 ingrédients, 3-4 étapes concises.${keywords ? `\nLes ingrédients suivants DOIVENT apparaître dans les recettes : ${keywords}` : ''}`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
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
