/**
 * Notifications pour l'administratrice : nouvel abonné, etc.
 * 1) ligne dans admin_notifications (cloche de l'espace Collabs)
 * 2) e-mail aux adresses ADMIN_EMAILS
 * 3) push web sur les appareils des comptes admin (si abonnés aux notifications)
 * Jamais bloquant : toute erreur est avalée et journalisée.
 */
import { createClient } from '@supabase/supabase-js'
import { renderEmail, APP_URL } from './email-layout'

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const adminEmails = () => (process.env.ADMIN_EMAILS ?? 'contact@mytwinapp.fr').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface AdminNotice { type: 'new_subscriber' | 'trial_started' | 'churn' | 'info'; title: string; body: string; meta?: Record<string, unknown> }

export async function notifyAdmin(n: AdminNotice): Promise<void> {
  const sb = admin()
  try { await sb.from('admin_notifications').insert({ type: n.type, title: n.title, body: n.body, meta: n.meta ?? null }) } catch (e) { console.warn('[admin-notify] insert', e) }

  // E-mail
  try {
    if (process.env.RESEND_API_KEY) {
      const html = renderEmail({
        title: n.title,
        bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#2A2A45">${esc(n.body)}</p>${n.meta ? `<p style="margin:0;font-size:12px;color:#8A8AA6">${esc(Object.entries(n.meta).map(([k, v]) => `${k} : ${String(v)}`).join(' · '))}</p>` : ''}`,
        cta: { label: 'Ouvrir Collabs', url: `${APP_URL}/admin` },
      })
      await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({ from: process.env.EMAIL_FROM ?? 'Waty de MYTA <contact@mytwinapp.fr>', to: adminEmails(), subject: `[MYTA] ${n.title}`, html }),
      })
    }
  } catch (e) { console.warn('[admin-notify] email', e) }

  // Push web vers les appareils des admins
  try {
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const { data: profs } = await sb.from('profiles').select('id').in('email', adminEmails())
      const ids = (profs ?? []).map(p => p.id)
      if (ids.length) {
        const { data: subs } = await sb.from('push_subscriptions').select('user_id, subscription').in('user_id', ids)
        if (subs?.length) {
          const webpush = (await import('web-push')).default
          webpush.setVapidDetails('mailto:contact@mytwinapp.fr', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
          await Promise.all(subs.map(s => webpush.sendNotification(s.subscription as any, JSON.stringify({ title: n.title, body: n.body, url: '/admin' }), { TTL: 3600 }).catch(() => null)))
        }
      }
    }
  } catch (e) { console.warn('[admin-notify] push', e) }
}

/** Raccourci : nouvel abonnement (Stripe ou stores). */
export async function notifyNewSubscriber(opts: { userId: string; plan?: string | null; source: 'stripe' | 'apple' | 'google' | 'revenuecat'; trial?: boolean }) {
  let email = '', name = ''
  try {
    const sb = admin()
    const { data: u } = await sb.auth.admin.getUserById(opts.userId)
    email = u?.user?.email ?? ''
    const { data: p } = await sb.from('profiles').select('full_name').eq('id', opts.userId).maybeSingle()
    name = p?.full_name ?? ''
  } catch { /* facultatif */ }
  const who = name ? `${name} (${email})` : email || 'un nouvel adhérent'
  const plan = opts.plan ? opts.plan.replace('_', ' ') : 'Premium'
  await notifyAdmin({
    type: opts.trial ? 'trial_started' : 'new_subscriber',
    title: opts.trial ? `Nouvel essai ${plan}` : `Nouvel abonné ${plan}`,
    body: opts.trial ? `${who} vient de démarrer un essai ${plan} via ${opts.source}.` : `${who} vient de s'abonner (${plan}) via ${opts.source}. Bravo.`,
    meta: { plan, source: opts.source, email },
  })
}
