import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PUBLIC_PATHS = ['/auth', '/pricing', '/api', '/_next', '/static']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Laisse passer les pages publiques et fichiers statiques
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Cherche le token dans tous les cookies possibles de Supabase
  const cookies = req.cookies
  let token: string | undefined

  // Supabase peut stocker le token dans différents cookies selon la version
  for (const [key, value] of cookies) {
    if (key.includes('auth-token') || key.includes('access-token')) {
      try {
        // Le cookie peut être un JSON
        const parsed = JSON.parse(decodeURIComponent(value))
        token = parsed?.access_token ?? parsed?.[0] ?? undefined
      } catch {
        // Ou juste une string directe
        token = value
      }
      if (token) break
    }
  }

  // Pas de token → page de connexion
  if (!token) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return NextResponse.redirect(new URL('/auth', req.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    const status = profile?.subscription_status
    const hasAccess = ['trialing', 'active', 'vip'].includes(status ?? '')

    if (!hasAccess) {
      return NextResponse.redirect(new URL('/pricing', req.url))
    }

    return NextResponse.next()

  } catch {
    // En cas d'erreur on laisse passer pour ne pas bloquer
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|logo_my_twin_app.png|manifest.json|sw.js).*)'],
}