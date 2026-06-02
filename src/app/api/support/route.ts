import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

export const maxDuration = 30

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Email accusé de réception → utilisateur ────────────────────────────────
function confirmationEmailHtml(userName: string, category: string, message: string): string {
  const firstName = userName.split(' ')[0] ?? userName
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px">
      <table role="presentation" style="max-width:520px;margin:0 auto;width:100%">

        <!-- Logo -->
        <tr><td style="text-align:center;padding-bottom:24px">
          <img src="https://mytwinapp.fr/logo_my_twin_app.png" alt="MYTA" width="150"
            style="display:block;margin:0 auto;max-width:150px">
        </td></tr>

        <!-- Carte -->
        <tr><td style="background:#ffffff;border-radius:24px;padding:36px;box-shadow:0 4px 24px rgba(75,71,160,0.08)">

          <!-- Bandeau -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td style="background:linear-gradient(90deg,#4B47A0,#2BA8B0);border-radius:16px;padding:22px 24px;text-align:center">
              <p style="margin:0 0 4px;font-size:26px">✅</p>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:20px;font-weight:800">
                Message bien reçu${firstName ? `, ${firstName}` : ''} !
              </h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px">
                Nous avons bien enregistré ton signalement.
              </p>
            </td></tr>
          </table>

          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6">
            Notre équipe va examiner ton message et te répondre <strong>sous 24h</strong>
            directement à cette adresse email.
          </p>

          <!-- Récapitulatif -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9fafb;border-radius:14px;padding:16px;margin-bottom:20px">
            <tr><td style="padding-bottom:8px">
              <p style="margin:0;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">
                Catégorie
              </p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#374151">${category}</p>
            </td></tr>
            <tr><td style="border-top:1px solid #e5e7eb;padding-top:12px">
              <p style="margin:0;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">
                Ton message
              </p>
              <p style="margin:4px 0 0;font-size:14px;color:#4b5563;line-height:1.5;white-space:pre-wrap">${message}</p>
            </td></tr>
          </table>

          <!-- CTA -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="text-align:center">
              <a href="https://mytwinapp.fr/dashboard"
                style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#4B47A0,#2BA8B0);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px">
                Retour sur l'app →
              </a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center">
          <p style="margin:0 0 4px;font-size:12px;color:#9ca3af">MYTA · My Twin App · IDEAFORMA</p>
          <p style="margin:0;font-size:12px;color:#9ca3af">
            <a href="mailto:contact@mytwinapp.fr" style="color:#9ca3af;text-decoration:underline">contact@mytwinapp.fr</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Route POST ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  try {
    const { category, message, email } = await req.json()
    const userId = auth.userId

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    // Récupérer le profil utilisateur
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, subscription_status')
      .eq('id', userId)
      .single()

    const userName  = profile?.full_name ?? 'Utilisateur inconnu'
    const subStatus = profile?.subscription_status ?? 'unknown'
    const date      = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })

    // ── Email 1 : notification admin ──────────────────────────────────────
    const adminEmail = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'MYTA Support <support@mytwinapp.fr>',
        to:      ['contact@mytwinapp.fr'],
        replyTo: email ?? 'noreply@mytwinapp.fr',
        subject: `🚨 [MYTA] ${category} — ${userName}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="background:linear-gradient(90deg,#4B47A0,#2BA8B0);border-radius:12px;padding:20px;margin-bottom:24px">
              <h1 style="color:white;margin:0;font-size:20px">🚨 Nouveau signalement MYTA</h1>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:140px;color:#6b7280;font-size:13px">Utilisateur</td>
                  <td style="padding:8px;font-size:14px">${userName}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#6b7280;font-size:13px">Email</td>
                  <td style="padding:8px;font-size:14px"><a href="mailto:${email}">${email ?? 'Non renseigné'}</a></td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;color:#6b7280;font-size:13px">Catégorie</td>
                  <td style="padding:8px;font-size:14px">${category}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#6b7280;font-size:13px">Abonnement</td>
                  <td style="padding:8px;font-size:14px">${subStatus}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;color:#6b7280;font-size:13px">Date</td>
                  <td style="padding:8px;font-size:14px">${date}</td></tr>
            </table>
            <div style="background:#fafafa;border-left:4px solid #4B47A0;border-radius:8px;padding:16px">
              <p style="font-weight:bold;color:#374151;margin:0 0 8px">Message :</p>
              <p style="color:#4b5563;margin:0;line-height:1.6;white-space:pre-wrap">${message}</p>
            </div>
            <p style="margin-top:20px;font-size:12px;color:#9ca3af;text-align:center">
              MYTA — My Twin App · IDEAFORMA · contact@mytwinapp.fr
            </p>
          </div>
        `,
      }),
    })

    // ── Email 2 : accusé de réception → utilisateur ───────────────────────
    const userConfirm = email?.trim()
      ? fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:    'MYTA Support <support@mytwinapp.fr>',
            to:      [email.trim()],
            subject: `✅ On a bien reçu ton message — MYTA`,
            html:    confirmationEmailHtml(userName, category, message),
          }),
        })
      : Promise.resolve(null)

    // Envoyer les deux en parallèle
    const [adminRes] = await Promise.all([adminEmail, userConfirm])

    if (!adminRes.ok) {
      const err = await adminRes.text()
      console.error('[support] Resend admin error:', err)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[support]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
