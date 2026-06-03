import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const { email, category, message } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[support] RESEND_API_KEY manquante')
    return NextResponse.json({ error: 'Configuration email manquante' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'MYTA Signalement <noreply@mytwinapp.fr>',
        to:      ['contact@mytwinapp.fr'],
        subject: `[MYTA] Signalement — ${category}`,
        html: `
          <h2>Nouveau signalement MYTA</h2>
          <p><strong>Catégorie :</strong> ${category}</p>
          <p><strong>Utilisateur :</strong> ${email ?? 'inconnu'}</p>
          <hr />
          <p>${message.replace(/\n/g, '<br/>')}</p>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[support] Resend error:', err)
      return NextResponse.json({ error: 'Échec envoi email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[support]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
