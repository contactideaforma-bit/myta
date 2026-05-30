import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { calTarget, nutrition, sport, sleep, weight, goal } = await req.json()

  const prompt = `Tu es Waty, la mascotte pastèque kawaii de l'app MYTA — une app de nutrition et sport.
Tu dois faire un rapport de santé bienveillant, constructif et motivant sur les 7 derniers jours de l'utilisateur.

DONNÉES DES 7 DERNIERS JOURS :

🥗 NUTRITION (objectif : ${calTarget} kcal/jour) :
${nutrition}

🏋️ SPORT :
${sport}

🌙 SOMMEIL :
${sleep}

⚖️ POIDS :
${weight}

🎯 OBJECTIF DÉCLARÉ : ${goal}

INSTRUCTIONS POUR LE RAPPORT :
- Commence par féliciter l'effort et l'assiduité si les données sont présentes
- Analyse objectivement chaque domaine (nutrition, sport, sommeil, poids)
- Signale les risques si il y a des excès (trop peu de calories, trop d'effort sans récupération, manque de sommeil chronique)
- Donne 2-3 conseils concrets et actionnables pour la semaine suivante
- Termine par une phrase de motivation personnalisée
- Ton : bienveillant, direct, comme un coach ami qui te veut du bien
- Longueur : 250-350 mots maximum
- Structure avec des emojis pour aérer
- Parle à la 2ème personne (tu/toi)
- Si des données manquent, ne les invente pas — signale juste que c'est à remplir

Génère le rapport maintenant :`

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const report = (msg.content[0] as any).text ?? ''
    return NextResponse.json({ report })
  } catch (err: any) {
    console.error('[health-report]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
