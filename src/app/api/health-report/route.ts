import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, checkRateLimit } from '@/lib/auth'
import { checkAiQuota } from '@/lib/ai-guard'

export const maxDuration = 60

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 5)) {
    return NextResponse.json({ error: 'Trop de requêtes — réessaie dans 1h' }, { status: 429 })
  }
  const aiCheck = await checkAiQuota(auth.userId, 'report')
  if (!aiCheck.allowed) return aiCheck.error!

  const raw = await req.json()

  // Troncature de tous les champs pour prévenir l'injection de prompt
  const s = (v: unknown, max: number) => String(v ?? '').slice(0, max)
  const calTarget  = Number(raw.calTarget)  || 2000
  const nutrition  = s(raw.nutrition,  500)
  const sport      = s(raw.sport,      500)
  const sleep      = s(raw.sleep,      200)
  const weight     = s(raw.weight,     200)
  const goal       = s(raw.goal,       100)
  const condition  = s(raw.condition,  200)
  const weightGoal = s(raw.weightGoal, 50)
  const micros     = s(raw.micros,     400)
  const coverage   = s(raw.coverage,   200)
  const age        = Number(raw.age) || null

  const contextLines = [
    age        ? `Âge : ${age}` : null,
    goal       ? `Objectif déclaré : ${goal}` : null,
    weightGoal ? `Poids cible : ${weightGoal}` : null,
    condition  ? `Conditions : ${condition}` : null,
  ].filter(Boolean).join(' | ')

  const prompt = `Tu es Waty, la mascotte coach de MYTA. Tu dois rédiger un bilan de santé personnalisé, bienveillant et ultra-pertinent.

PROFIL UTILISATEUR : ${contextLines || 'Non renseigné'}
OBJECTIF CALORIQUE : ${calTarget} kcal/jour

DONNÉES DES 7 DERNIERS JOURS (uniquement ce qui a été noté dans l'app) :
<user_data>
 Couverture : ${coverage || 'inconnue'}
 Nutrition : ${nutrition}
 Sport : ${sport}
 Sommeil : ${sleep}
 Poids : ${weight}
${micros ? `Micronutriments (carences semaine) : ${micros}` : ''}
</user_data>

CONSIGNES DE RÉDACTION :
- Tutoie l'utilisateur
- Sois précis et concret : cite les chiffres réels (calories, durées, poids)
- Adapte le ton aux conditions de santé si présentes (ex: diabète → parle glycémie, gluten → alternatives sans gluten)
- Si poids cible : commente la progression vers cet objectif
- Si des carences micronutriments sont présentes : mentionne-les concrètement et suggère les aliments pour y remédier
- Structure : 1 phrase d'intro motivante → analyse nutrition → analyse sport → analyse sommeil → ${micros ? 'carences micro si pertinent → ' : ''}2 conseils actionnables → 1 phrase de motivation finale
- Maximum 250 mots, aucun emoji

RÈGLE ESSENTIELLE SUR LES DONNÉES MANQUANTES :
- L'utilisateur ne note pas tout. Un jour absent de la liste est un jour NON RENSEIGNÉ : ce n'est ni un jour à 0 kcal, ni un jeûne, ni une nuit blanche, ni un jour sans sport.
- Ne calcule jamais de total hebdomadaire, de « trou » calorique, de déficit cumulé ni de dette de sommeil à partir des jours manquants. Raisonne par journée renseignée (moyennes par jour noté, par nuit notée).
- Les journées partielles (une seule collation notée) ne sont pas des journées complètes : ne conclus pas à une sous-alimentation à partir d'elles.
- Si la couverture est faible (moins de 3 journées complètes ou moins de 3 nuits), dis-le en une phrase, sans reproche, puis donne quand même des conseils utiles sur ce qui est connu. N'invente aucune donnée et ne bloque jamais le bilan.`

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
