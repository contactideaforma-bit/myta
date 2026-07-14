import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

/**
 * Réclame un achat in-app iOS fait en ANONYME (Apple 5.1.1(v) : l'achat doit
 * être possible sans compte) après création/connexion du compte.
 *
 * Flux : le client appelle Purchases.logIn(supabaseUserId) (RevenueCat
 * transfère les achats anonymes vers cet app_user_id), puis cette route.
 * On vérifie côté serveur les entitlements via l'API REST RevenueCat
 * (la clé publique SDK suffit pour GET /subscribers) et on met à jour le
 * profil — jamais de statut envoyé par le client (anti-triche).
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
  if (!apiKey) return NextResponse.json({ error: 'rc_key_missing' }, { status: 500 })

  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(auth.userId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' }
    )
    if (!res.ok) return NextResponse.json({ error: 'rc_unreachable' }, { status: 502 })

    const data = await res.json()
    const entitlements = data?.subscriber?.entitlements ?? {}

    // premium prime sur essentiel ; actif = pas d'expiration ou expiration future
    let plan: 'premium' | 'essentiel' | null = null
    let end: string | null = null
    for (const name of ['premium', 'essentiel'] as const) {
      const e = entitlements[name]
      if (!e) continue
      if (!e.expires_date || new Date(e.expires_date).getTime() > Date.now()) {
        plan = name
        end = e.expires_date ?? null
        break
      }
    }

    if (!plan) return NextResponse.json({ active: false })

    const update: Record<string, unknown> = { subscription_status: 'active', plan }
    if (end) update.subscription_end = end
    await supabaseAdmin.from('profiles').update(update).eq('id', auth.userId)

    return NextResponse.json({ active: true, plan })
  } catch (err) {
    console.error('[revenuecat claim]', err)
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 })
  }
}
