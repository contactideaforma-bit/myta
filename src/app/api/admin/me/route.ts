import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

/** GET — l'utilisateur connecté est-il admin ? (sert au garde-fou de la page /admin) */
export async function GET(req: NextRequest) {
  const a = await requireAdmin(req)
  if (a.error) return NextResponse.json({ admin: false }, { status: 200 })
  return NextResponse.json({ admin: true, email: a.email })
}
