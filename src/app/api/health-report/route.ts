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
  const person     = s(raw.person,     700)
  const age        = Number(raw.age) || null

  const contextLines = [
    age        ? `Âge : ${age}` : null,
    goal       ? `Objectif déclaré : ${goal}` : null,
    weightGoal ? `Poids cible : ${weightGoal}` : null,
    condition  ? `Conditions : ${condition}` : null,
  ].filter(Boolean).join(' | ')

  const prompt = `Tu es Waty, le coach bien-être de MYTA. Tu rédiges le bilan hebdomadaire d'une personne précise : pas une analyse de chiffres, un accompagnement pour l'aider à comprendre son corps et ses besoins à elle.

QUI EST CETTE PERSONNE : ${person || (contextLines || 'Profil peu renseigné')}
${contextLines && person ? `Compléments : ${contextLines}` : ''}
OBJECTIF CALORIQUE DE L'APP : ${calTarget} kcal/jour

DONNÉES DES 7 DERNIERS JOURS (uniquement ce qui a été noté dans l'app) :
<user_data>
 Couverture : ${coverage || 'inconnue'}
 Nutrition : ${nutrition}
 Sport : ${sport}
 Sommeil : ${sleep}
 Poids : ${weight}
${micros ? ` Micronutriments (carences possibles) : ${micros}` : ''}
</user_data>

CE QUI COMPTE : nutrition, sport et sommeil n'ont de sens qu'au regard de l'âge, du sexe, de la condition physique et de la santé de la personne. Lis chaque donnée à travers ce prisme :
- Grossesse / post-partum / allaitement : récupération, fer, protéines, sommeil fragmenté normal, aucun déficit, aucun objectif poids. Parle de ce que le corps traverse.
- Périménopause / ménopause : métabolisme plus lent, protéines et renfo musculaire, sommeil souvent perturbé, prise de ventre hormonale : explique le mécanisme simplement, dédramatise.
- Tabac ou arrêt du tabac : vitamine C, appétit et sucre qui augmentent à l'arrêt, sommeil, souffle à l'effort ; valorise chaque cigarette en moins ; propose des parades concrètes (collations, respiration, marche).
- Diabète, hypertension, hypothyroïdie, inflammation, intolérances : relie les repas notés aux besoins réels (glucides, sel, iode, oméga-3, gluten/lactose) sans jamais poser de diagnostic ni modifier un traitement.
- Âge et IMC : adapte protéines, récupération, intensité du sport ; un IMC n'est qu'un repère, jamais un jugement.
- Sommeil et hormones : explique le lien sommeil → faim (ghréline/leptine), stress → cortisol → fringales, en une phrase simple quand c'est pertinent.
L'objectif n'est pas de « remplir des objectifs poids » mais d'aider la personne à comprendre son corps, ses hormones, ses besoins spécifiques, et à prendre soin d'elle. Le poids n'est mentionné que si la personne s'est fixé un objectif, et toujours avec douceur.

STRUCTURE (titres courts en gras, 300 à 380 mots) :
1. Une phrase d'accueil personnelle (prénom inconnu : tutoie simplement).
2. **Ton corps cette semaine** : ce que sa situation (âge, condition, santé, tabac) implique concrètement en ce moment, 3-4 phrases pédagogiques.
3. **Assiette** : lecture des repas notés au regard de ses besoins à elle (pas seulement des calories), chiffres réels cités.
4. **Mouvement** : sport noté, ce qui convient à sa situation, ce qu'il faut éviter.
5. **Sommeil et récupération** : nuits notées, lien avec hormones/appétit/énergie si pertinent.
${micros ? '6. **Micronutriments** : carences possibles reliées à sa situation, aliments concrets.\n' : ''}7. **Ce que je te propose** : 3 actions simples pour les 7 prochains jours, adaptées à elle, formulées positivement.
8. Une phrase de clôture encourageante.

RÈGLES :
- Tutoie, ton chaleureux et complice, zéro culpabilisation, zéro jargon médical non expliqué, aucun emoji.
- Cite les chiffres réels (kcal, minutes, heures, kg) quand ils existent.
- Les jours absents sont NON RENSEIGNÉS : ni 0 kcal, ni jeûne, ni nuit blanche. Jamais de total hebdo, de trou calorique ni de dette de sommeil calculés sur les manquants ; raisonne par journée notée. Si la couverture est faible (< 3 journées complètes ou < 3 nuits), dis-le en une phrase sans reproche, puis conseille quand même. N'invente rien.
- Tu n'es pas médecin : pour une condition de santé, tu accompagnes et tu renvoies vers le professionnel qui suit la personne quand c'est utile, sans alarmer.`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1300,
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
