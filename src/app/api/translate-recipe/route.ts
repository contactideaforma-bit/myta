import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { meal_name, ingredients, instructions } = await req.json()
  if (!meal_name) return NextResponse.json({ error: 'Missing meal_name' }, { status: 400 })

  const prompt = `Tu es un traducteur culinaire. Traduis cette recette en français et convertis les mesures en système métrique.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après.

Format attendu :
{
  "title": "Titre en français",
  "ingredients": [{"name": "nom traduit", "measure": "mesure convertie"}],
  "steps": ["Étape 1.", "Étape 2.", "..."]
}

Règles de conversion :
- 1 cup farine/sucre = 120-150g, liquide = 240ml
- 1 oz = 28g · 1 lb = 450g · 1 tbsp = 1 cuillère à soupe · 1 tsp = 1 cuillère à café
- Températures : convertir °F en °C (350°F → 180°C)
- Garder les quantités arrondies et lisibles

Recette à traduire :
Titre : ${meal_name}
Ingrédients : ${JSON.stringify(ingredients)}
Instructions : ${String(instructions).slice(0, 2500)}`

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text  = (msg.content[0] as any).text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')
    const translation = JSON.parse(match[0])
    return NextResponse.json({ translation })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
