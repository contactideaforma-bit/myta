import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as any,
})

// Client Supabase admin (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const userId = (event.data.object as any)?.metadata?.supabase_user_id

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const uid = session.metadata?.supabase_user_id
      if (uid) {
        await supabaseAdmin.from('profiles').update({
          subscription_status: 'trialing',
          stripe_customer_id:  session.customer as string,
        }).eq('id', uid)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const uid = sub.metadata?.supabase_user_id
      if (uid) {
        await supabaseAdmin.from('profiles').update({
          subscription_status: sub.status,
          subscription_end:    new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', uid)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const uid = sub.metadata?.supabase_user_id
      if (uid) {
        await supabaseAdmin.from('profiles').update({
          subscription_status: 'canceled',
          subscription_end:    new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', uid)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}