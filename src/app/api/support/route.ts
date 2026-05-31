import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

export const maxDuration = 30

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  try {
    const { category, message, email } = await req.json()
    const userId = auth.userId  // Vient du token, pas du body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    // Récupérer le profil utilisateur pour enrichir le rapport
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, subscription_status')
      .eq('id', userId)
      .single()

    const userName = profile?.full_name ?? 'Utilisateur inconnu'
    const subStatus = profile?.subscription_status ?? 'unknown'
    const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })

    // Envoi via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
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
              <tr><td style="padding:8px;background:#f9fafb;border-radius:6px;font-weight:bold;width:140px;color:#6b7280;font-size:13px">Utilisateur</td>
                  <td style="padding:8px;font-size:14px">${userName}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#6b7280;font-size:13px">Email</td>
                  <td style="padding:8px;font-size:14px"><a href="mailto:${email}">${email ?? 'Non renseigné'}</a></td></tr>
              <tr><td style="padding:8px;background:#f9fafb;border-radius:6px;font-weight:bold;color:#6b7280;font-size:13px">Catégorie</td>
                  <td style="padding:8px;font-size:14px">${category}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#6b7280;font-size:13px">Abonnement</td>
                  <td style="padding:8px;font-size:14px">${subStatus}</td></tr>
              <tr><td style="padding:8px;background:#f9fafb;border-radius:6px;font-weight:bold;color:#6b7280;font-size:13px">Date</td>
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

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('[support] Resend error:', err)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[support]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
