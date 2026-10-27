/**
 * Campagnes e-mail admin : rendu HTML du mail et lien de désinscription signé.
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { escapeHtml } from './admin'

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mytwinapp.fr'

export { SEGMENTS, type Segment } from './campaign-segments'
import type { Segment } from './campaign-segments'

export interface CampaignBody { paragraphs: string[]; cta: string; ctaPath: string }

/** Jeton HMAC pour le lien « ne plus recevoir » (clé service = secret, jamais exposée). */
function secret() { return process.env.EMAIL_UNSUB_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'myta' }
export function unsubToken(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('hex').slice(0, 32)
}
export function unsubValid(userId: string, token: string): boolean {
  const a = Buffer.from(unsubToken(userId)); const b = Buffer.from(String(token ?? ''))
  return a.length === b.length && timingSafeEqual(a, b)
}
export function unsubUrl(userId: string) { return `${APP_URL}/api/email/unsubscribe?u=${userId}&t=${unsubToken(userId)}` }

/** Nettoie / borne le contenu édité par l'admin avant rendu. */
export function normalizeBody(b: any): CampaignBody {
  const paragraphs = (Array.isArray(b?.paragraphs) ? b.paragraphs : String(b?.paragraphs ?? '').split(/\n{2,}/))
    .map((p: any) => String(p ?? '').trim()).filter(Boolean).slice(0, 8)
  const cta = String(b?.cta ?? 'Ouvrir MYTA').trim().slice(0, 60) || 'Ouvrir MYTA'
  let ctaPath = String(b?.ctaPath ?? '/dashboard').trim()
  if (!ctaPath.startsWith('/')) ctaPath = '/dashboard'
  return { paragraphs, cta, ctaPath }
}

/** HTML complet du mail : même coque que les autres e-mails de l'app. */
export function renderCampaign(opts: { subject: string; preheader?: string | null; body: CampaignBody; firstName?: string | null; userId?: string | null }): string {
  const { subject, preheader, body, firstName, userId } = opts
  const greet = firstName ? `Hey ${escapeHtml(firstName)},` : 'Hey,'
  const paras = body.paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#2A2A45">${escapeHtml(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`).join('')
  const unsub = userId ? `<p style="margin:14px 0 0;font-size:11px;color:#A0A0B8;text-align:center"><a href="${unsubUrl(userId)}" style="color:#A0A0B8">Ne plus recevoir ces e-mails</a></p>` : ''
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F6F6FB;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15152A">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` : ''}
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="background:#fff;border-radius:24px;padding:28px 24px;box-shadow:0 10px 30px rgba(45,42,94,0.08)">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;color:#4B47A0;text-transform:uppercase">Waty · MYTA</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.25">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65">${greet}</p>
    ${paras}
    <p style="margin:24px 0 6px"><a href="${APP_URL}${body.ctaPath}" style="display:inline-block;background:#4B47A0;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px">${escapeHtml(body.cta)}</a></p>
    <p style="margin:14px 0 0;font-size:13px;color:#6B6B8A">Waty, ton coach dans MYTA</p>
  </div>
  <p style="margin:18px 0 0;font-size:11px;color:#8A8AA6;text-align:center">MYTA par IDEAFORMA · contact@mytwinapp.fr</p>
  ${unsub}
</div></body></html>`
}
