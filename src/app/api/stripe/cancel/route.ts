import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' as any })
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const YEARLY_PRICE   = 39.99  // €
const MONTHLY_EQUIV  = 3.99   // € par mois pour le prorata annuel
const ONE_YEAR_SECS  = 365 * 24 * 3600

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('stripe_customer_id').eq('id', auth.userId).single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'Aucun abonnement trouvé' }, { status: 404 })
  }

  try {
    const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, limit: 1, status: 'all' })
    const sub  = subs.data[0]
    if (!sub || !['active', 'trialing', 'past_due'].includes(sub.status)) {
      return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 400 })
    }

    const interval   = sub.items.data[0]?.price?.recurring?.interval ?? 'month'
    const now        = Math.floor(Date.now() / 1000)
    const subAge     = now - sub.start_date
    const isYearly   = interval === 'year'
    const isWithin1Y = subAge < ONE_YEAR_SECS

    if (isYearly && isWithin1Y) {
      // Calcul du remboursement au prorata : 39,99€ - (mois utilisés × 3,99€)
      const monthsUsed = Math.ceil(subAge / (30 * 24 * 3600))
      const equivalent  = Math.round(monthsUsed * MONTHLY_EQUIV * 100) // en centimes
      const charged     = Math.round(YEARLY_PRICE * 100)
      const refundAmt   = Math.max(0, charged - equivalent)

      // Récupérer la dernière facture payée
      const invoices = await stripe.invoices.list({ customer: profile.stripe_customer_id, limit: 1 })
      const lastInvoice = invoices.data[0]
      const paymentIntentId = lastInvoice?.payment_intent as string | undefined

      // Annuler immédiatement
      await stripe.subscriptions.cancel(sub.id)

      // Rembourser si montant > 0
      if (refundAmt > 0 && paymentIntentId) {
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount:         refundAmt,
          reason:         'requested_by_customer',
        })
      }

      await supabaseAdmin.from('profiles').update({ subscription_status: 'canceled' }).eq('id', auth.userId)

      return NextResponse.json({
        canceled: true,
        refunded: refundAmt > 0,
        refund_amount: (refundAmt / 100).toFixed(2),
      })

    } else {
      // Mensuel ou annuel > 1 an : annulation en fin de période (mois en cours dû)
      await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true })
      return NextResponse.json({ canceled: true, refunded: false, cancel_at_period_end: true })
    }

  } catch (err: any) {
    console.error('[cancel]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
