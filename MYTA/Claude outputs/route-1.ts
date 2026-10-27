/**
 * /api/admin/codes — codes promo (jours de Premium offerts) rattachés à un partenaire.
 *
 * POST  → { partnerId?, code?, days, maxUses?, expiresAt?, note?, notify? }
 *         code vide = généré (préfixe WATY + 5 caractères). notify = e-mail au partenaire.
 * PATCH → { code, action: 'toggle' | 'send' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, supabaseAdmin, promoCode, sendEmail, emailShell, escapeHtml } from '@/lib/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mytwinapp.fr'

async function partnerEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
  return data?.user?.email ?? null
}

function codeEmail(code: string, days: number, maxUses: number | null, expiresAt: string | null, name: string | null) {
  const limits = [
    maxUses ? `${maxUses} utilisation${maxUses > 1 ? 's' : ''} maximum` : 'utilisations illimitées',
    expiresAt ? `valable jusqu'au ${new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'sans date de fin',
  ].join(' · ')
  return emailShell('Ton code à partager', `
    <p style="font-size:15px;line-height:1.6">${name ? `Bonjour ${escapeHtml(name)},` : 'Bonjour,'}<br>Voici ton code MYTA à partager avec ta communauté. Chaque personne qui l'utilise reçoit <strong>${days} jours de Premium offerts</strong>.</p>
    <p style="text-align:center;margin:22px 0"><span style="display:inline-block;font-size:28px;font-weight:800;letter-spacing:3px;font-family:ui-monospace,Menlo,monospace;background:#F0FDF4;color:#15803D;border:2px dashed #22C55E;border-radius:16px;padding:14px 22px">${code}</span></p>
    <p style="font-size:13px;color:#6B6B8A;text-align:center">${limits}</p>
    <p style="font-size:14px;line-height:1.6;color:#4B4B6A">Comment l'utiliser : dans MYTA, <em>Mon compte → J'ai un code</em>, ou directement sur <a href="${APP_URL}/code?c=${code}" style="color:#4B47A0">${APP_URL.replace('https://', '')}/code?c=${code}</a>. Le code marche aussi pour les nouveaux inscrits après leur création de compte.</p>`)
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }

  const partnerId = body.partnerId ? String(body.partnerId) : null
  const days      = Math.max(1, Math.min(365, Math.round(Number(body.days) || 30)))
  const maxUses   = body.maxUses ? Math.max(1, Math.round(Number(body.maxUses))) : null
  const expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null
  const note      = String(body.note ?? '').trim().slice(0, 200) || null
  let code        = String(body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24)
  if (!code) code = promoCode(String(body.prefix ?? 'WATY'))
  if (code.length < 4) return NextResponse.json({ error: 'Code trop court (4 caractères minimum)' }, { status: 400 })

  const { error } = await supabaseAdmin.from('promo_codes').insert({
    code, partner_user_id: partnerId, days, max_uses: maxUses, expires_at: expiresAt, note, created_by: a.userId,
  })
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Ce code existe déjà' : error.message }, { status: 400 })

  let emailSent = false
  if (body.notify && partnerId) {
    const email = await partnerEmail(partnerId)
    const { data: p } = await supabaseAdmin.from('profiles').select('full_name').eq('id', partnerId).single()
    if (email) emailSent = await sendEmail(email, `Ton code MYTA : ${code}`, codeEmail(code, days, maxUses, expiresAt, p?.full_name ?? null))
  }
  return NextResponse.json({ ok: true, code, emailSent })
}

export async function PATCH(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
  const code = String(body.code ?? '').toUpperCase()
  const { data: c } = await supabaseAdmin.from('promo_codes').select('*').eq('code', code).single()
  if (!c) return NextResponse.json({ error: 'Code introuvable' }, { status: 404 })

  if (body.action === 'toggle') {
    await supabaseAdmin.from('promo_codes').update({ active: !c.active }).eq('code', code)
    return NextResponse.json({ ok: true, active: !c.active })
  }
  if (body.action === 'send') {
    const email = await partnerEmail(c.partner_user_id)
    if (!email) return NextResponse.json({ error: 'Aucun partenaire rattaché' }, { status: 400 })
    const { data: p } = await supabaseAdmin.from('profiles').select('full_name').eq('id', c.partner_user_id).single()
    const sent = await sendEmail(email, `Ton code MYTA : ${code}`, codeEmail(code, c.days, c.max_uses, c.expires_at, p?.full_name ?? null))
    return NextResponse.json({ ok: true, emailSent: sent })
  }
  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
