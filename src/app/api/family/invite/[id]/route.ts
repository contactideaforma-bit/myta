import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE /api/family/invite/[id] — révoquer une invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const { error } = await supabaseAdmin
    .from('family_invites')
    .delete()
    .eq('id', params.id)
    .eq('owner_id', auth.userId)  // sécurité : seul le proprio peut révoquer

  if (error) return NextResponse.json({ error: 'Erreur DB' }, { status: 500 })

  return NextResponse.json({ success: true })
}
