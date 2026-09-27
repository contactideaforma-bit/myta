import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import {
  normalizePrefs, localParts, dueReminders, buildMessage, waterTimes,
  type ReminderProfile, type DueReminder,
} from '@/lib/reminders'

/**
 * POST /api/notifications/dispatch
 *
 * Appelé toutes les 15 min par Supabase (pg_cron + pg_net, cf.
 * supabase/supabase-notifications.sql) avec `Authorization: Bearer CRON_SECRET`.
 * Vercel Hobby ne permet qu'un cron par jour : c'est pour ça que l'horloge
 * est côté Supabase.
 *
 * Pour chaque utilisateur abonné : calcule les rappels qui tombent dans le
 * quart d'heure en cours (dans SON fuseau), saute ceux devenus inutiles
 * (repas déjà noté, séance déjà faite…), envoie, et journalise pour ne
 * jamais envoyer deux fois le même rappel le même jour.
 */

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest)  { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID manquant' }, { status: 500 })
  }
  webpush.setVapidDetails(
    'mailto:contact@mytwinapp.fr',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  // Abonnés push + leurs réglages
  const [{ data: subs }, { data: prefRows }] = await Promise.all([
    supabaseAdmin.from('push_subscriptions').select('user_id, subscription'),
    supabaseAdmin.from('notification_prefs').select('user_id, timezone, prefs'),
  ])
  if (!subs?.length) return NextResponse.json({ users: 0, sent: 0 })

  const prefByUser = new Map((prefRows ?? []).map(r => [r.user_id as string, r]))
  const now = new Date()
  let sent = 0, skipped = 0, errors = 0

  for (const sub of subs) {
    try {
      const row  = prefByUser.get(sub.user_id)
      const tz   = (row?.timezone as string) || 'Europe/Paris'
      const loc  = localParts(tz, now)
      const slot = Math.floor(loc.minutes / 15) * 15

      // Profil : nécessaire pour les défauts ET les textes personnalisés
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('full_name, goal, weight_kg, condition, health_conditions, prot_target')
        .eq('id', sub.user_id)
        .maybeSingle()
      const profile = (prof ?? {}) as ReminderProfile
      const prefs   = normalizePrefs(row?.prefs, profile)

      const due = dueReminders(prefs, slot, loc.weekday)
      if (!due.length) continue

      // Déjà envoyés aujourd'hui ?
      const { data: logs } = await supabaseAdmin
        .from('notification_log')
        .select('reminder_key')
        .eq('user_id', sub.user_id)
        .eq('local_date', loc.date)
        .in('reminder_key', due.map(d => d.key))
      const already = new Set((logs ?? []).map(l => l.reminder_key))
      const pending = due.filter(d => !already.has(d.key))
      if (!pending.length) continue

      const ctx = await activityToday(sub.user_id, loc.date, tz, pending)

      for (const r of pending) {
        if (shouldSkip(r, ctx)) { skipped++; continue }

        // Journaliser AVANT d'envoyer : un double appel du cron ne peut pas doubler la notif
        const { error: logErr } = await supabaseAdmin
          .from('notification_log')
          .insert({ user_id: sub.user_id, reminder_key: r.key, local_date: loc.date })
        if (logErr) continue   // clé déjà prise par un autre passage

        const times = r.kind === 'water' ? waterTimes(prefs.water) : []
        const msg = buildMessage(r.kind, {
          profile,
          protToday:  ctx.protToday,
          waterIndex: r.kind === 'water' ? times.findIndex(t => `water-${t}` === r.key) : undefined,
          waterCount: r.kind === 'water' ? times.length : undefined,
        })
        await webpush.sendNotification(sub.subscription, JSON.stringify(msg), { TTL: 60 * 60 })
        sent++
      }
    } catch (err: any) {
      errors++
      // Abonnement expiré / révoqué → on le retire
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', sub.user_id)
      } else {
        console.error('[notifications/dispatch]', sub.user_id, err?.message ?? err)
      }
    }
  }

  return NextResponse.json({ users: subs.length, sent, skipped, errors })
}

// ─── Activité du jour (pour ne pas rappeler ce qui est déjà fait) ────────────

interface TodayActivity {
  /** Heures locales (minutes) des entrées du journal d'aujourd'hui */
  mealMinutes: number[]
  protToday:   number
  hasSession:  boolean
  hasWeight:   boolean
}

async function activityToday(
  userId: string, date: string, tz: string, pending: DueReminder[],
): Promise<TodayActivity> {
  const needs = new Set(pending.map(p => p.kind))
  const needJournal = ['breakfast', 'lunch', 'dinner', 'streak'].some(k => needs.has(k as any))

  const [journal, sessions, weights] = await Promise.all([
    needJournal
      ? supabaseAdmin.from('journal_entries').select('created_at, prot').eq('user_id', userId).eq('date', date)
      : Promise.resolve({ data: [] as any[] }),
    needs.has('sport')
      ? supabaseAdmin.from('sessions').select('id').eq('user_id', userId).eq('session_date', date).limit(1)
      : Promise.resolve({ data: [] as any[] }),
    needs.has('weigh')
      ? supabaseAdmin.from('weight_log').select('date').eq('user_id', userId).eq('date', date).limit(1)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const rows = journal.data ?? []
  return {
    mealMinutes: rows
      .filter((r: any) => r.created_at)
      .map((r: any) => localParts(tz, new Date(r.created_at)).minutes),
    protToday:  rows.reduce((s: number, r: any) => s + Number(r.prot ?? 0), 0),
    hasSession: (sessions.data ?? []).length > 0,
    hasWeight:  (weights.data ?? []).length > 0,
  }
}

function shouldSkip(r: DueReminder, a: TodayActivity): boolean {
  switch (r.kind) {
    case 'breakfast':
      return a.mealMinutes.length > 0
    case 'lunch':
    case 'dinner':
      // Un repas noté dans les 3 h précédant le rappel = repas déjà fait
      return a.mealMinutes.some(m => m >= r.atMin - 180)
    case 'streak':
      return a.mealMinutes.length > 0
    case 'sport':
      return a.hasSession
    case 'weigh':
      return a.hasWeight
    default:
      return false
  }
}
