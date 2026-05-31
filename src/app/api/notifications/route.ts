import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, subscription, action } = await req.json()

    if (action === 'subscribe') {
      // Sauvegarder la souscription push
      await supabaseAdmin.from('push_subscriptions').upsert({
        user_id:      userId,
        subscription: subscription,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' })
      return NextResponse.json({ ok: true })
    }

    if (action === 'unsubscribe') {
      await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
