import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, category, message } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'MYTA Signalement <contact@mytwinapp.fr>',
        to:      ['contact@mytwinapp.fr'],
        subject: `[Signalement] ${category ?? 'Inconnu'}`,
        html: `
          <h2>Nouveau signalement</h2>
          <p><strong>Catégorie :</strong> ${category ?? '—'}</p>
          <p><strong>Email utilisateur :</strong> ${email ?? '—'}</p>
          <p><strong>Message :</strong></p>
          <blockquote style="border-left:4px solid #e5e7eb;padding-left:12px;color:#374151">
            ${message.trim().replace(/\n/g, '<br>')}
          </blockquote>
        `,
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[support]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
