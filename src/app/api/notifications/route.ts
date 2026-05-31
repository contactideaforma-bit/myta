import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import webpush from 'web-push'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Initialiser VAPID à l'intérieur du handler pour éviter l'erreur au build
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:contact@mytwinapp.fr',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }
  // Cron : vérification par secret header (pas de token utilisateur)
  const body = await req.json()
  const { subscription, action } = body

  if (action === 'cron') {
    const secret = req.headers.get('x-cron-secret')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Traitement cron — pas besoin d'auth utilisateur
    const type = req.nextUrl.searchParams.get('type') ?? 'journal'
    const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('user_id, subscription')
    if (!subs?.length) return NextResponse.json({ sent: 0 })
    const messages: Record<string, { title: string; body: string }> = {
      journal:  { title: '🥗 MYTA — Journal alimentaire', body: "N'oublie pas de noter ton repas !" },
      sport:    { title: '🏋️ MYTA — Séance du jour',    body: 'Lance le timer Tabata ! 💪' },
      bilan:    { title: '📊 MYTA — Bilan de la semaine', body: 'Ton bilan est prêt !' },
      poids:    { title: '⚖️ MYTA — Pesée du matin',    body: 'Note ton poids pour suivre ta progression !' },
    }
    const msg = messages[type] ?? messages.journal
    let sent = 0
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

  // Autres actions : vérifier le token utilisateur
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const userId = auth.userId  // Vient du token, pas du body

  try {
    const ignoreBody = subscription  // déjà lu

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
