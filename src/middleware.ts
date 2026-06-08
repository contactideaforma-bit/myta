import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
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

// Admin uniquement pour vérifier l'abonnement (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

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

  // ─── Session via @supabase/ssr 0.3 — refresh automatique du token ──────────
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Propager le cookie rafraîchi dans la requête ET la réponse
          request.cookies.set({ name, value, ...options } as any)
          response = NextResponse.next({ request })
          response.cookies.set({ name, value, ...options } as any)
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options } as any)
          response = NextResponse.next({ request })
          response.cookies.set({ name, value: '', ...options } as any)
        },
      },
    }
  )

  // getUser() rafraîchit automatiquement le token si expiré
  const { data: { user } } = await supabase.auth.getUser()
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
    // Erreur DB → laisser passer
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|logo_my_twin_app.png|manifest.json|sw.js|workbox-.*\\.js).*)',
  ],
}
