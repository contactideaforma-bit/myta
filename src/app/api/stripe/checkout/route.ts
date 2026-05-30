import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as any,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Récupère le token depuis le header Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    // Vérifie le token avec Supabase admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const { plan } = await req.json()

    const priceId = plan === 'monthly'
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY

    if (!priceId) {
      return NextResponse.json({ error: `Price ID manquant pour le plan: ${plan}` }, { status: 500 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 3,
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      metadata: { supabase_user_id: user.id },
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}