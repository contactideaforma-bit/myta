import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { format, startOfWeek, endOfWeek } from 'date-fns'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'WATY-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function calcWeekScore(userId: string): Promise<number> {
  const now      = new Date()
  const weekFrom = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekTo   = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [{ data: prof }, { data: journal }, { data: sessions }] = await Promise.all([
    supabaseAdmin.from('profiles').select('calorie_target').eq('id', userId).single(),
    supabaseAdmin.from('journal_entries').select('cal').eq('user_id', userId)
      .gte('date', weekFrom).lte('date', weekTo),
    supabaseAdmin.from('sessions').select('id').eq('user_id', userId)
      .gte('session_date', weekFrom).lte('session_date', weekTo),
  ])

  const calTarget   = ((prof as any)?.calorie_target ?? 2000) * 7
  const calConsumed = (journal ?? []).reduce((s: number, e: any) => s + Number(e.cal), 0)
  const sessionCnt  = (sessions ?? []).length
  const nutritionScore = calTarget > 0 ? Math.min(100, Math.round((calConsumed / calTarget) * 100)) : 0
  const sportScore     = Math.min(100, Math.round((sessionCnt / 3) * 100))
  return Math.round(nutritionScore * 0.6 + sportScore * 0.4)
}

function makeSupabase(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
}

// ── GET — liste mes groupes ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { data: { user } } = await makeSupabase(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const userId = user.id

  const { data: memberships } = await supabaseAdmin
    .from('group_members').select('group_id, privacy_level').eq('user_id', userId)

  const groupIds = (memberships ?? []).map((m: any) => m.group_id)
  if (!groupIds.length) return NextResponse.json({ groups: [] })

  const { data: groups } = await supabaseAdmin
    .from('friend_groups').select('*').in('id', groupIds)

  const result = await Promise.all((groups ?? []).map(async (group: any) => {
    const { data: members } = await supabaseAdmin
      .from('group_members').select('user_id, privacy_level, joined_at').eq('group_id', group.id)

    const membersWithScore = await Promise.all((members ?? []).map(async (m: any) => {
      const { data: prof } = await supabaseAdmin
        .from('profiles').select('full_name').eq('id', m.user_id).single()

      const score = await calcWeekScore(m.user_id)
      const isMe  = m.user_id === userId

      let streak = null
      if (m.privacy_level === 'standard' || isMe) {
        const { data: jDates } = await supabaseAdmin
          .from('journal_entries').select('date').eq('user_id', m.user_id)
          .gte('date', format(new Date(Date.now() - 90 * 86400000), 'yyyy-MM-dd'))
        const uniqueDates = [...new Set((jDates ?? []).map((r: any) => r.date))]
          .sort((a: any, b: any) => b.localeCompare(a)) as string[]
        const today = new Date().toISOString().split('T')[0]
        const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (uniqueDates[0] === today || uniqueDates[0] === yest) {
          let s = 0; let cur = uniqueDates[0]
          for (const d of uniqueDates) {
            if (d === cur) {
              s++
              const dt = new Date(cur + 'T12:00:00'); dt.setDate(dt.getDate() - 1)
              cur = dt.toISOString().split('T')[0]
            } else break
          }
          streak = s
        } else streak = 0
      }

      return {
        userId:       m.user_id,
        isMe,
        displayName:  (prof as any)?.full_name
          ? (prof as any).full_name.split(' ')[0] + ' ' + ((prof as any).full_name.split(' ')[1]?.[0] ?? '') + '.'
          : 'Anonyme',
        score,
        streak,
        privacyLevel: m.privacy_level,
      }
    }))

    const teamScore = membersWithScore.length
      ? Math.round(membersWithScore.reduce((s, m) => s + m.score, 0) / membersWithScore.length)
      : 0

    return { ...group, members: membersWithScore.sort((a, b) => b.score - a.score), teamScore }
  }))

  return NextResponse.json({ groups: result })
}

// ── POST — créer / rejoindre / quitter ───────────────────────
export async function POST(req: NextRequest) {
  const { data: { user } } = await makeSupabase(req).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const userId = user.id

  const body   = await req.json()
  const { action } = body

  // ── Créer ────────────────────────────────────────────────
  if (action === 'create') {
    const { name, mode, privacyLevel = 'standard' } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    if (!['equipe', 'competition'].includes(mode))
      return NextResponse.json({ error: 'Mode invalide' }, { status: 400 })

    let inviteCode = ''
    for (let i = 0; i < 10; i++) {
      const candidate = generateInviteCode()
      const { data: existing } = await supabaseAdmin
        .from('friend_groups').select('id').eq('invite_code', candidate).single()
      if (!existing) { inviteCode = candidate; break }
    }
    if (!inviteCode) return NextResponse.json({ error: 'Erreur code' }, { status: 500 })

    const { data: group, error: gErr } = await supabaseAdmin
      .from('friend_groups')
      .insert({ name: name.trim(), created_by: userId, mode, invite_code: inviteCode })
      .select().single()

    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 })

    await supabaseAdmin.from('group_members')
      .insert({ group_id: (group as any).id, user_id: userId, privacy_level: privacyLevel })

    return NextResponse.json({ group })
  }

  // ── Rejoindre ────────────────────────────────────────────
  if (action === 'join') {
    const { inviteCode, privacyLevel = 'standard' } = body
    if (!inviteCode?.trim()) return NextResponse.json({ error: 'Code requis' }, { status: 400 })

    const { data: group } = await supabaseAdmin
      .from('friend_groups').select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase()).single()

    if (!group) return NextResponse.json({ error: 'Code invalide' }, { status: 404 })

    const { data: already } = await supabaseAdmin
      .from('group_members').select('id')
      .eq('group_id', (group as any).id).eq('user_id', userId).single()

    if (already) return NextResponse.json({ error: "Tu es deja dans ce groupe" }, { status: 409 })

    const { count } = await supabaseAdmin
      .from('group_members').select('id', { count: 'exact', head: true })
      .eq('group_id', (group as any).id)

    if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Groupe complet (max 10)' }, { status: 400 })

    await supabaseAdmin.from('group_members')
      .insert({ group_id: (group as any).id, user_id: userId, privacy_level: privacyLevel })

    return NextResponse.json({ group })
  }

  // ── Quitter ──────────────────────────────────────────────
  if (action === 'leave') {
    const { groupId } = body
    if (!groupId) return NextResponse.json({ error: 'groupId requis' }, { status: 400 })

    await supabaseAdmin.from('group_members')
      .delete().eq('group_id', groupId).eq('user_id', userId)

    const { count } = await supabaseAdmin
      .from('group_members').select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)

    if ((count ?? 0) === 0) {
      await supabaseAdmin.from('friend_groups').delete().eq('id', groupId)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
