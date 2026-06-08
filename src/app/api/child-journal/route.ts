/**
 * API journal alimentaire pour les profils enfants (child_profiles).
 * Utilise supabaseAdmin pour bypasser RLS — vérifie toujours que
 * l'enfant appartient bien à l'utilisateur authentifié.
 *
 * ⚠️  MIGRATION SQL REQUISE dans Supabase :
 *   ALTER TABLE journal_entries
 *     ADD COLUMN IF NOT EXISTS child_profile_id uuid
 *     REFERENCES child_profiles(id) ON DELETE CASCADE;
 *   CREATE INDEX IF NOT EXISTS idx_journal_child
 *     ON journal_entries(child_profile_id, date);
 */
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

async function verifyOwnership(childId: string, ownerId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('child_profiles')
    .select('id')
    .eq('id', childId)
    .eq('owner_id', ownerId)
    .single()
  return !!data
}

/**
 * GET /api/child-journal?child_id=UUID&date=YYYY-MM-DD
 * GET /api/child-journal?child_id=UUID&week=d1,d2,...   → résumé calories par jour
 * GET /api/child-journal?child_id=UUID&recent=true      → 30 dernières entrées
 */
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('child_id')
  if (!childId) return NextResponse.json({ error: 'child_id requis' }, { status: 400 })

  const ok = await verifyOwnership(childId, user.id)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Résumé semaine
  const week = searchParams.get('week')
  if (week) {
    const dates = week.split(',').filter(Boolean)
    const { data } = await supabaseAdmin
      .from('journal_entries')
      .select('date, cal')
      .eq('child_profile_id', childId)
      .in('date', dates)
    return NextResponse.json(data ?? [])
  }

  // Récents (pour accès rapide)
  if (searchParams.get('recent') === 'true') {
    const { data } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('child_profile_id', childId)
      .order('created_at', { ascending: false })
      .limit(30)
    return NextResponse.json(data ?? [])
  }

  // Journal d'un jour précis
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date requis' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('journal_entries')
    .select('*')
    .eq('child_profile_id', childId)
    .eq('date', date)
    .order('created_at')

  return NextResponse.json(data ?? [])
}

/**
 * POST /api/child-journal
 * Body : { child_id, date, food_id?, food_name, food_cat, quantity, cal, prot, carb, fat, image_url? }
 */
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { child_id, ...entryData } = body

  if (!child_id) return NextResponse.json({ error: 'child_id requis' }, { status: 400 })

  const ok = await verifyOwnership(child_id, user.id)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .insert({
      ...entryData,
      user_id:          user.id,   // parent auth user (pour RLS future)
      child_profile_id: child_id,
    })
    .select()
    .single()

  if (error) {
    console.error('[child-journal POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

/**
 * DELETE /api/child-journal?id=UUID&child_id=UUID
 */
export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id      = searchParams.get('id')
  const childId = searchParams.get('child_id')

  if (!id || !childId) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  const ok = await verifyOwnership(childId, user.id)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('child_profile_id', childId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
