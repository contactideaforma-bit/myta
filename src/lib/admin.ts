/**
 * Espace admin MYTA — réservé aux adresses listées dans ADMIN_EMAILS
 * (variable Vercel, séparées par des virgules). Par défaut : contact@mytwinapp.fr.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './auth'
import { renderEmail } from './email-layout'

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
/** Dernière erreur d'envoi (remontée à l'écran admin pour ne pas chercher dans les logs). */
export let lastEmailError: string | null = null

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  lastEmailError = null
  if (!process.env.RESEND_API_KEY) { lastEmailError = 'RESEND_API_KEY manquante sur Vercel'; console.warn('[admin]', lastEmailError); return false }
  // Expéditeur : le domaine doit être vérifié chez Resend (DNS). EMAIL_FROM permet de le changer sans redéployer le code.
  const from = process.env.EMAIL_FROM ?? 'Waty de MYTA <contact@mytwinapp.fr>'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    if (!res.ok) {
      const txt = await res.text()
      try { lastEmailError = JSON.parse(txt).message ?? txt } catch { lastEmailError = txt }
      console.error('[admin] Resend', txt)
    }
    return res.ok
  } catch (e: any) { lastEmailError = e?.message ?? 'erreur réseau'; console.error('[admin] Resend', e); return false }
}

export function emailShell(title: string, body: string): string {
  // Coque de marque commune (logo, bandeau Waty, pied de page) — voir lib/email-layout.ts
  return renderEmail({ title, bodyHtml: body })
}
