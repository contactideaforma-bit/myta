import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/family/invites — liste les invitations en attente
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const { data, error } = await supabaseAdmin
    .from('family_invites')
    .select('id, invited_email, role, created_at, expires_at')
    .eq('owner_id', auth.userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erreur DB' }, { status: 500 })

  return NextResponse.json(data ?? [])
}
