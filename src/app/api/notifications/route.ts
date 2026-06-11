import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import webpush from 'web-push'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialiser VAPID à l'intérieur des handlers pour éviter l'erreur au build
function initVapid() {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:contact@mytwinapp.fr',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }
}

// ─── Logique cron partagée (GET Vercel + POST manuel) ────────────────────────
async function runCron(type: string): Promise<NextResponse> {
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id, subscription')
  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const today = new Date().toISOString().split('T')[0]
  let sent = 0

  // ── Notification "série en danger" ────────────────────
  // Envoie uniquement aux users qui ont une série active mais rien noté aujourd'hui
  if (type === 'serie') {
    for (const sub of subs) {
      try {
        // Vérifier si l'utilisateur a noté quelque chose aujourd'hui
        const { data: todayEntry } = await supabaseAdmin
          .from('journal_entries')
          .select('id')
          .eq('user_id', sub.user_id)
          .eq('date', today)
          .limit(1)
          .single()

        if (todayEntry) continue // Déjà noté — pas de notif

        // Vérifier s'il a une série active (entrée hier)
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const { data: yesterdayEntry } = await supabaseAdmin
          .from('journal_entries')
          .select('id')
          .eq('user_id', sub.user_id)
          .eq('date', yesterday)
          .limit(1)
          .single()

        if (!yesterdayEntry) continue // Pas de série à protéger

        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: '🔥 Ta série est en danger !',
            body:  "Waty s'inquiète... Note au moins un repas pour protéger ta série aujourd'hui !",
          })
        )
        sent++
      } catch (err: any) {
        if (err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', sub.user_id)
        }
      }
    }
    return NextResponse.json({ sent })
  }

  // ── Autres notifications cron ─────────────────────────
  const messages: Record<string, { title: string; body: string }> = {
    journal:  { title: '🥗 MYTA — Journal alimentaire', body: "N'oublie pas de noter ton repas !" },
    sport:    { title: '🏋️ MYTA — Séance du jour',    body: 'Lance le timer Tabata ! 💪' },
    bilan:    { title: '📊 MYTA — Bilan de la semaine', body: 'Ton bilan est prêt !' },
    poids:    { title: '⚖️ MYTA — Pesée du matin',    body: 'Note ton poids pour suivre ta progression !' },
  }
  const msg = messages[type] ?? messages.journal
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify(msg))
      sent++
    } catch (err: any) {
      if (err.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', sub.user_id)
      }
    }
  }
  return NextResponse.json({ sent })
}

// ─── GET — appelé par les crons Vercel ────────────────────────────────────────
// Vercel envoie automatiquement le header `Authorization: Bearer ${CRON_SECRET}`
// quand la variable d'env CRON_SECRET est définie sur le projet.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  initVapid()
  const type = req.nextUrl.searchParams.get('type') ?? 'journal'
  return runCron(type)
}

// ─── POST — actions utilisateur + déclenchement cron manuel ──────────────────
export async function POST(req: NextRequest) {
  initVapid()
  const body = await req.json()
  const { subscription, action } = body

  // Cron manuel : vérification par secret header (pas de token utilisateur)
  if (action === 'cron') {
    const secret = req.headers.get('x-cron-secret')
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const type = req.nextUrl.searchParams.get('type') ?? 'journal'
    return runCron(type)
  }

  // Autres actions : vérifier le token utilisateur
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const userId = auth.userId  // Vient du token, pas du body

  try {
    // ── Sauvegarder / supprimer une souscription ──
    if (action === 'subscribe') {
      await supabaseAdmin.from('push_subscriptions').upsert(
        { user_id: userId, subscription, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      return NextResponse.json({ ok: true })
    }

    if (action === 'unsubscribe') {
      await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)
      return NextResponse.json({ ok: true })
    }

    // ── Envoyer une notification test ──
    if (action === 'test') {
      const { data } = await supabaseAdmin
        .from('push_subscriptions').select('subscription').eq('user_id', userId).single()
      if (!data) return NextResponse.json({ error: 'No subscription' }, { status: 404 })

      await webpush.sendNotification(
        data.subscription,
        JSON.stringify({ title: 'MYTA 🎉', body: 'Les notifications fonctionnent !' })
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  } catch (err: any) {
    console.error('[notifications]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
