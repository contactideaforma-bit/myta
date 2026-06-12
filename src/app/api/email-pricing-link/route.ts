import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, checkRateLimit } from '@/lib/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/email-pricing-link
 * Envoie à l'utilisateur connecté un email avec le lien direct vers les forfaits.
 * Utilisé par l'app iOS : les achats ne pouvant pas s'afficher dans l'app
 * (Apple 3.1.1), l'email sert de passerelle vers la souscription web.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const userId = auth.userId

  // Anti-spam : 3 envois max par heure
  if (!checkRateLimit(`pricing-email-${userId}`, 3)) {
    return NextResponse.json({ error: 'Trop de demandes, réessaie plus tard.' }, { status: 429 })
  }

  try {
    const [{ data: profile }, { data: authData }] = await Promise.all([
      supabaseAdmin.from('profiles').select('full_name, subscription_status').eq('id', userId).single(),
      supabaseAdmin.auth.admin.getUserById(userId),
    ])

    const email = authData?.user?.email
    if (!email) return NextResponse.json({ error: 'Email introuvable' }, { status: 404 })

    // Déjà abonné → rien à envoyer
    if (['trialing', 'active', 'vip'].includes(profile?.subscription_status ?? '')) {
      return NextResponse.json({ ok: true, alreadySubscribed: true })
    }

    const firstName = profile?.full_name?.split(' ')[0] ?? ''

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'Waty de MYTA <contact@mytwinapp.fr>',
        to:      [email],
        subject: `🚀 ${firstName ? firstName + ', ton' : 'Ton'} essai gratuit MYTA t'attend !`,
        html:    pricingEmailHtml(firstName),
      }),
    })

    if (!res.ok) {
      console.error('[email-pricing-link] Resend:', await res.text())
      return NextResponse.json({ error: "Échec de l'envoi" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[email-pricing-link]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ─── Template email — un seul bouton, zéro friction ──────────────────────────
function pricingEmailHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ton essai gratuit MYTA</title></head>
<body style="margin:0;padding:0;background:#f0f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 20px">
      <table role="presentation" style="max-width:520px;margin:0 auto;width:100%">

        <tr><td style="text-align:center;padding-bottom:28px">
          <img src="https://mytwinapp.fr/logo_my_twin_app.png" alt="MYTA" width="160" style="display:block;margin:0 auto;max-width:160px">
        </td></tr>

        <tr><td style="background:#ffffff;border-radius:24px;padding:40px 36px;box-shadow:0 4px 32px rgba(75,71,160,0.08);text-align:center">

          <p style="margin:0 0 8px;font-size:40px">🚀</p>
          <h1 style="margin:0 0 12px;color:#18181b;font-size:22px;font-weight:800">
            ${firstName ? `${firstName}, plus` : 'Plus'} qu'une étape !
          </h1>
          <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.65">
            Ton compte MYTA est créé ✓<br>
            Clique sur le bouton pour choisir ton forfait et démarrer
            tes <strong>3 jours d'essai gratuit</strong> :
          </p>

          <a href="https://mytwinapp.fr/pricing"
            style="display:inline-block;padding:18px 48px;background:linear-gradient(90deg,#4B47A0,#2BA8B0);color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;border-radius:14px">
            Démarrer mon essai gratuit →
          </a>

          <p style="margin:28px 0 0;font-size:13px;color:#6b7280;line-height:1.6">
            Ensuite, retourne simplement dans ton application —<br>tout sera activé automatiquement ✨
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
            <tr><td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 16px">
              <p style="margin:0;font-size:12px;color:#166534;line-height:1.5">
                🎁 3 jours gratuits · aucun débit avant la fin de l'essai · annulable en 1 clic
              </p>
            </td></tr>
          </table>

        </td></tr>

        <tr><td style="padding:28px 0 0;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">MYTA · My Twin App · IDEAFORMA · Neuilly-sur-Seine</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
