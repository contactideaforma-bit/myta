import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, checkRateLimit } from '@/lib/auth'

export const maxDuration = 60

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 5)) {
    return NextResponse.json({ error: 'Trop de requêtes — réessaie dans 1h' }, { status: 429 })
  }
  const { calTarget, nutrition, sport, sleep, weight, goal, condition, weightGoal, age } = await req.json()

  const contextLines = [
    age          ? `Âge : ${age}` : null,
    goal         ? `Objectif déclaré : ${goal}` : null,
    weightGoal   ? `Poids cible : ${weightGoal}` : null,
    condition    ? `Conditions : ${condition}` : null,
  ].filter(Boolean).join(' | ')

  const prompt = `Tu es Waty, la mascotte coach de MYTA. Tu dois rédiger un bilan de santé personnalisé, bienveillant et ultra-pertinent.

PROFIL UTILISATEUR : ${contextLines || 'Non renseigné'}
OBJECTIF CALORIQUE : ${calTarget} kcal/jour

DONNÉES DES 7 DERNIERS JOURS :
📊 Nutrition : ${nutrition}
🏋️ Sport : ${sport}
😴 Sommeil : ${sleep}
⚖️ Poids : ${weight}

CONSIGNES DE RÉDACTION :
- Tutoie l'utilisateur
- Sois précis et concret : cite les chiffres réels (calories, durées, poids)
- Adapte le ton aux conditions de santé si présentes (ex: diabète → parle glycémie, gluten → alternatives sans gluten)
- Si poids cible : commente la progression vers cet objectif
- Structure : 1 phrase d'intro motivante → analyse nutrition → analyse sport → analyse sommeil → 2 conseils actionnables → 1 phrase de motivation finale
- Maximum 220 mots, emojis pour aérer
- Ne mentionne pas les données manquantes sauf si c'est critique`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 700,
          messages: [{ role: 'user', content: prompt }],
        })
        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        console.error('[health-report]', err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
