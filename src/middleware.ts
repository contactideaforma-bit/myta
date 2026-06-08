import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Routes publiques ─────────────────────────────────────────────────────────
const PUBLIC_PATHS = [
  '/',
  '/auth',
  '/pricing',
  '/payment-failed',
  '/onboarding',
  '/legal',
  '/success',
  '/cancel',
  '/family/accept',
]
const PUBLIC_API = ['/api/stripe', '/api/webhook', '/api/notifications']

// Client admin — utilise le service role, bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

/**
 * Extrait l'access_token depuis les cookies posés par @supabase/ssr createBrowserClient.
 * Le cookie peut être :
 *   - non-fragmenté : sb-{ref}-auth-token  (valeur = JSON URL-encodé)
 *   - fragmenté      : sb-{ref}-auth-token.0, .1, …  (à ré-assembler)
 */
function getAccessToken(req: NextRequest): string | null {
  const cookies = req.cookies.getAll()

  // 1. Cookie non-fragmenté
  const main = cookies.find(c => /^sb-[a-z0-9]+-auth-token$/.test(c.name))
  let raw: string | null = main?.value ?? null

  // 2. Cookie fragmenté
  if (!raw) {
    const chunks: [number, string][] = []
    for (const { name, value } of cookies) {
      const m = name.match(/^sb-[a-z0-9]+-auth-token\.(\d+)$/)
      if (m) chunks.push([parseInt(m[1]), value])
    }
    if (chunks.length)
      raw = chunks.sort((a, b) => a[0] - b[0]).map(c => c[1]).join('')
  }

  if (!raw) return null

  try {
    const session = JSON.parse(decodeURIComponent(raw))
    return typeof session?.access_token === 'string' ? session.access_token : null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Fichiers statiques
  if (pathname.includes('.')) return NextResponse.next()

  // Routes publiques
  if (PUBLIC_PATHS.some(p => pathname === p || (p !== '/' && pathname.startsWith(p))))
    return NextResponse.next()
  if (PUBLIC_API.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Routes API privées — chaque handler valide lui-même via Bearer / cookies
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // ─── Vérification de session ──────────────────────────────────────────────
  const token = getAccessToken(request)
  if (!token) return NextResponse.redirect(new URL('/auth', request.url))

  // Validation du JWT via Supabase Auth (fonctionne dans l'Edge runtime)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.redirect(new URL('/auth', request.url))

  // ─── Vérification de l'abonnement ────────────────────────────────────────
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    const status = profile?.subscription_status
    const hasAccess = ['trialing', 'active', 'vip'].includes(status ?? '')

    if (!hasAccess) {
      const dest = status === 'past_due' ? '/payment-failed' : '/pricing'
      return NextResponse.redirect(new URL(dest, request.url))
    }
  } catch {
    // Erreur DB → laisser passer, les routes valident elles-mêmes
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|logo_my_twin_app.png|manifest.json|sw.js|workbox-.*\\.js).*)',
  ],
}
