/**
 * /api/admin/stats?days=30 — statistiques d'usage agrégées et anonymes.
 * Aucune donnée individuelle : uniquement des comptages (fonction SQL admin_stats,
 * appelée avec la clé service, révoquée pour anon/authenticated).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, supabaseAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return a.error

  const raw = Number(req.nextUrl.searchParams.get('days') ?? 30)
  const days = [7, 30, 90].includes(raw) ? raw : 30

  const { data, error } = await supabaseAdmin.rpc('admin_stats', { p_days: days })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
