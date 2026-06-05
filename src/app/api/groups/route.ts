import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, endOfWeek } from 'date-fns'

// Génère un code d'invitation unique style WATY-XXXX
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'WATY-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// Calcule le score hebdomadaire d'un utilisateur (0-100)
// Ne renvoie jamais les objectifs personnels — seulement le %
async function calcWeekScore(supabase: any, userId: string): Promise<number> {
  const now      = new Date()
  const weekFrom = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekTo   = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [{ data: prof }, { data: journal }, { data: sessions }] = await Promise.all([
    supabase.from('profiles').select('calorie_target').eq('id', userId).single(),
    supabase.from('journal_entries').select('cal').eq('user_id', userId)
      .gte('date', weekFrom).lte('date', weekTo),
    supabase.from('sessions').select('id').eq('user_id', userId)
      .gte('session_date', weekFrom).lte('session_date', weekTo),
  ])

  const calTarget   = (prof?.calorie_target ?? 2000) * 7
  const calConsumed = (journal ?? []).reduce((s: number, e: any) => s + Number(e.cal), 0)
  const sessionCnt  = (sessions ?? []).length

  const nutritionScore = calTarget > 0 ? Math.min(100, Math.round((calConsumed / calTarget) * 100)) : 0
  const sportScore     = Math.min(100, Math.round((sessionCnt / 3) * 100))

  // Nutrition 60% + Sport 40%
  return Math.round(nutritionScore * 0.6 + sportScore * 0.4)
}

// ── GET /api/groups — liste mes groupes avec membres + scores ─
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Groupes dont je suis membre (ou créateur)
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, privacy_level')
    .eq('user_id', user.id)

  const groupIds = (memberships ?? []).map((m: any) => m.group_id)
  if (!groupIds.length) return NextResponse.json({ groups: [] })

  const { data: groups } = await supabase
    .from('friend_groups')
    .select('*')
    .in('id', groupIds)

  // Pour chaque groupe, charger les membres avec leur score
  const result = await Promise.all((groups ?? []).map(async (group: any) => {
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id, privacy_level, joined_at')
      .eq('group_id', group.id)

    const membersWithScore = await Promise.all((members ?? []).map(async (m: any) => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', m.user_id)
        .single()

      const score = await calcWeekScore(supabase, m.user_id)
      const isMe  = m.user_id === user.id

      // Récupérer la série si privacy >= standard
      let streak = null
      if (m.privacy_level === 'standard' || isMe) {
        const { data: jDates } = await supabase
          .from('journal_entries')
          .select('date')
          .eq('user_id', m.user_id)
          .gte('date', format(new Date(Date.now() - 90 * 86400000), 'yyyy-MM-dd'))
        const uniqueDates = [...new Set((jDates ?? []).map((r: any) => r.date))].sort((a: any, b: any) => b.localeCompare(a))
        // Série simple : jours consécutifs depuis hier/aujourd'hui
        const today = new Date().toISOString().split('T')[0]
        const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (uniqueDates[0] === today || uniqueDates[0] === yest) {
          let s = 0; let cur = uniqueDates[0] as string
          for (const d of uniqueDates as string[]) {
            if (d === cur) { s++; const dt = new Date(cur + 'T12:00:00'); dt.setDate(dt.getDate() - 1); cur = dt.toISOString().split('T')[0] }
            else break
          }
          streak = s
        } else {
          streak = 0
        }
      }

      return {
        userId:       m.user_id,
        isMe,
        displayName:  prof?.full_name ? prof.full_name.split(' ')[0] + ' ' + (prof.full_name.split(' ')[1]?.[0] ?? '') + '.' : 'Anonyme',
        score,
        streak,
        privacyLevel: m.privacy_level,
        joinedAt:     m.joined_at,
      }
    }))

    // Score équipe = moyenne des scores
    const teamScore = membersWithScore.length
      ? Math.round(membersWithScore.reduce((s, m) => s + m.score, 0) / membersWithScore.length)
      : 0

    return {
      ...group,
      members: membersWithScore.sort((a, b) => b.score - a.score),
      teamScore,
    }
  }))

  return NextResponse.json({ groups: result })
}

// ── POST /api/groups — créer ou rejoindre un groupe ─────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // ── Créer un groupe ──────────────────────────────────────
  if (action === 'create') {
    const { name, mode, privacyLevel = 'standard' } = body

    if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    if (!['equipe', 'competition'].includes(mode)) return NextResponse.json({ error: 'Mode invalide' }, { status: 400 })

    // Générer un code unique (retry si collision)
    let inviteCode = ''
    for (let i = 0; i < 10; i++) {
      const candidate = generateInviteCode()
      const { data: existing } = await supabase
        .from('friend_groups').select('id').eq('invite_code', candidate).single()
      if (!existing) { inviteCode = candidate; break }
    }
    if (!inviteCode) return NextResponse.json({ error: 'Erreur génération code' }, { status: 500 })

    const { data: group, error: gErr } = await supabase
      .from('friend_groups')
      .insert({ name: name.trim(), created_by: user.id, mode, invite_code: inviteCode })
      .select().single()

    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 })

    // Le créateur rejoint automatiquement
    await supabase.from('group_members').insert({
      group_id: group.id, user_id: user.id, privacy_level: privacyLevel
    })

    return NextResponse.json({ group })
  }

  // ── Rejoindre un groupe par code ─────────────────────────
  if (action === 'join') {
    const { inviteCode, privacyLevel = 'standard' } = body

    if (!inviteCode?.trim()) return NextResponse.json({ error: 'Code requis' }, { status: 400 })

    const { data: group } = await supabase
      .from('friend_groups')
      .select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single()

    if (!group) return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 404 })

    // Vérifier si déjà membre
    const { data: already } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single()

    if (already) return NextResponse.json({ error: 'Tu es déjà dans ce groupe' }, { status: 409 })

    // Limiter à 10 membres par groupe
    const { count } = await supabase
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group.id)

    if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Groupe complet (max 10)' }, { status: 400 })

    await supabase.from('group_members').insert({
      group_id: group.id, user_id: user.id, privacy_level: privacyLevel
    })

    return NextResponse.json({ group })
  }

  // ── Quitter un groupe ────────────────────────────────────
  if (action === 'leave') {
    const { groupId } = body
    if (!groupId) return NextResponse.json({ error: 'groupId requis' }, { status: 400 })

    await supabase.from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    // Si plus de membres, supprimer le groupe
    const { count } = await supabase
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)

    if ((count ?? 0) === 0) {
      await supabase.from('friend_groups').delete().eq('id', groupId)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
