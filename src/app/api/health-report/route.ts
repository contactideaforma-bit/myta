import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { calTarget, nutrition, sport, sleep, weight, goal, condition } = await req.json()

  const prompt = `Tu es Waty, coach de l'app MYTA. Rapport motivant sur 7 jours, 200 mots max, emojis, tutoiement.

NUTRITION (objectif ${calTarget} kcal/j): ${nutrition}
SPORT: ${sport}
SOMMEIL: ${sleep}
POIDS: ${weight}
OBJECTIF: ${goal}${condition ? ` | ${condition}` : ''}

Analyse chaque domaine, donne 2 conseils concrets, termine par une motivation.`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        })
        for await (const chunk of response) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
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
