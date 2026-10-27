/**
 * POST /api/promo/redeem — { code } : l'utilisateur connecté utilise un code promo
 * (jours de Premium offerts). Toute la logique est dans la RPC redeem_promo.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, checkRateLimit } from '@/lib/auth'

const REASONS: Record<string, string> = {
  invalid:            'Ce code n\'existe pas ou n\'est plus actif.',
  expired:            'Ce code a expiré.',
  exhausted:          'Ce code a atteint son nombre maximal d\'utilisations.',
  own_code:           'Tu ne peux pas utiliser ton propre code.',
  already_used:       'Tu as déjà utilisé ce code.',
  already_subscribed: 'Tu as déjà un abonnement actif : le code ne peut pas s\'y ajouter.',
  not_authenticated:  'Connecte-toi pour utiliser un code.',
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  if (!checkRateLimit(auth.userId, 10)) return NextResponse.json({ error: 'Trop d\'essais, réessaie dans 1h' }, { status: 429 })

  let code = ''
  try { code = String((await req.json()).code ?? '').trim() } catch { /* vide */ }
  if (!code) return NextResponse.json({ error: 'Code manquant' }, { status: 400 })

  // RPC exécutée AU NOM de l'utilisateur (auth.uid() = lui) : on passe son token
  const token = req.headers.get('authorization')?.slice(7)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  })
  const { data, error } = await supabase.rpc('redeem_promo', { p_code: code })
  if (error) return NextResponse.json({ error: 'Erreur technique, réessaie.' }, { status: 500 })
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.ok) return NextResponse.json({ error: REASONS[row?.reason] ?? 'Code refusé.', reason: row?.reason }, { status: 400 })
  return NextResponse.json({ ok: true, days: row.days_added, until: row.until_at })
}
