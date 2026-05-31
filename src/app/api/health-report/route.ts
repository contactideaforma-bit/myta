import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { calTarget, nutrition, sport, sleep, weight, goal, condition } = await req.json()

  const prompt = `Tu es Waty, coach bienveillant de l'app MYTA.
Fais un rapport de santé motivant sur les 7 derniers jours.

DONNÉES :
🥗 NUTRITION (objectif : ${calTarget} kcal/jour) :
${nutrition}

🏋️ SPORT :
${sport}

🌙 SOMMEIL :
${sleep}

⚖️ POIDS :
${weight}

🎯 OBJECTIF : ${goal}
${condition ? `\n⚠️ ${condition}` : ''}

INSTRUCTIONS :
- Félicite l'effort si les données sont présentes
- Analyse nutrition, sport, sommeil, poids
- 2-3 conseils concrets pour la semaine suivante
- Termine par une phrase de motivation
- Ton bienveillant, direct, comme un coach ami
- 200-280 mots maximum
- Emojis pour aérer
- Tutoiement
- Ne pas inventer de données manquantes

Génère le rapport :`

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
    const report = (msg.content[0] as any).text ?? ''
    return NextResponse.json({ report })
  } catch (err: any) {
    console.error('[health-report]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
