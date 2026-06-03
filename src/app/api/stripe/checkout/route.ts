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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const { plan, promoCode, referredBy } = await req.json()

    const priceId = plan === 'monthly'
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY

    if (!priceId) {
      return NextResponse.json({ error: `Price ID manquant pour le plan: ${plan}` }, { status: 500 })
    }

    // Paramètres de base de la session Stripe
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: referredBy ? 30 : 3, // 1 mois offert si parrainé
        metadata: { supabase_user_id: user.id, referred_by: referredBy ?? '' },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      metadata: { supabase_user_id: user.id },
    }

    // Gestion du code promo
    if (promoCode?.trim()) {
      // Chercher le code promo actif dans Stripe
      const promoCodes = await stripe.promotionCodes.list({
        code:   promoCode.trim(),
        active: true,
        limit:  1,
      })

      if (promoCodes.data.length === 0) {
        return NextResponse.json({ error: 'Code promo invalide' }, { status: 400 })
      }

      // Appliquer le discount — incompatible avec allow_promotion_codes
      sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }]
    } else {
      // Pas de code pré-rempli : Stripe affiche lui-même un champ promo dans son checkout
      sessionParams.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
