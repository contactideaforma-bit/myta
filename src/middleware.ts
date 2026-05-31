import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PUBLIC_PATHS = ['/auth', '/pricing', '/api', '/_next', '/static']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  let token: string | undefined

  // Parcourt tous les cookies et extrait le access_token
  req.cookies.getAll().forEach(cookie => {
    if (token) return
    if (cookie.name.includes('auth-token') || cookie.name.includes('access-token')) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookie.value))
        token = parsed?.access_token ?? parsed?.[0] ?? undefined
      } catch {
        token = cookie.value
      }
    }
  })

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
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|logo_my_twin_app.png|manifest.json|sw.js).*)'],
}