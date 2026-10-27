/**
 * POST /api/admin/campaigns/generate — { idea, segment }
 * Waty (Haiku) transforme une consigne ou un mot-clé en e-mail accrocheur :
 * { subject, preheader, body: { paragraphs[], cta, ctaPath } }
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/admin'
import { normalizeBody, SEGMENTS, type Segment } from '@/lib/campaigns'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const client = new Anthropic()

const SEGMENT_CONTEXT: Record<Segment, string> = {
  all:     "tous les adhérents, actifs ou non",
  dormant: "des adhérents qui n'ont pas ouvert l'app depuis au moins 30 jours : l'objectif est de leur donner envie de revenir, sans culpabiliser",
  never:   "des personnes qui ont créé leur compte mais n'ont jamais ouvert l'app : l'objectif est un premier pas simple (noter un repas, dire bonjour à Waty)",
  trial:   "des adhérents en essai ou gratuits, pas encore abonnés : l'objectif est de montrer la valeur du Premium sans forcer",
  premium: "des abonnés Premium, VIP et partenaires : ton de remerciement, nouveautés, conseils de pro",
}

const LINKS = `Chemins possibles pour le bouton (ctaPath) : /dashboard (accueil), /nutrition/journal (journal alimentaire), /sport (séances), /sleep (sommeil), /nutrition/recipes (recettes), /games (mini-jeux), /pricing (offres Premium), /account (mon compte).`

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  let b: any
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
  const idea = String(b.idea ?? '').trim().slice(0, 600)
  const segment = (SEGMENTS.some(s => s.key === b.segment) ? b.segment : 'all') as Segment
  if (!idea) return NextResponse.json({ error: 'Écris une idée ou un mot-clé' }, { status: 400 })

  const prompt = `Tu es Waty, le coach bien-être de l'application MYTA (nutrition, sport, sommeil, mini-jeux, recettes). Tu écris un e-mail de relance aux adhérents.

Destinataires : ${SEGMENT_CONTEXT[segment]}.
Consigne de la fondatrice (à reformuler en version accrocheuse, pas à recopier) : « ${idea} »

Ton : complice et motivant. Tutoiement, phrases courtes, une pointe d'humour légère, concret, zéro jargon, zéro culpabilisation, aucun emoji. Français impeccable.
Contraintes : objet de 6 à 9 mots maximum, qui donne envie d'ouvrir (pas de majuscules criardes, pas de point d'exclamation dans l'objet). Préheader de 1 phrase (≤ 90 caractères) qui complète l'objet. Corps : 2 à 4 paragraphes courts (≤ 45 mots chacun), le premier accroche, le dernier invite à une action simple dans l'app. Tu peux mettre une expression clé en gras avec **…**. Ne commence pas par « Hey » ni par une salutation (elle est ajoutée automatiquement). Signature ajoutée automatiquement aussi.
${LINKS}

Réponds uniquement avec un JSON : {"subject": "...", "preheader": "...", "paragraphs": ["...", "..."], "cta": "texte du bouton (2 à 4 mots)", "ctaPath": "/..."}`

  try {
    const msg = await client.messages.create({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    const text = (msg.content[0] as any)?.text ?? ''
    const m = text.match(/\{[\s\S]*\}/)
    const data = m ? JSON.parse(m[0]) : null
    if (!data?.subject) throw new Error('Réponse inattendue')
    const body = normalizeBody(data)
    return NextResponse.json({ subject: String(data.subject).trim().slice(0, 120), preheader: String(data.preheader ?? '').trim().slice(0, 140), body })
  } catch (e: any) {
    console.error('[campaigns] generate', e)
    return NextResponse.json({ error: 'Génération impossible, réessaie dans un instant' }, { status: 502 })
  }
}
