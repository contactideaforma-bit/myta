import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { STRIPE_PLANS } from '@/lib/stripe-plans'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/family/invite — créer et envoyer une invitation
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const role  = body.role

  if (!email || !['partner', 'child'].includes(role)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  // Récupérer le profil du propriétaire
  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('plan, subscription_status, family_owner_id')
    .eq('id', auth.userId)
    .single()

  if (!owner) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  // Seul un propriétaire (pas membre d'une famille) peut inviter
  if (owner.family_owner_id) {
    return NextResponse.json({ error: 'Seul le titulaire du forfait peut inviter des membres' }, { status: 403 })
  }

  // Abonnement actif requis
  const activeStatuses = ['trialing', 'active', 'vip']
  if (!activeStatuses.includes(owner.subscription_status ?? '')) {
    return NextResponse.json({ error: 'Abonnement actif requis' }, { status: 403 })
  }

  // Vérifier les limites du plan
  const planConfig    = STRIPE_PLANS[owner.plan as keyof typeof STRIPE_PLANS]
  const maxAdults     = planConfig?.maxAdults   ?? 1
  const maxChildren   = planConfig?.maxChildren ?? 0

  const { data: currentMembers } = await supabaseAdmin
    .from('profiles')
    .select('family_role')
    .eq('family_owner_id', auth.userId)

  const currentPartners = (currentMembers ?? []).filter(m => m.family_role === 'partner').length
  const currentChildren = (currentMembers ?? []).filter(m => m.family_role === 'child').length

  if (role === 'partner' && currentPartners >= maxAdults - 1) {
    return NextResponse.json({ error: 'Nombre maximum de partenaires atteint pour ce forfait' }, { status: 400 })
  }
  if (role === 'child' && currentChildren >= maxChildren) {
    return NextResponse.json({ error: 'Nombre maximum d\'enfants atteint pour ce forfait' }, { status: 400 })
  }

  // Vérifier qu'il n'y a pas d'invite en attente pour ce même email
  const { data: existing } = await supabaseAdmin
    .from('family_invites')
    .select('id')
    .eq('owner_id', auth.userId)
    .eq('invited_email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Une invitation est déjà en attente pour cet email' }, { status: 409 })
  }

  // Créer l'invitation
  const { data: invite, error: insertErr } = await supabaseAdmin
    .from('family_invites')
    .insert({
      owner_id:      auth.userId,
      invited_email: email,
      role,
    })
    .select('id, token')
    .single()

  if (insertErr || !invite) {
    console.error('[family/invite]', insertErr)
    return NextResponse.json({ error: 'Erreur lors de la création de l\'invitation' }, { status: 500 })
  }

  // Envoyer l'email via Resend
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/family/accept?token=${invite.token}`

  const roleLabel = role === 'child' ? 'enfant' : 'partenaire'
  const emailHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Invitation MYTA</title></head>
<body style="margin:0;padding:0;background:#f0f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px">
      <table role="presentation" style="max-width:520px;margin:0 auto;width:100%">
        <tr><td style="text-align:center;padding-bottom:28px">
          <img src="https://mytwinapp.fr/logo_my_twin_app.png" alt="MYTA" width="140" style="display:block;margin:0 auto">
        </td></tr>
        <tr><td style="background:#fff;border-radius:24px;padding:40px 36px;box-shadow:0 4px 32px rgba(75,71,160,.08)">
          <table role="presentation" width="100%" style="margin-bottom:24px">
            <tr><td style="background:linear-gradient(90deg,#4B47A0,#2BA8B0);border-radius:16px;padding:28px 24px;text-align:center">
              <p style="margin:0 0 6px;font-size:32px">👋</p>
              <h1 style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:800">Tu es invité(e) sur MYTA !</h1>
              <p style="margin:0;color:rgba(255,255,255,.85);font-size:14px">Compte ${roleLabel} · Forfait famille</p>
            </td></tr>
          </table>
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65">
            Un membre de ta famille t'invite à rejoindre <strong>MYTA</strong> en tant que <strong>${roleLabel}</strong>.
          </p>
          ${role === 'child'
            ? '<p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.65;background:#f9fafb;border-radius:12px;padding:14px">🍎 Ton compte te donnera accès au <strong>journal alimentaire</strong> MYTA.</p>'
            : '<p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.65;background:#f9fafb;border-radius:12px;padding:14px">✨ Ton compte aura accès à <strong>toutes les fonctionnalités</strong> du forfait.</p>'
          }
          <table role="presentation" width="100%" style="margin-bottom:24px">
            <tr><td style="text-align:center">
              <a href="${acceptUrl}" style="display:inline-block;padding:16px 44px;background:linear-gradient(90deg,#4B47A0,#2BA8B0);color:#fff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px">
                Rejoindre la famille →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
            Ce lien expire dans 7 jours. Si tu n'as pas de compte MYTA, tu en créeras un lors de l'acceptation.
          </p>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">MYTA · My Twin App · contact@mytwinapp.fr</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Waty de MYTA <contact@mytwinapp.fr>',
        to:      [email],
        subject: `👋 Tu es invité(e) à rejoindre MYTA en famille !`,
        html:    emailHtml,
      }),
    })
  } catch (emailErr) {
    console.error('[family/invite] Erreur envoi email:', emailErr)
    // Ne pas bloquer — l'invite est créée, l'email peut être renvoyé
  }

  return NextResponse.json({ success: true, inviteId: invite.id })
}
