/**
 * GET /api/email/unsubscribe?u=<userId>&t=<jeton>
 * Lien présent dans chaque e-mail de campagne : marque profiles.email_optout = true.
 * Pas d'authentification (le jeton HMAC suffit), réponse HTML minimale.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/admin'
import { unsubValid } from '@/lib/campaigns'

export const dynamic = 'force-dynamic'

function page(title: string, text: string) {
  return new NextResponse(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#F6F6FB;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15152A">
<div style="max-width:480px;margin:0 auto;padding:48px 20px"><div style="background:#fff;border-radius:24px;padding:28px 24px;box-shadow:0 10px 30px rgba(45,42,94,0.08)">
<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;color:#4B47A0;text-transform:uppercase">MYTA</p>
<h1 style="margin:0 0 12px;font-size:20px">${title}</h1><p style="font-size:15px;line-height:1.6;color:#2A2A45">${text}</p></div></div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u') ?? ''
  const t = req.nextUrl.searchParams.get('t') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(u) || !unsubValid(u, t)) return page('Lien invalide', 'Ce lien de désinscription n\'est pas valide ou a expiré.')
  const { error } = await supabaseAdmin.from('profiles').update({ email_optout: true }).eq('id', u)
  if (error) return page('Oups', 'Impossible d\'enregistrer ta demande pour le moment. Écris-nous à contact@mytwinapp.fr.')
  return page('C\'est noté', 'Tu ne recevras plus les e-mails de Waty. Tu peux revenir dans l\'app quand tu veux, ton compte reste actif.')
}
