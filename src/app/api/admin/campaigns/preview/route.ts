/**
 * POST /api/admin/campaigns/preview — { subject, preheader, body } → HTML du mail (aperçu dans l'admin)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { normalizeBody, renderCampaign } from '@/lib/campaigns'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  let b: any
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
  const html = renderCampaign({ subject: String(b.subject ?? '').slice(0, 120), preheader: String(b.preheader ?? '').slice(0, 140), body: normalizeBody(b.body), firstName: 'Myriam', userId: a.userId })
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
