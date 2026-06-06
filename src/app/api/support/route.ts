import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/auth'

const VALID_CATEGORIES = ['Bug technique', 'Erreur de données', 'Problème de paiement', 'Suggestion', 'Autre']

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  // Auth requise — 5 signalements max / heure
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 5)) {
    return NextResponse.json({ error: 'Trop de signalements, réessaie dans 1h' }, { status: 429 })
  }

  try {
    const { email, category, message } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    // Validation catégorie (whitelist)
    const safeCategory = VALID_CATEGORIES.includes(category) ? category : 'Autre'

    // Troncature + échappement HTML
    const safeEmail   = escapeHtml(String(email   ?? '').slice(0, 200))
    const safeMessage = escapeHtml(String(message ?? '').trim().slice(0, 2000))

    if (!process.env.RESEND_API_KEY) {
      console.error('[support] RESEND_API_KEY manquant')
      return NextResponse.json({ error: 'Service indisponible' }, { status: 500 })
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
        subject:  `[Signalement] ${safeCategory}`,
        html: `
          <h2 style="color:#18181b">Nouveau signalement</h2>
          <p><strong>Catégorie :</strong> ${safeCategory}</p>
          <p><strong>Email utilisateur :</strong> ${safeEmail}</p>
          <p><strong>Message :</strong></p>
          <blockquote style="border-left:4px solid #e5e7eb;padding-left:12px;color:#374151;margin:0">
            ${safeMessage.replace(/\n/g, '<br>')}
          </blockquote>
        `,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('[support] Resend error:', JSON.stringify(resendData))
      return NextResponse.json({ error: 'Email non envoyé' }, { status: 500 })
    }

    console.log('[support] Email envoyé:', resendData.id)
    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[support] Exception:', err.message)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
