/**
 * Campagnes e-mail admin : rendu HTML du mail et lien de désinscription signé.
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { escapeHtml } from './admin'
import { renderEmail } from './email-layout'

export { APP_URL } from './email-layout'
import { APP_URL } from './email-layout'

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

/** HTML complet du mail : coque de marque (logo, bandeau Waty) + paragraphes + bouton + désinscription. */
export function renderCampaign(opts: { subject: string; preheader?: string | null; body: CampaignBody; firstName?: string | null; userId?: string | null }): string {
  const { subject, preheader, body, firstName, userId } = opts
  const paras = body.paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#2A2A45">${escapeHtml(p).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#15152A">$1</strong>')}</p>`).join('')
  const unsub = userId ? `<a href="${unsubUrl(userId)}" style="color:#A0A0B8">Ne plus recevoir ces e-mails</a>` : ''
  return renderEmail({
    title: subject, preheader, greeting: firstName ? `Hey ${firstName},` : 'Hey,',
    bodyHtml: paras, cta: { label: body.cta, url: `${APP_URL}${body.ctaPath}` }, footerExtra: unsub,
  })
}
