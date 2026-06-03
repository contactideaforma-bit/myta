import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, category, message } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'Waty de MYTA <contact@mytwinapp.fr>',
        to:      ['contact@mytwinapp.fr'],
        subject: `[Signalement] ${category ?? 'Inconnu'}`,
        html: `
          <h2 style="color:#18181b">Nouveau signalement</h2>
          <p><strong>Catégorie :</strong> ${category ?? '—'}</p>
          <p><strong>Email utilisateur :</strong> ${email ?? '—'}</p>
          <p><strong>Message :</strong></p>
          <blockquote style="border-left:4px solid #e5e7eb;padding-left:12px;color:#374151;margin:0">
            ${(message ?? '').trim().replace(/\n/g, '<br>')}
          </blockquote>
        `,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('[support] Resend error:', resendData)
      return NextResponse.json({ error: 'Email non envoyé', detail: resendData }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[support]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
