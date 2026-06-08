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

// ─── Template email de bienvenue ────────────────────────────────────────────

function welcomeEmailHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bienvenue sur MYTA !</title>
</head>
<body style="margin:0;padding:0;background:#f0f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:40px 20px">
        <table role="presentation" style="max-width:520px;margin:0 auto;width:100%">

          <!-- Logo -->
          <tr>
            <td style="text-align:center;padding-bottom:28px">
              <img src="https://mytwinapp.fr/logo_my_twin_app.png" alt="MYTA" width="160"
                style="display:block;margin:0 auto;max-width:160px">
            </td>
          </tr>

          <!-- Carte principale -->
          <tr>
            <td style="background:#ffffff;border-radius:24px;padding:40px 36px;box-shadow:0 4px 32px rgba(75,71,160,0.08)">

              <!-- En-tête dégradé -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="margin-bottom:28px">
                <tr>
                  <td style="background:linear-gradient(90deg,#4B47A0,#2BA8B0);border-radius:16px;padding:28px 24px;text-align:center">
                    <p style="margin:0 0 6px;font-size:32px">🎉</p>
                    <h1 style="margin:0 0 6px;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px">
                      Bienvenue ${firstName ? `${firstName} !` : 'sur MYTA !'}
                    </h1>
                    <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px">
                      Ton essai gratuit de 3 jours commence maintenant.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Message principal -->
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65">
                Bonjour ${firstName ? firstName : 'là'},
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65">
                Ton compte MYTA est actif et ton essai gratuit a démarré.
                Tu as accès à tout — journal alimentaire, suivi sport, analyse du sommeil et ton coach IA <strong>Waty</strong>.
              </p>

              <!-- Features -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb;border-radius:14px;padding:20px;margin-bottom:28px">
                <tr><td style="padding:7px 0;font-size:14px;color:#374151">🥗 &nbsp;<strong>Journal alimentaire</strong> — macros en temps réel</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#374151">🏋️ &nbsp;<strong>Suivi sport</strong> — séances, Tabata vocal, historique</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#374151">😴 &nbsp;<strong>Sommeil</strong> — analyse de tes nuits</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#374151">🤖 &nbsp;<strong>Coach Waty</strong> — conseils personnalisés basés sur tes données</td></tr>
                <tr><td style="padding:7px 0;font-size:14px;color:#374151">📊 &nbsp;<strong>Bilan hebdo</strong> — rapport complet chaque dimanche</td></tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="margin-bottom:24px">
                <tr>
                  <td style="text-align:center">
                    <a href="https://mytwinapp.fr/dashboard"
                      style="display:inline-block;padding:16px 44px;background:linear-gradient(90deg,#4B47A0,#2BA8B0);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px;letter-spacing:0.1px">
                      Ouvrir mon espace MYTA →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Note essai -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px">
                    <p style="margin:0;font-size:13px;color:#166534;line-height:1.5">
                      🎁 <strong>Essai gratuit 3 jours</strong> — aucun débit avant la fin de l'essai.
                      Annulable à tout moment depuis ton espace <em>Abonnement</em>.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af">
                MYTA · My Twin App · IDEAFORMA · Neuilly-sur-Seine
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af">
                <a href="mailto:contact@mytwinapp.fr" style="color:#9ca3af;text-decoration:underline">contact@mytwinapp.fr</a>
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db">
                <a href="https://mytwinapp.fr/legal" style="color:#d1d5db;text-decoration:none">CGU</a>
                &nbsp;·&nbsp;
                <a href="https://mytwinapp.fr/legal" style="color:#d1d5db;text-decoration:none">Confidentialité</a>
                &nbsp;·&nbsp;
                <a href="https://mytwinapp.fr/billing" style="color:#d1d5db;text-decoration:none">Gérer mon abonnement</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Template email paiement échoué ─────────────────────────────────────────

function paymentFailedEmailHtml(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Problème de paiement MYTA</title>
</head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:40px 20px">
        <table role="presentation" style="max-width:520px;margin:0 auto;width:100%">

          <tr>
            <td style="text-align:center;padding-bottom:28px">
              <img src="https://mytwinapp.fr/logo_my_twin_app.png" alt="MYTA" width="160"
                style="display:block;margin:0 auto;max-width:160px">
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:24px;padding:40px 36px;box-shadow:0 4px 32px rgba(234,88,12,0.10)">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="margin-bottom:28px">
                <tr>
                  <td style="background:linear-gradient(90deg,#ea580c,#f97316);border-radius:16px;padding:28px 24px;text-align:center">
                    <p style="margin:0 0 6px;font-size:36px">⚠️</p>
                    <h1 style="margin:0 0 6px;color:#ffffff;font-size:20px;font-weight:800">
                      Problème de paiement${firstName ? `, ${firstName}` : ''}
                    </h1>
                    <p style="margin:0;color:rgba(255,255,255,0.88);font-size:14px">
                      Ton accès MYTA est suspendu — action requise
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.65">
                Bonjour${firstName ? ` ${firstName}` : ''},
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.65">
                Nous n'avons pas pu encaisser ton paiement pour MYTA. Ton accès à l'application est
                temporairement suspendu jusqu'à la régularisation.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px 20px;margin-bottom:28px">
                <tr>
                  <td style="font-size:14px;color:#9a3412;line-height:1.6">
                    <strong>Que faire ?</strong><br>
                    Mets à jour ta carte bancaire depuis ton espace Mon compte pour rétablir ton accès immédiatement.
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="margin-bottom:24px">
                <tr>
                  <td style="text-align:center">
                    <a href="https://mytwinapp.fr/account"
                      style="display:inline-block;padding:16px 44px;background:linear-gradient(90deg,#ea580c,#f97316);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px">
                      Mettre à jour ma carte →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6">
                Une question ? <a href="mailto:contact@mytwinapp.fr" style="color:#ea580c;text-decoration:none">contact@mytwinapp.fr</a><br>
                Annulable à tout moment — sans engagement.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:28px 0 0;text-align:center">
              <p style="margin:0;font-size:12px;color:#9ca3af">
                MYTA · My Twin App · IDEAFORMA · Neuilly-sur-Seine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Webhook handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: any

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object
      const uid = session?.metadata?.supabase_user_id
      if (uid) {
        // Mettre à jour le profil
        await supabaseAdmin.from('profiles').update({
          subscription_status: 'trialing',
          stripe_customer_id:  session.customer,
        }).eq('id', uid)

        // ── Parrainage : créditer le parrain d'1 mois gratuit ──
        try {
          const stripeSubscription = session.subscription
            ? await stripe.subscriptions.retrieve(session.subscription as string)
            : null
          const referredBy = stripeSubscription?.metadata?.referred_by

          if (referredBy) {
            await supabaseAdmin.from('profiles').update({ referred_by: referredBy }).eq('id', uid)
            const { data: referrer } = await supabaseAdmin
              .from('profiles')
              .select('id, stripe_customer_id, referral_count, referral_months_earned')
              .eq('referral_code', referredBy).single()

            if (referrer?.stripe_customer_id) {
              const subItems = stripeSubscription?.items?.data ?? []
              const priceId  = subItems[0]?.price?.id
              if (priceId) {
                const price  = await stripe.prices.retrieve(priceId)
                const amount = price.recurring?.interval === 'year'
                  ? Math.round((price.unit_amount ?? 0) / 12)
                  : (price.unit_amount ?? 0)
                if (amount > 0) {
                  await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
                    amount:      -amount,
                    currency:    price.currency,
                    description: '🎁 Parrainage — 1 mois offert',
                  })
                }
              }
              await supabaseAdmin.from('profiles').update({
                referral_count:         (referrer.referral_count ?? 0) + 1,
                referral_months_earned: (referrer.referral_months_earned ?? 0) + 1,
              }).eq('id', referrer.id)
            }
          }
        } catch (refErr) {
          console.error('[webhook] Erreur parrainage:', refErr)
        }

        // Récupérer email + prénom pour l'email de bienvenue
        try {
          const [{ data: profile }, { data: authData }] = await Promise.all([
            supabaseAdmin.from('profiles').select('full_name').eq('id', uid).single(),
            supabaseAdmin.auth.admin.getUserById(uid),
          ])

          const email     = authData?.user?.email
          const firstName = profile?.full_name?.split(' ')[0] ?? ''

          if (email) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type':  'application/json',
              },
              body: JSON.stringify({
                from:    'Waty de MYTA <contact@mytwinapp.fr>',
                to:      [email],
                subject: `🎉 Bienvenue sur MYTA${firstName ? `, ${firstName}` : ''} — ton essai commence !`,
                html:    welcomeEmailHtml(firstName),
              }),
            })
          }
        } catch (emailErr) {
          // L'email de bienvenue ne doit pas bloquer le webhook
          console.error('[webhook] Erreur envoi email bienvenue:', emailErr)
        }
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object
      const uid = sub?.metadata?.supabase_user_id
      if (uid) {
        await supabaseAdmin.from('profiles').update({
          subscription_status: sub.status,
          subscription_end:    new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', uid)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const uid = sub?.metadata?.supabase_user_id
      if (uid) {
        await supabaseAdmin.from('profiles').update({
          subscription_status: 'canceled',
          subscription_end:    new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', uid)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice   = event.data.object
      const customerId = invoice.customer as string
      if (!customerId) break

      try {
        // Trouver l'utilisateur via stripe_customer_id
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .eq('stripe_customer_id', customerId)
          .single()
        if (!profile) break

        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        const email     = authData?.user?.email
        const firstName = profile.full_name?.split(' ')[0] ?? ''

        if (email) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({
              from:    'Waty de MYTA <contact@mytwinapp.fr>',
              to:      [email],
              subject: `⚠️ Problème de paiement MYTA${firstName ? ` — ${firstName}` : ''} — action requise`,
              html:    paymentFailedEmailHtml(firstName),
            }),
          })
        }
      } catch (err) {
        console.error('[webhook] Erreur invoice.payment_failed:', err)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
