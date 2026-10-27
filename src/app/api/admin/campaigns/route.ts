/**
 * /api/admin/campaigns
 * GET  → effectifs par segment + historique des campagnes
 * POST → { segment, subject, preheader, body, idea } : envoi à tout le segment (Resend, par lots de 100)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, supabaseAdmin } from '@/lib/admin'
import { normalizeBody, renderCampaign, type Segment, SEGMENTS } from '@/lib/campaigns'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  const [{ data: counts, error }, { data: history }] = await Promise.all([
    supabaseAdmin.rpc('admin_campaign_counts'),
    supabaseAdmin.from('email_campaigns').select('id, segment, idea, subject, recipients, sent, failed, created_at').order('created_at', { ascending: false }).limit(30),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ counts, history: history ?? [] })
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  let b: any
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }

  const segment = String(b.segment ?? '') as Segment
  if (!SEGMENTS.some(s => s.key === segment)) return NextResponse.json({ error: 'Segment inconnu' }, { status: 400 })
  const subject = String(b.subject ?? '').trim().slice(0, 120)
  const preheader = String(b.preheader ?? '').trim().slice(0, 140) || null
  const body = normalizeBody(b.body)
  if (!subject || body.paragraphs.length === 0) return NextResponse.json({ error: 'Objet et texte obligatoires' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY manquante sur Vercel' }, { status: 500 })

  const { data: audience, error } = await supabaseAdmin.rpc('admin_campaign_audience', { p_segment: segment })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const list: { user_id: string; email: string; full_name: string | null }[] = audience ?? []
  if (list.length === 0) return NextResponse.json({ error: 'Aucun destinataire dans ce segment' }, { status: 400 })

  const from = process.env.EMAIL_FROM ?? 'Waty de MYTA <contact@mytwinapp.fr>'
  let sent = 0, failed = 0, lastError: string | null = null
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100).map(r => ({
      from, to: [r.email], subject,
      html: renderCampaign({ subject, preheader, body, firstName: (r.full_name ?? '').split(' ')[0] || null, userId: r.user_id }),
    }))
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify(chunk),
      })
      if (res.ok) sent += chunk.length
      else { failed += chunk.length; const t = await res.text(); try { lastError = JSON.parse(t).message ?? t } catch { lastError = t } }
    } catch (e: any) { failed += chunk.length; lastError = e?.message ?? 'erreur réseau' }
    if (i + 100 < list.length) await new Promise(r => setTimeout(r, 600))   // limite Resend : 2 requêtes / s
  }

  await supabaseAdmin.from('email_campaigns').insert({
    segment, idea: String(b.idea ?? '').slice(0, 500) || null, subject, preheader, body,
    recipients: list.length, sent, failed, created_by: a.userId,
  })
  return NextResponse.json({ ok: failed === 0, recipients: list.length, sent, failed, error: lastError })
}
