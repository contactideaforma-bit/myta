import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

/**
 * Proxy Pexels côté serveur (la clé ne quitte jamais le serveur).
 *  - `keyword` : recherche culinaire (suffixe « food » ajouté) — recettes.
 *  - `q`       : requête libre, utilisée telle quelle — illustrations du dashboard.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const rawQ    = req.nextUrl.searchParams.get('q')
  const keyword = req.nextUrl.searchParams.get('keyword') ?? 'food'
  const query   = rawQ ? rawQ.slice(0, 80) : `${keyword} food`
  const apiKey  = process.env.PEXELS_API_KEY  // Plus NEXT_PUBLIC_ !

  if (!apiKey) return NextResponse.json({ url: null })

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    )
    const data = await res.json()
    const url  = data.photos?.[0]?.src?.medium ?? null
    return NextResponse.json({ url }, {
      headers: { 'Cache-Control': 'public, max-age=86400' } // Cache 24h
    })
  } catch {
    return NextResponse.json({ url: null })
  }
}
