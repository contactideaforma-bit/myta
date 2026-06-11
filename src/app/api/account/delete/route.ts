import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as any,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/account/delete
 * Suppression définitive du compte (exigence Apple 5.1.1(v) + Google Play).
 * 1. Annule immédiatement l'abonnement Stripe
 * 2. Détache les membres famille rattachés
 * 3. Purge toutes les données utilisateur
 * 4. Supprime l'utilisateur Supabase Auth
 *
 * Body requis : { confirm: "SUPPRIMER" } — protection contre les appels accidentels.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const userId = auth.userId

  try {
    const { confirm } = await req.json().catch(() => ({}))
    if (confirm !== 'SUPPRIMER') {
      return NextResponse.json({ error: 'Confirmation requise' }, { status: 400 })
    }

    // ── 1. Stripe : annuler immédiatement tout abonnement actif ─────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profile?.stripe_customer_id) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status:   'all',
          limit:    10,
        })
        for (const sub of subs.data) {
          if (['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status)) {
            await stripe.subscriptions.cancel(sub.id)
          }
        }
        // Supprimer le customer Stripe (purge moyens de paiement / RGPD)
        await stripe.customers.del(profile.stripe_customer_id)
      } catch (stripeErr) {
        // Ne pas bloquer la suppression du compte si Stripe échoue — logger pour suivi manuel
        console.error('[account/delete] Erreur Stripe (à traiter manuellement):', stripeErr)
      }
    }

    // ── 2. Famille : détacher les membres rattachés à ce compte ─────────────
    await supabaseAdmin
      .from('profiles')
      .update({ family_owner_id: null, family_role: null })
      .eq('family_owner_id', userId)

    // ── 3. Groupes : retirer le membre, supprimer les groupes devenus vides ──
    const { data: memberships } = await supabaseAdmin
      .from('group_members').select('group_id').eq('user_id', userId)
    await supabaseAdmin.from('group_messages').delete().eq('user_id', userId)
    await supabaseAdmin.from('group_members').delete().eq('user_id', userId)
    for (const m of memberships ?? []) {
      const { count } = await supabaseAdmin
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', m.group_id)
      if ((count ?? 0) === 0) {
        await supabaseAdmin.from('friend_groups').delete().eq('id', m.group_id)
      }
    }

    // ── 4. Sport : exercices liés aux séances, puis séances ─────────────────
    const { data: userSessions } = await supabaseAdmin
      .from('sessions').select('id').eq('user_id', userId)
    const sessionIds = (userSessions ?? []).map((s: { id: string }) => s.id)
    if (sessionIds.length) {
      await supabaseAdmin.from('session_exercises').delete().in('session_id', sessionIds)
    }

    // ── 5. Purge des données utilisateur ─────────────────────────────────────
    const tablesByUserId = [
      'journal_entries',
      'sessions',
      'challenge_completions',
      'user_badges',
      'smoking_log',
      'weight_log',
      'sleep_log',
      'saved_recipes',
      'push_subscriptions',
    ]
    for (const table of tablesByUserId) {
      const { error } = await supabaseAdmin.from(table).delete().eq('user_id', userId)
      // Table absente ou déjà vide → on continue
      if (error) console.error(`[account/delete] ${table}:`, error.message)
    }

    // Données rattachées en tant que propriétaire famille
    await supabaseAdmin.from('family_invites').delete().eq('owner_id', userId)
    await supabaseAdmin.from('child_profiles').delete().eq('owner_id', userId)

    // ── 6. Profil puis utilisateur Auth ──────────────────────────────────────
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authErr) {
      console.error('[account/delete] deleteUser:', authErr)
      return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[account/delete]', err)
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
  }
}
