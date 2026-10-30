/**
 * Coque commune de tous les e-mails MYTA : logo My Twin App, bandeau coloré avec Waty,
 * contenu, bouton, signature et pied de page. Images servies depuis public/email/ (URLs absolues).
 */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mytwinapp.fr'
const LOGO = `${APP_URL}/email/logo.png`
const WATY = `${APP_URL}/email/waty.png`

export interface EmailLayoutOptions {
  title: string                 // titre affiché dans le bandeau
  preheader?: string | null     // texte d'aperçu dans la boîte de réception
  bodyHtml: string              // paragraphes déjà en HTML
  cta?: { label: string; url: string } | null
  footerExtra?: string          // ex. lien de désinscription (HTML)
  greeting?: string | null      // « Hey Léa, » — omis si null
}

export function renderEmail(o: EmailLayoutOptions): string {
  const cta = o.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 6px"><tr><td style="background:#4B47A0;border-radius:999px"><a href="${o.cta.url}" style="display:inline-block;color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 26px;border-radius:999px">${escapeHtml(o.cta.label)}</a></td></tr></table>`
    : ''
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(o.title)}</title></head>
<body style="margin:0;padding:0;background:#EEF0F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#15152A">
${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(o.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EEF0F7"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px">
  <!-- Logo -->
  <tr><td align="center" style="padding:0 0 16px">
    <a href="${APP_URL}" style="text-decoration:none"><img src="${LOGO}" width="200" alt="My Twin App" style="display:block;width:200px;height:auto;border:0"></a>
  </td></tr>
  <!-- Carte -->
  <tr><td style="background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 12px 34px rgba(45,42,94,0.10)">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <!-- Bandeau avec Waty -->
      <tr><td style="background:#4B47A0;background-image:linear-gradient(135deg,#4B47A0 0%,#6A66C7 60%,#22C55E 160%);padding:22px 24px 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          <td valign="middle" style="padding:0 12px 22px 0">
            <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:1.5px;color:rgba(255,255,255,0.75);text-transform:uppercase">Waty &middot; ton coach MYTA</p>
            <h1 style="margin:0;font-size:24px;line-height:1.2;color:#fff;font-weight:800">${escapeHtml(o.title)}</h1>
          </td>
          <td width="112" valign="bottom" align="right" style="padding:0"><img src="${WATY}" width="104" alt="Waty" style="display:block;width:104px;height:auto;border:0"></td>
        </tr></table>
      </td></tr>
      <!-- Contenu -->
      <tr><td style="padding:26px 24px 22px">
        ${o.greeting ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;font-weight:700">${escapeHtml(o.greeting)}</p>` : ''}
        ${o.bodyHtml}
        ${cta}
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px;border-top:1px solid #EEEFF5;width:100%"><tr>
          <td style="padding-top:16px;font-size:13px;color:#6B6B8A">Waty, ton coach dans <strong style="color:#4B47A0">MYTA</strong> &mdash; nutrition, sport et sommeil, sans pression.</td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
  <!-- Pied -->
  <tr><td align="center" style="padding:18px 10px 0;font-size:11px;line-height:1.7;color:#8A8AA6">
    MYTA &middot; My Twin App &middot; <a href="${APP_URL}" style="color:#4B47A0;text-decoration:none">mytwinapp.fr</a> &middot; App Store &middot; Google Play<br>
    &Eacute;dit&eacute;e par IDEAFORMA &middot; contact@mytwinapp.fr
    ${o.footerExtra ? `<br>${o.footerExtra}` : ''}
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}
