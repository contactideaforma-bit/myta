import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' as any })
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('stripe_customer_id, subscription_status').eq('id', auth.userId).single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ subscription: null })
  }

  try {
    const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, limit: 1, status: 'all' })
    const sub  = subs.data[0]
    if (!sub) return NextResponse.json({ subscription: null })

    const price    = sub.items.data[0]?.price
    const interval = price?.recurring?.interval ?? 'month'
    const amount   = (price?.unit_amount ?? 0) / 100

    return NextResponse.json({
      subscription: {
        id:          sub.id,
        status:      sub.status,
        interval,
        amount,
        start_date:  new Date(sub.start_date * 1000).toISOString(),
        period_end:  new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      }
    })
  } catch (err: any) {
    console.error('[subscription]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
