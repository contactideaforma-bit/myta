import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuthResult {
  userId: string
  error?: never
}
export interface AuthError {
  userId?: never
  error: NextResponse
}

export async function requireAuth(req: NextRequest): Promise<AuthResult | AuthError> {
  // Cherche le token dans Authorization: Bearer xxx ou dans les cookies
  const authHeader = req.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    // Fallback : chercher dans les cookies Supabase
    req.cookies.getAll().forEach(cookie => {
      if (token) return
      if (cookie.name.includes('auth-token') || cookie.name.includes('access-token')) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie.value))
          token = parsed?.access_token ?? parsed?.[0] ?? null
        } catch {
          token = cookie.value
        }
      }
    })
  }

  if (!token) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) {
      return { error: NextResponse.json({ error: 'Token invalide' }, { status: 401 }) }
    }
    return { userId: user.id }
  } catch {
    return { error: NextResponse.json({ error: 'Erreur auth' }, { status: 401 }) }
  }
}

// Rate limiting simple : max N appels par heure par userId
// Stocké en mémoire (reset au redeploy — suffisant pour limiter les abus)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(userId: string, maxPerHour = 20): boolean {
  const now = Date.now()
  const key = userId
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 3600_000 })
    return true // OK
  }

  if (entry.count >= maxPerHour) return false // Bloqué

  entry.count++
  return true // OK
}
