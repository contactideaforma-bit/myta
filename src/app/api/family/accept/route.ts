import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/family/accept — accepter une invitation famille via token
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const body  = await req.json().catch(() => ({}))
  const token = String(body.token ?? '').trim()

  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  // Récupérer l'invitation
  const { data: invite, error: invErr } = await supabaseAdmin
    .from('family_invites')
    .select('id, owner_id, invited_email, role, status, expires_at')
    .eq('token', token)
    .single()

  if (invErr || !invite) {
    return NextResponse.json({ error: 'Invitation introuvable ou invalide' }, { status: 404 })
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Cette invitation a déjà été utilisée ou a expiré' }, { status: 410 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    await supabaseAdmin.from('family_invites').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Cette invitation a expiré (7 jours)' }, { status: 410 })
  }

  // Vérifier que l'utilisateur n'est pas déjà membre d'une famille
  const { data: acceptor } = await supabaseAdmin
    .from('profiles')
    .select('family_owner_id, family_role')
    .eq('id', auth.userId)
    .single()

  if (acceptor?.family_owner_id) {
    return NextResponse.json({ error: 'Tu fais déjà partie d\'une famille MYTA' }, { status: 409 })
  }

  // Empêcher le propriétaire de s'inviter lui-même
  if (invite.owner_id === auth.userId) {
    return NextResponse.json({ error: 'Tu ne peux pas rejoindre ta propre famille' }, { status: 400 })
  }

  // Lier le profil au propriétaire
  const { error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({
      family_owner_id: invite.owner_id,
      family_role:     invite.role,
    })
    .eq('id', auth.userId)

  if (updateErr) {
    console.error('[family/accept]', updateErr)
    return NextResponse.json({ error: 'Erreur lors de la liaison du compte' }, { status: 500 })
  }

  // Marquer l'invitation comme acceptée
  await supabaseAdmin
    .from('family_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id)

  return NextResponse.json({ success: true, role: invite.role })
}
