import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import webpush from 'web-push'
import { normalizePrefs, defaultPrefs, type ReminderProfile } from '@/lib/reminders'

/**
 * /api/notifications — réglages et abonnement push de l'utilisateur connecté.
 *
 *   GET                         → { prefs, timezone, subscribed, defaults }
 *   POST { action: 'subscribe', subscription, timezone }
 *   POST { action: 'unsubscribe' }
 *   POST { action: 'save-prefs', prefs, timezone }
 *   POST { action: 'test' }
 *
 * L'envoi planifié des rappels est fait par /api/notifications/dispatch
 * (appelé toutes les 15 min par Supabase pg_cron).
 */

export const maxDuration = 30

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function initVapid(): boolean {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:contact@mytwinapp.fr',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )
    return true
  }
  return false
}

async function loadProfile(userId: string): Promise<ReminderProfile> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name, goal, weight_kg, condition, health_conditions, prot_target')
    .eq('id', userId)
    .maybeSingle()
  return (data ?? {}) as ReminderProfile
}

function validTimezone(tz: unknown): string {
  if (typeof tz !== 'string' || tz.length > 64) return 'Europe/Paris'
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: tz }); return tz } catch { return 'Europe/Paris' }
}

// ─── GET : réglages actuels ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const userId = auth.userId

  const [profile, { data: row }, { data: sub }] = await Promise.all([
    loadProfile(userId),
    supabaseAdmin.from('notification_prefs').select('prefs, timezone').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('push_subscriptions').select('user_id').eq('user_id', userId).maybeSingle(),
  ])

  return NextResponse.json({
    prefs:      normalizePrefs(row?.prefs, profile),
    defaults:   defaultPrefs(profile),
    timezone:   row?.timezone ?? null,
    saved:      !!row,
    subscribed: !!sub,
    profile:    { goal: profile.goal ?? null, weight_kg: profile.weight_kg ?? null, condition: profile.condition ?? null },
  })
}

// ─── POST : actions ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const userId = auth.userId   // vient du token, jamais du body

  let body: any = {}
  try { body = await req.json() } catch { /* body vide */ }
  const action = body?.action

  try {
    if (action === 'subscribe') {
      const sub = body.subscription
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
        return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
      }
      await supabaseAdmin.from('push_subscriptions').upsert(
        { user_id: userId, subscription: sub, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      // Premier abonnement : réglages par défaut adaptés au profil
      const { data: existing } = await supabaseAdmin
        .from('notification_prefs').select('user_id').eq('user_id', userId).maybeSingle()
      if (!existing) {
        const profile = await loadProfile(userId)
        await supabaseAdmin.from('notification_prefs').insert({
          user_id: userId,
          timezone: validTimezone(body.timezone),
          prefs: defaultPrefs(profile),
        })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'unsubscribe') {
      await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'save-prefs') {
      const profile = await loadProfile(userId)
      const prefs = normalizePrefs(body.prefs, profile)
      const { error } = await supabaseAdmin.from('notification_prefs').upsert(
        { user_id: userId, timezone: validTimezone(body.timezone), prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      if (error) throw error
      return NextResponse.json({ ok: true, prefs })
    }

    if (action === 'test') {
      if (!initVapid()) return NextResponse.json({ error: 'Notifications non configurées' }, { status: 500 })
      const { data } = await supabaseAdmin
        .from('push_subscriptions').select('subscription').eq('user_id', userId).maybeSingle()
      if (!data) return NextResponse.json({ error: 'Aucun appareil abonné' }, { status: 404 })
      try {
        await webpush.sendNotification(
          data.subscription,
          JSON.stringify({ title: 'MYTA', body: 'Les rappels fonctionnent sur cet appareil.', url: '/account', tag: 'test' }),
        )
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)
          return NextResponse.json({ error: 'Abonnement expiré : réactive les rappels' }, { status: 410 })
        }
        throw err
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err: any) {
    console.error('[notifications]', err)
    return NextResponse.json({ error: err?.message ?? 'Erreur' }, { status: 500 })
  }
}
