import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
}

/** GET /api/family/child — liste les profils enfants du parent connecté
 *  GET /api/family/child?id=UUID — un seul profil enfant
 */
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')

  if (id) {
    const { data: child } = await supabaseAdmin
      .from('child_profiles')
      .select('id, name, birth_date, weight_kg, height_cm, gender, created_at')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single()
    if (!child) return NextResponse.json({ error: 'Enfant introuvable' }, { status: 404 })
    return NextResponse.json(child)
  }

  const { data: children } = await supabaseAdmin
    .from('child_profiles')
    .select('id, name, birth_date, weight_kg, height_cm, gender, created_at')
    .eq('owner_id', user.id)
    .order('created_at')

  return NextResponse.json(children ?? [])
}

/** POST /api/family/child — créer un profil enfant */
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan, subscription_status')
    .eq('id', user.id)
    .single()

  if (!profile?.plan?.includes('famille')) {
    return NextResponse.json({ error: 'Le forfait Famille est requis pour ajouter des enfants' }, { status: 403 })
  }

  const activeStatuses = ['trialing', 'active', 'vip']
  if (!activeStatuses.includes(profile.subscription_status ?? '')) {
    return NextResponse.json({ error: 'Abonnement actif requis' }, { status: 403 })
  }

  const { count } = await supabaseAdmin
    .from('child_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Maximum 3 enfants pour ce forfait' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Le prénom est requis' }, { status: 400 })

  const { data: child, error } = await supabaseAdmin
    .from('child_profiles')
    .insert({
      owner_id:   user.id,
      name,
      birth_date: body.birth_date  || null,
      weight_kg:  body.weight_kg   ? Number(body.weight_kg)  : null,
      height_cm:  body.height_cm   ? Number(body.height_cm)  : null,
      gender:     body.gender      || null,
    })
    .select('id, name, birth_date, weight_kg, height_cm, gender')
    .single()

  if (error) {
    console.error('[family/child POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(child)
}

/** DELETE /api/family/child?id=UUID — supprimer un profil enfant */
export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('child_profiles')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id) // sécurité : ne peut supprimer que ses propres enfants

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
