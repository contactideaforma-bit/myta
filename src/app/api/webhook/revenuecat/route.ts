import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { RC_PRODUCT_TO_PLAN } from '@/lib/revenuecat'

/**
 * Webhook RevenueCat — synchronise les achats in-app iOS vers Supabase.
 *
 * Réplique la logique du webhook Stripe : met à jour
 * profiles.subscription_status + profiles.plan + subscription_end.
 *
 * Sécurité : RevenueCat envoie un header Authorization configuré dans
 * le dashboard (Project > Integrations > Webhooks > Authorization header).
 *   → variable d'env REVENUECAT_WEBHOOK_AUTH
 *
 * L'app_user_id RevenueCat = l'ID utilisateur Supabase (cf. initRevenueCat).
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const auth = req.headers.get('authorization')
  if (!process.env.REVENUECAT_WEBHOOK_AUTH || auth !== process.env.REVENUECAT_WEBHOOK_AUTH) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const event = payload?.event
  if (!event) return NextResponse.json({ received: true })

  const uid       = event.app_user_id as string | undefined
  const type      = event.type as string
  const productId = (event.product_id as string | undefined) ?? ''
  const planId    = RC_PRODUCT_TO_PLAN[productId] ?? null
  const expMs     = event.expiration_at_ms as number | undefined
  const isTrial   = event.period_type === 'TRIAL'

  // Les events de test RevenueCat n'ont pas d'app_user_id réel
  if (!uid || uid.startsWith('$RCAnonymous')) {
    return NextResponse.json({ received: true })
  }

  const endIso = expMs ? new Date(expMs).toISOString() : null

  const update: Record<string, unknown> = {}

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
      update.subscription_status = isTrial ? 'trialing' : 'active'
      if (planId) update.plan = planId
      if (endIso) update.subscription_end = endIso
      break

    case 'CANCELLATION':
      // Auto-renouvellement coupé mais l'accès reste jusqu'à l'expiration.
      update.subscription_status = isTrial ? 'trialing' : 'active'
      if (planId) update.plan = planId
      if (endIso) update.subscription_end = endIso
      break

    case 'BILLING_ISSUE':
      update.subscription_status = 'past_due'
      if (endIso) update.subscription_end = endIso
      break

    case 'EXPIRATION':
    case 'SUBSCRIPTION_PAUSED':
      update.subscription_status = 'canceled'
      if (endIso) update.subscription_end = endIso
      break

    default:
      // TRANSFER, SUBSCRIPTION_EXTENDED, etc. — rien à faire
      return NextResponse.json({ received: true })
  }

  try {
    await supabaseAdmin.from('profiles').update(update).eq('id', uid)
  } catch (err) {
    console.error('[revenuecat webhook]', err)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
