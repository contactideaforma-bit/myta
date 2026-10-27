/**
 * Espace admin MYTA — réservé aux adresses listées dans ADMIN_EMAILS
 * (variable Vercel, séparées par des virgules). Par défaut : contact@mytwinapp.fr.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './auth'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? 'contact@mytwinapp.fr').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

export function isAdminEmail(email?: string | null): boolean {
  return !!email && adminEmails().includes(email.toLowerCase())
}

export interface AdminAuth { userId: string; email: string; error?: never }
export interface AdminError { userId?: never; email?: never; error: NextResponse }

/** requireAuth + vérification que l'e-mail du compte est admin. */
export async function requireAdmin(req: NextRequest): Promise<AdminAuth | AdminError> {
  const auth = await requireAuth(req)
  if (auth.error) return { error: auth.error }
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(auth.userId)
  const email = data?.user?.email ?? null
  if (error || !isAdminEmail(email)) {
    return { error: NextResponse.json({ error: 'Accès réservé à l\'administration' }, { status: 403 }) }
  }
  return { userId: auth.userId, email: email! }
}

/** Retrouve un utilisateur par e-mail (l'API admin n'a pas de getUserByEmail). */
export async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const target = email.trim().toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 500 })
    if (error || !data?.users?.length) break
    const u = data.users.find(x => (x.email ?? '').toLowerCase() === target)
    if (u) return { id: u.id, email: u.email! }
    if (data.users.length < 500) break
  }
  return null
}

export function tempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`
}

export function promoCode(prefix = 'WATY'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}${Array.from(bytes, b => alphabet[b % alphabet.length]).join('')}`
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Envoi d'e-mail via Resend (même expéditeur que les autres e-mails de l'app). */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) { console.warn('[admin] RESEND_API_KEY manquante'); return false }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: 'Waty de MYTA <contact@mytwinapp.fr>', to: [to], subject, html }),
    })
    if (!res.ok) console.error('[admin] Resend', await res.text())
    return res.ok
  } catch (e) { console.error('[admin] Resend', e); return false }
}

export function emailShell(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F6F6FB;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15152A">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <div style="background:#fff;border-radius:24px;padding:28px 24px;box-shadow:0 10px 30px rgba(45,42,94,0.08)">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;color:#4B47A0;text-transform:uppercase">MYTA · My Twin App</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25">${title}</h1>
    ${body}
  </div>
  <p style="margin:18px 0 0;font-size:11px;color:#8A8AA6;text-align:center">MYTA par IDEAFORMA · contact@mytwinapp.fr</p>
</div></body></html>`
}
