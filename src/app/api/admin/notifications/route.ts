/**
 * /api/admin/notifications — cloche de l'espace Collabs
 * GET   → 30 dernières notifications + nombre de non lues
 * PATCH → { all: true } marque tout comme lu
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, supabaseAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  const [{ data }, { count }] = await Promise.all([
    supabaseAdmin.from('admin_notifications').select('id, type, title, body, meta, created_at, read_at').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('admin_notifications').select('*', { count: 'exact', head: true }).is('read_at', null),
  ])
  return NextResponse.json({ items: data ?? [], unread: count ?? 0 })
}

export async function PATCH(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error
  await supabaseAdmin.from('admin_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  return NextResponse.json({ ok: true })
}
