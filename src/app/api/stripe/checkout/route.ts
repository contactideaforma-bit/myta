import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { ALL_PLAN_IDS, getPriceId, type PlanId } from '@/lib/stripe-plans'

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

    // Validation stricte : 6 nouveaux plans OU legacy monthly/yearly
    let resolvedPlanId: PlanId | null = null
    let priceId: string | null | undefined = null

    if (ALL_PLAN_IDS.includes(plan as PlanId)) {
      // Nouveau système 6 plans
      resolvedPlanId = plan as PlanId
      priceId = getPriceId(resolvedPlanId)
    } else if (plan === 'monthly') {
      // Ancien plan legacy → essentiel par défaut (migration douce)
      priceId = process.env.STRIPE_PRICE_MONTHLY ?? getPriceId('essentiel')
      resolvedPlanId = 'essentiel'
    } else if (plan === 'yearly') {
      priceId = process.env.STRIPE_PRICE_YEARLY ?? getPriceId('premium')
      resolvedPlanId = 'premium'
    } else {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    if (!priceId) {
      return NextResponse.json({ error: 'Configuration tarifaire manquante' }, { status: 500 })
    }

    // ── Changement de forfait : détection automatique côté serveur ──────────
    // Si l'utilisateur a déjà un abonnement actif/trialing, on le met à jour
    // au lieu de créer un 2e abonnement (peu importe ce qu'envoie le client).
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status:   'all',
        limit:    5,
      })
      const activeSub = subs.data.find(s => ['active', 'trialing'].includes(s.status))

      if (activeSub) {
        // Même price → rien à faire
        if (activeSub.items.data[0]?.price?.id === priceId) {
          return NextResponse.json({ redirect: `${process.env.NEXT_PUBLIC_APP_URL}/account?changed=true` })
        }
        await stripe.subscriptions.update(activeSub.id, {
          items: [{ id: activeSub.items.data[0].id, price: priceId }],
          proration_behavior: 'create_prorations',
          cancel_at_period_end: false, // réactive si une résiliation était programmée
          metadata: { myta_plan: resolvedPlanId ?? '' },
        })
        // Mettre à jour le plan en base
        await supabaseAdmin
          .from('profiles')
          .update({ plan: resolvedPlanId })
          .eq('id', user.id)

        return NextResponse.json({ redirect: `${process.env.NEXT_PUBLIC_APP_URL}/account?changed=true` })
      }
      // Pas d'abo actif → continuer vers checkout normal
    }

    // Validation du code parrainage : doit exister, ne pas être le sien, et l'user ne doit pas déjà avoir été parrainé
    let validReferredBy = ''
    if (referredBy?.trim()) {
      const code = String(referredBy).trim().toUpperCase().slice(0, 20)

      // Vérifier que le code existe et appartient à un autre utilisateur
      const { data: referrer } = await supabaseAdmin
        .from('profiles').select('id').eq('referral_code', code).single()

      // Vérifier que l'utilisateur n'a pas déjà été parrainé
      const { data: selfProfile } = await supabaseAdmin
        .from('profiles').select('referred_by').eq('id', user.id).single()

      const isValidReferrer  = !!referrer && referrer.id !== user.id
      const alreadyReferred  = !!(selfProfile as any)?.referred_by

      if (isValidReferrer && !alreadyReferred) {
        validReferredBy = code
      }
    }

    // Paramètres de base de la session Stripe
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      // Pas de payment_method_types : Stripe applique les moyens de paiement
      // activés dans le Dashboard (carte + wallets Apple Pay / Google Pay / Link).
      // Les wallets s'affichent automatiquement sur le Checkout hébergé selon
      // le navigateur (Apple Pay sur Safari/iOS, Google Pay sur Chrome/Android).
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: validReferredBy ? 30 : 3,
        metadata: {
          supabase_user_id: user.id,
          referred_by:      validReferredBy,
          myta_plan:        resolvedPlanId ?? '',
        },
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
    return NextResponse.json({ error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}
