import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient }       from '@supabase/supabase-js'

// Pages accessibles sans auth
const PUBLIC_PATHS = [
  '/auth', '/pricing', '/payment-failed', '/onboarding',
  '/legal', '/success', '/cancel', '/family/accept',
  '/_next', '/static',
]

// Routes API publiques (webhooks Stripe, crons…)
const PUBLIC_API = [
  '/api/stripe',
  '/api/webhook',
  '/api/notifications',
]

// Client admin (service role) pour la vérification d'abonnement uniquement
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Page marketing publique
  if (pathname === '/') return NextResponse.next()

  // Fichiers statiques (images, fonts…)
  if (pathname.includes('.')) return NextResponse.next()

  // Pages / routes publiques
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (PUBLIC_API.some(p  => pathname.startsWith(p)))  return NextResponse.next()

  // Routes API privées : chaque route gère son propre requireAuth
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // ─── Pages app : session via @supabase/ssr (auto-refresh du token) ──────────
  //
  // createServerClient + setAll met à jour les cookies de réponse avec le
  // nouveau access_token si le précédent a expiré → l'utilisateur reste connecté
  // tant que son refresh_token est valide (60 jours par défaut dans Supabase).
  //
  // On retourne `res` (pas NextResponse.next()) pour propager les cookies rafraîchis.

  const res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()          { return req.cookies.getAll() },
        setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // Propage les tokens rafraîchis vers le navigateur
          toSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            res.cookies.set(name, value, options as any)
          })
        },
      },
    }
  )

  // getSession() lit la session depuis les cookies (pas d'appel réseau = fiable en Edge).
  // Le createServerClient + setAll s'occupe du refresh silencieux si le token est expiré.
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return NextResponse.redirect(new URL('/auth', req.url))

  // Vérifier l'abonnement (admin bypasse RLS)
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('id', session.user.id)
      .single()

    const status    = profile?.subscription_status
    const hasAccess = ['trialing', 'active', 'vip'].includes(status ?? '')

    if (!hasAccess) {
      if (status === 'past_due') return NextResponse.redirect(new URL('/payment-failed', req.url))
      return NextResponse.redirect(new URL('/pricing', req.url))
    }
  } catch {
    // En cas d'erreur DB on laisse passer plutôt que de déconnecter
    return res
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|logo_my_twin_app.png|manifest.json|sw.js).*)'],
}
