/**
 * /api/admin/partners — comptes partenaires (collabs) Premium à durée limitée.
 *
 * GET    → liste des partenaires (profil, fin d'accès, codes et utilisations)
 * POST   → { email, name?, days, note? } : crée le compte (ou active un compte
 *          existant), accès Premium 'vip' jusqu'à now + days, e-mail avec mot
 *          de passe provisoire (compte neuf) ou simple notification.
 * PATCH  → { userId, action: 'extend' | 'revoke' | 'resend', days? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, supabaseAdmin, findUserByEmail, tempPassword, sendEmail, emailShell, escapeHtml, lastEmailError } from '@/lib/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mytwinapp.fr'

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'sans limite'
}

export async function GET(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error

  const [{ data: partners }, { data: codes }] = await Promise.all([
    supabaseAdmin.from('profiles')
      .select('id, full_name, plan, subscription_status, access_until, partner_note, partner_since')
      .eq('is_partner', true)
      .order('partner_since', { ascending: false }),
    supabaseAdmin.from('promo_codes_stats').select('*').order('created_at', { ascending: false }),
  ])

  // e-mail, activation (auth) + activité d'usage (comptages seulement, jamais le détail)
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const since7  = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  const count = (table: string, userCol: string, userId: string, dateCol?: string, since?: string) => {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true }).eq(userCol, userId)
    if (dateCol && since) q = q.gte(dateCol, since)
    return q.then(r => r.count ?? 0, () => 0)
  }
  const enriched = await Promise.all((partners ?? []).map(async p => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id)
    const [days30, days7, lastDay, meals30, sessions30, sleeps30, recipes, games30, lastMeal] = await Promise.all([
      count('activity_days', 'user_id', p.id, 'day', since30),
      count('activity_days', 'user_id', p.id, 'day', since7),
      supabaseAdmin.from('activity_days').select('day').eq('user_id', p.id).order('day', { ascending: false }).limit(1).then(r => r.data?.[0]?.day ?? null, () => null),
      count('journal_entries', 'user_id', p.id, 'date', since30),
      count('sessions', 'user_id', p.id, 'session_date', since30),
      count('sleep_log', 'user_id', p.id, 'date', since30),
      count('saved_recipes', 'user_id', p.id),
      count('game_runs', 'user_id', p.id, 'day', since30),
      supabaseAdmin.from('journal_entries').select('date').eq('user_id', p.id).order('date', { ascending: false }).limit(1).then(r => r.data?.[0]?.date ?? null, () => null),
    ])
    const lastSignIn = u?.user?.last_sign_in_at ?? null
    const createdAt  = u?.user?.created_at ?? null
    return {
      ...p, email: u?.user?.email ?? null,
      active: p.subscription_status === 'vip' && (!p.access_until || new Date(p.access_until).getTime() > Date.now()),
      codes: (codes ?? []).filter((c: any) => c.partner_user_id === p.id),
      activity: {
        createdAt, lastSignIn,
        activated: !!lastSignIn,              // s'est connecté au moins une fois
        lastDay, days7, days30,               // jours d'ouverture de l'app
        meals30, sessions30, sleeps30, recipes, games30, lastMeal,
      },
    }
  }))

  return NextResponse.json({ partners: enriched, codes: codes ?? [] })
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
  const email = String(body.email ?? '').trim().toLowerCase()
  const name  = String(body.name ?? '').trim().slice(0, 80)
  const note  = String(body.note ?? '').trim().slice(0, 200)
  const days  = Math.max(1, Math.min(3650, Math.round(Number(body.days) || 90)))
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'E-mail invalide' }, { status: 400 })

  const until = new Date(Date.now() + days * 86_400_000).toISOString()

  // 1. Compte : existant ou créé avec mot de passe provisoire
  let userId: string
  let password: string | null = null
  const existing = await findUserByEmail(email)
  if (existing) {
    userId = existing.id
  } else {
    password = tempPassword()
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: name || undefined, created_by_admin: true },
    })
    if (error || !data.user) return NextResponse.json({ error: `Création impossible : ${error?.message ?? 'inconnue'}` }, { status: 500 })
    userId = data.user.id
  }

  // 2. Profil : Premium offert jusqu'à `until`
  const profilePatch: Record<string, any> = {
    id: userId, plan: 'premium', subscription_status: 'vip', access_until: until,
    is_partner: true, partner_note: note || null, partner_since: new Date().toISOString(),
  }
  if (name) profilePatch.full_name = name
  const { error: pErr } = await supabaseAdmin.from('profiles').upsert(profilePatch, { onConflict: 'id' })
  if (pErr) return NextResponse.json({ error: `Profil : ${pErr.message}` }, { status: 500 })

  // 3. E-mail
  const greet = name ? `Bonjour ${escapeHtml(name)},` : 'Bonjour,'
  const html = password
    ? emailShell('Ton accès Premium MYTA est prêt', `
      <p style="font-size:15px;line-height:1.6">${greet}<br>Ton compte partenaire MYTA est créé, avec l'accès <strong>Premium offert jusqu'au ${fmtDate(until)}</strong>.</p>
      <div style="background:#F6F6FB;border-radius:16px;padding:16px;margin:18px 0">
        <p style="margin:0 0 6px;font-size:12px;color:#6B6B8A;font-weight:700;text-transform:uppercase">Identifiants</p>
        <p style="margin:0;font-size:15px">E-mail : <strong>${escapeHtml(email)}</strong></p>
        <p style="margin:6px 0 0;font-size:15px">Mot de passe provisoire : <strong style="font-family:ui-monospace,Menlo,monospace;letter-spacing:1px">${password}</strong></p>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#4B4B6A">Connecte-toi, puis change ton mot de passe dans <em>Mon compte</em>. L'app est disponible sur l'App Store, Google Play et sur ${APP_URL.replace('https://', '')}.</p>
      <p style="margin:22px 0 0"><a href="${APP_URL}/auth" style="display:inline-block;background:#4B47A0;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Ouvrir MYTA</a></p>`)
    : emailShell('Ton accès Premium MYTA est activé', `
      <p style="font-size:15px;line-height:1.6">${greet}<br>Ton compte MYTA (${escapeHtml(email)}) passe en <strong>Premium offert jusqu'au ${fmtDate(until)}</strong>. Rien à faire : connecte-toi comme d'habitude.</p>
      <p style="margin:22px 0 0"><a href="${APP_URL}/dashboard" style="display:inline-block;background:#4B47A0;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Ouvrir MYTA</a></p>`)
  const sent = await sendEmail(email, password ? 'Ton accès Premium MYTA (identifiants)' : 'Ton accès Premium MYTA est activé', html)

  return NextResponse.json({ ok: true, userId, created: !!password, password, until, emailSent: sent, emailError: sent ? null : lastEmailError })
}

export async function PATCH(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }) }
  const userId = String(body.userId ?? '')
  const action = String(body.action ?? '')
  if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 })

  const { data: p } = await supabaseAdmin.from('profiles').select('id, full_name, access_until, subscription_status').eq('id', userId).single()
  if (!p) return NextResponse.json({ error: 'Partenaire introuvable' }, { status: 404 })
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = u?.user?.email ?? null

  if (action === 'extend') {
    const days = Math.max(1, Math.min(3650, Math.round(Number(body.days) || 30)))
    const base = p.access_until && new Date(p.access_until).getTime() > Date.now() ? new Date(p.access_until) : new Date()
    const until = new Date(base.getTime() + days * 86_400_000).toISOString()
    await supabaseAdmin.from('profiles').update({ subscription_status: 'vip', plan: 'premium', access_until: until, is_partner: true }).eq('id', userId)
    if (email) await sendEmail(email, 'Ton accès Premium MYTA est prolongé', emailShell('Accès prolongé', `<p style="font-size:15px;line-height:1.6">Ton accès Premium MYTA est prolongé <strong>jusqu'au ${fmtDate(until)}</strong>.</p>`))
    return NextResponse.json({ ok: true, until })
  }
  if (action === 'revoke') {
    await supabaseAdmin.from('profiles').update({ subscription_status: 'canceled', access_until: new Date().toISOString() }).eq('id', userId)
    await supabaseAdmin.from('promo_codes').update({ active: false }).eq('partner_user_id', userId)
    return NextResponse.json({ ok: true })
  }
  if (action === 'resend') {
    if (!email) return NextResponse.json({ error: 'Pas d\'e-mail' }, { status: 400 })
    const password = tempPassword()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const sent = await sendEmail(email, 'Nouveau mot de passe provisoire MYTA', emailShell('Nouveau mot de passe provisoire', `
      <p style="font-size:15px;line-height:1.6">Voici un nouveau mot de passe provisoire pour <strong>${escapeHtml(email)}</strong> :</p>
      <p style="font-size:20px;font-family:ui-monospace,Menlo,monospace;letter-spacing:1px;background:#F6F6FB;border-radius:12px;padding:12px 16px;display:inline-block">${password}</p>
      <p style="font-size:14px;color:#4B4B6A">Change-le dès ta prochaine connexion dans <em>Mon compte</em>.</p>`))
    return NextResponse.json({ ok: true, password, emailSent: sent, emailError: sent ? null : lastEmailError })
  }
  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
