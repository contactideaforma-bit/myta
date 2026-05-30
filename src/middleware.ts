import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Pages accessibles sans abonnement
const PUBLIC_PATHS = ['/auth', '/pricing', '/api']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Laisse passer les pages publiques
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Laisse passer les fichiers statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // fichiers comme icon.png, sw.js etc
  ) {
    return NextResponse.next()
  }

  // Récupère le token de session depuis les cookies
  const token = req.cookies.get('sb-access-token')?.value
    || req.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // Vérifie l'abonnement dans Supabase
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
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}