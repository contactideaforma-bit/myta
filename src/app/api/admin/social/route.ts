/**
 * /api/admin/social — descriptions de vidéos pour les réseaux (Instagram, TikTok…)
 * GET  → historique (30 derniers)
 * POST → { video, platform, goal, emojis } : Waty rédige une description prête à coller
 *        (accroche, corps, appel à l'action, 5 hashtags) en deux longueurs, cohérente avec l'app.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin, supabaseAdmin } from '@/lib/admin'
import { MYTA_KNOWLEDGE } from '@/lib/myta-knowledge'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const client = new Anthropic()

const PLATFORMS: Record<string, string> = {
  instagram: "Instagram (Reel) : accroche en première ligne (elle s'affiche avant « plus »), 3 à 6 lignes courtes, retours à la ligne, hashtags à la fin.",
  tiktok:    "TikTok : description très courte (1 à 3 phrases, 150 caractères max hors hashtags), ton direct, hashtags à la fin.",
  both:      "Instagram ET TikTok : une version Instagram (accroche + 3-6 lignes) et une version TikTok (1-3 phrases, 150 caractères max).",
  linkedin:  "LinkedIn : ton fondatrice, 5 à 8 lignes, une idée par ligne, pas de hashtags dans le texte (3 à 5 à la fin), un appel à l'échange.",
}
const GOALS: Record<string, string> = {
  feature:   'présenter une fonctionnalité précise (montrer concrètement ce qu\'elle fait et le bénéfice)',
  discovery: 'faire découvrir MYTA à quelqu\'un qui ne connaît pas (promesse simple, différence avec les autres apps)',
  tip:       'donner un conseil bien-être utile, MYTA n\'arrivant qu\'en fin',
  behind:    'coulisses / fondatrice (histoire, pourquoi, ce qui arrive)',
  promo:     'pousser à l\'inscription ou à une offre (sans inventer de prix)',
}

export async function GET(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  const { data } = await supabaseAdmin.from('social_captions').select('id, video, platform, goal, result, created_at').order('created_at', { ascending: false }).limit(30)
  return NextResponse.json({ history: data ?? [] })
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  let b: any
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
  const video = String(b.video ?? '').trim().slice(0, 1500)
  const platform = PLATFORMS[b.platform] ? String(b.platform) : 'instagram'
  const goal = GOALS[b.goal] ? String(b.goal) : 'feature'
  const emojis = !!b.emojis
  const extra = String(b.extra ?? '').trim().slice(0, 300)
  if (!video) return NextResponse.json({ error: 'Décris ta vidéo en une ou deux phrases' }, { status: 400 })

  const prompt = `Tu es le community manager de MYTA. Tu connais l'application par cœur grâce à la fiche ci-dessous et tu n'inventes JAMAIS une fonctionnalité, un chiffre, un prix ou une promesse qui n'y figure pas.

<fiche_app>
${MYTA_KNOWLEDGE}
</fiche_app>

VIDÉO À ACCOMPAGNER (décrite par la fondatrice) : « ${video} »
PLATEFORME : ${PLATFORMS[platform]}
OBJECTIF : ${GOALS[goal]}.
${extra ? `CONSIGNE SUPPLÉMENTAIRE : ${extra}` : ''}
EMOJIS : ${emojis ? 'autorisés, avec parcimonie (3 max)' : 'aucun'}.

Règles :
- Français impeccable, tutoiement, ton de marque (chaleureux, direct, un peu malicieux, jamais culpabilisant, zéro jargon).
- Parle de ce que montre la vidéo avec les vrais termes de l'app (Waty, Score MYTA, catalogue, journal, bilan…), tels que définis dans la fiche.
- Termine par un appel à l'action simple (lien en bio / télécharge MYTA / commente…).
- Exactement 5 hashtags pertinents, en français quand c'est naturel, dont #MYTA ; pas de hashtag générique vide (#love, #instagood).
- Propose aussi 3 idées de première phrase (accroches) alternatives, courtes.

Réponds uniquement avec un JSON :
{"primary": "texte complet prêt à coller (hashtags inclus à la fin)", "short": "version courte prête à coller (hashtags inclus)", "hooks": ["…", "…", "…"], "hashtags": ["#MYTA", "…", "…", "…", "…"]}`

  try {
    const msg = await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
    const text = (msg.content[0] as any)?.text ?? ''
    const m = text.match(/\{[\s\S]*\}/)
    const data = m ? JSON.parse(m[0]) : null
    if (!data?.primary) throw new Error('Réponse inattendue')
    const result = {
      primary: String(data.primary).trim(),
      short: String(data.short ?? '').trim(),
      hooks: Array.isArray(data.hooks) ? data.hooks.map(String).slice(0, 3) : [],
      hashtags: Array.isArray(data.hashtags) ? data.hashtags.map(String).slice(0, 5) : [],
    }
    await supabaseAdmin.from('social_captions').insert({ video, platform, goal, result, created_by: a.userId })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[social] generate', e)
    return NextResponse.json({ error: 'Génération impossible, réessaie dans un instant' }, { status: 502 })
  }
}
