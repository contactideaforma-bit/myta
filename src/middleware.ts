import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// ─── Routes publiques (pas de vérification de session) ────────────────────────
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

// Admin uniquement pour la vérification d'abonnement
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Fichiers statiques
  if (pathname.includes('.')) return NextResponse.next()

  // Routes publiques
  if (PUBLIC_PATHS.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)))) {
    return NextResponse.next()
  }
  if (PUBLIC_API.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Routes API privées : chaque handler gère sa propre auth
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // ─── Pattern officiel Supabase @supabase/ssr v0.3 ─────────────────────────
  // IMPORTANT : supabaseResponse doit être recréé dans setAll pour que les
  // headers de la requête incluent les tokens rafraîchis.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // 1. Mettre à jour les cookies dans la requête (pour le downstream)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // 2. Recréer la réponse avec la requête mise à jour
          supabaseResponse = NextResponse.next({ request })
          // 3. Écrire les nouveaux cookies dans la réponse (vers le navigateur)
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  // getSession() : lecture locale des cookies, pas d'appel réseau.
  // Le mécanisme setAll ci-dessus gère le refresh silencieux du token.
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  // Vérifier l'abonnement
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', session.user.id)
      .single()

    const status = profile?.subscription_status
    const hasAccess = ['trialing', 'active', 'vip'].includes(status ?? '')

    if (!hasAccess) {
      const url = request.nextUrl.clone()
      url.pathname = status === 'past_due' ? '/payment-failed' : '/pricing'
      return NextResponse.redirect(url)
    }
  } catch {
    // Erreur DB : laisser passer, les routes valident elles-mêmes
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|logo_my_twin_app.png|manifest.json|sw.js|workbox-.*\\.js).*)',
  ],
}
