import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateCode(name: string | null): string {
  const prefix = (name ?? 'MYT')
    .replace(/[^a-zA-ZÀ-ÿ]/g, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove accents
    .slice(0, 3).toUpperCase().padEnd(3, 'X')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const suffix = Array.from(bytes, b => chars[b % chars.length]).join('')
  return `${prefix}${suffix}`
}

// GET /api/referral — retourne le code de l'utilisateur (génère si absent)
// GET /api/referral?validate=CODE — vérifie qu'un code existe
export async function GET(req: NextRequest) {
  const validateCode = req.nextUrl.searchParams.get('validate')

  // Mode validation : pas besoin d'auth
  if (validateCode) {
    const { data } = await supabaseAdmin
      .from('profiles').select('id').eq('referral_code', validateCode.toUpperCase()).single()
    return NextResponse.json({ valid: !!data })
  }

  // Mode lecture/génération : auth requise
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const userId = auth.userId

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('referral_code, full_name, referral_count, referral_months_earned')
    .eq('id', userId).single()

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  // Si le code existe déjà, on le retourne
  if (profile.referral_code) {
    return NextResponse.json({
      code:            profile.referral_code,
      referral_count:  profile.referral_count ?? 0,
      months_earned:   profile.referral_months_earned ?? 0,
    })
  }

  // Générer un code unique
  let code = ''
  let attempts = 0
  while (attempts < 10) {
    code = generateCode(profile.full_name)
    const { data: existing } = await supabaseAdmin
      .from('profiles').select('id').eq('referral_code', code).single()
    if (!existing) break
    attempts++
  }

  await supabaseAdmin.from('profiles').update({ referral_code: code }).eq('id', userId)

  return NextResponse.json({ code, referral_count: 0, months_earned: 0 })
}
