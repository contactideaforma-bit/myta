import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, category, message } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[support] RESEND_API_KEY manquant')
      return NextResponse.json({ error: 'RESEND_API_KEY non configuré' }, { status: 500 })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:     'MYTA Signalement <onboarding@resend.dev>',
        to:       ['contact@mytwinapp.fr'],
        reply_to: email ?? 'contact@mytwinapp.fr',
        subject:  `[Signalement] ${category ?? 'Inconnu'}`,
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
      console.error('[support] Resend error:', JSON.stringify(resendData))
      return NextResponse.json({ error: 'Email non envoyé', detail: resendData }, { status: 500 })
    }

    console.log('[support] Email envoyé:', resendData.id)
    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[support] Exception:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
