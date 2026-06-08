import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

/**
 * GET /api/family/members
 * Retourne { self, members[], owner? } pour le ProfileSwitcher.
 * Fonctionne dans les deux sens :
 *   - si l'utilisateur est owner  → members = ses enfants/partenaire
 *   - si l'utilisateur est member → owner = le titulaire + les autres membres
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Profil de l'utilisateur courant
  const { data: self } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, plan, family_role, family_owner_id, subscription_status')
    .eq('id', user.id)
    .single()

  if (!self) return NextResponse.json({ self: null, members: [], owner: null })

  // Propriétaire du groupe famille
  const ownerId = self.family_owner_id ?? user.id

  // Tous les membres rattachés à ce propriétaire
  const { data: members } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, family_role')
    .eq('family_owner_id', ownerId)

  // Si l'utilisateur courant est lui-même un membre, récupérer le profil du propriétaire
  let owner: { id: string; full_name: string | null; family_role: string | null } | null = null
  if (self.family_owner_id) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, family_role')
      .eq('id', ownerId)
      .single()
    owner = data ?? null
  }

  // Exclure l'utilisateur courant de la liste des membres
  const others = (members ?? []).filter((m: { id: string }) => m.id !== user.id)

  // Profils enfants (child_profiles) rattachés au propriétaire
  const { data: childProfiles } = await supabaseAdmin
    .from('child_profiles')
    .select('id, name, gender')
    .eq('owner_id', ownerId)
    .order('created_at')

  return NextResponse.json({ self, members: others, owner, children: childProfiles ?? [] })
}
