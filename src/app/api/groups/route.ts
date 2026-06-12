import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { format, startOfWeek } from 'date-fns'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  let code = 'WATY-'
  for (let i = 0; i < 4; i++) code += chars[bytes[i] % chars.length]
  return code
}

// Score journalier "Sauver Waty" : repart à 0 chaque jour à minuit (heure
// locale du client via localDate). Un membre "gagne" sa journée quand il a
// rempli son journal alimentaire ET atteint au moins 70 % de son objectif
// calorique personnalisé. Le score (0-100) reflète sa progression vers ce but.
async function calcDayScore(userId: string, localDate: string): Promise<number> {
  const [{ data: journal }, { data: profile }] = await Promise.all([
    supabaseAdmin.from('journal_entries').select('cal').eq('user_id', userId).eq('date', localDate),
    supabaseAdmin.from('profiles').select('calorie_target').eq('id', userId).single(),
  ])

  // Rien de noté aujourd'hui → 0
  if (!(journal ?? []).length) return 0

  const calorieTarget = (profile as any)?.calorie_target ?? 0
  // Pas d'objectif défini → journal rempli = journée gagnée
  if (calorieTarget <= 0) return 100

  const totalCal = (journal ?? []).reduce((s: number, e: any) => s + (e.cal ?? 0), 0)
  // Progression vers 70 % de l'objectif personnalisé (plafonnée à 100)
  return Math.min(100, Math.round((totalCal / (calorieTarget * 0.7)) * 100))
}

async function calcWeekScore(userId: string, joinedAt: string): Promise<number> {
  const now       = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const joinDate  = new Date(joinedAt)

  // La progression démarre au join ou au début de semaine, selon ce qui est le plus récent
  const periodStart = joinDate > weekStart ? joinDate : weekStart
  const fromStr     = format(periodStart, 'yyyy-MM-dd')
  const toStr       = format(now, 'yyyy-MM-dd')

  // Nombre de jours écoulés depuis le début du challenge (min 1)
  const daysElapsed = Math.max(1,
    Math.round((now.getTime() - periodStart.getTime()) / 86400000) + 1
  )

  const [{ data: journal }, { data: sessions }] = await Promise.all([
    supabaseAdmin.from('journal_entries').select('date').eq('user_id', userId)
      .gte('date', fromStr).lte('date', toStr),
    supabaseAdmin.from('sessions').select('id').eq('user_id', userId)
      .gte('session_date', fromStr).lte('session_date', toStr),
  ])

  // Nutrition : % de jours où l'utilisateur a loggé au moins un repas
  const uniqueNutriDays = new Set((journal ?? []).map((e: any) => e.date)).size
  const nutritionScore  = Math.min(100, Math.round((uniqueNutriDays / daysElapsed) * 100))

  // Sport : sessions vs cible proratée (3 séances / 7 jours)
  const sessionCnt  = (sessions ?? []).length
  const sportTarget = Math.max(1, (daysElapsed / 7) * 3)
  const sportScore  = Math.min(100, Math.round((sessionCnt / sportTarget) * 100))

  return Math.round(nutritionScore * 0.6 + sportScore * 0.4)
}

async function getAuthUser(req: NextRequest): Promise<string | null> {
  // 1. Essai via Bearer token (header Authorization)
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (bearerToken && bearerToken !== 'undefined' && bearerToken !== 'null') {
    const { data: { user } } = await supabaseAdmin.auth.getUser(bearerToken)
    if (user) return user.id
  }

  // 2. Essai via cookies (SSR)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user.id

  return null
}

// ── GET — liste mes groupes (+ leaderboard global + messages) ──────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // ── Messages d'un groupe (24h) ────────────────────────────
  if (searchParams.get('messages') === '1') {
    const userId = await getAuthUser(req)
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const groupId = searchParams.get('groupId')
    if (!groupId) return NextResponse.json({ error: 'groupId requis' }, { status: 400 })
    // Vérifier que l'utilisateur est membre du groupe
    const { data: membership } = await supabaseAdmin
      .from('group_members').select('id').eq('group_id', groupId).eq('user_id', userId).single()
    if (!membership) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: msgs } = await supabaseAdmin
      .from('group_messages')
      .select('id,user_id,message,created_at,display_name')
      .eq('group_id', groupId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(30)
    return NextResponse.json({ messages: msgs ?? [] })
  }

  // ── Leaderboard global — pas besoin d'auth ────────────────
  if (searchParams.get('leaderboard') === '1') {
    const { data: allGroups } = await supabaseAdmin
      .from('friend_groups')
      .select('id, name, mode, cups_won')
      .order('cups_won', { ascending: false })
      .limit(20)

    const leaderboard = await Promise.all((allGroups ?? []).map(async (g: any) => {
      const { count } = await supabaseAdmin
        .from('group_members').select('id', { count: 'exact', head: true }).eq('group_id', g.id)
      return { id: g.id, name: g.name, mode: g.mode, cupsWon: g.cups_won ?? 0, memberCount: count ?? 0 }
    }))
    return NextResponse.json({ leaderboard })
  }

  const userId = await getAuthUser(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Utiliser la date locale du client si fournie (évite le décalage UTC)
  const localDate = searchParams.get('localDate') ?? new Date().toISOString().split('T')[0]

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

      const [score, dayScore] = await Promise.all([
        calcWeekScore(m.user_id, m.joined_at),
        calcDayScore(m.user_id, localDate),
      ])
      const isMe  = m.user_id === userId

      let streak = null
      if (m.privacy_level === 'standard' || isMe) {
        // Série cumulative : nombre total de jours loggés (jamais de reset)
        const { data: jDates } = await supabaseAdmin
          .from('journal_entries').select('date').eq('user_id', m.user_id)
        streak = new Set((jDates ?? []).map((r: any) => r.date)).size
      }

      return {
        userId:       m.user_id,
        isMe,
        displayName:  (prof as any)?.full_name
          ? (prof as any).full_name.split(' ')[0] + ' ' + ((prof as any).full_name.split(' ')[1]?.[0] ?? '') + '.'
          : 'Anonyme',
        score,
        dayScore,
        streak,
        privacyLevel: m.privacy_level,
      }
    }))

    const teamScore = membersWithScore.length
      ? Math.round(membersWithScore.reduce((s, m) => s + m.score, 0) / membersWithScore.length)
      : 0

    const teamDayScore = membersWithScore.length
      ? Math.round(membersWithScore.reduce((s, m) => s + (m as any).dayScore, 0) / membersWithScore.length)
      : 0

    // ── Coupes : incrémenter si score hebdo >= 70% sur une nouvelle semaine ──
    const currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    if (group.mode === 'equipe' && teamScore >= 70 && group.last_cup_week !== currentWeek) {
      await supabaseAdmin.from('friend_groups').update({
        cups_won:      (group.cups_won ?? 0) + 1,
        last_cup_week: currentWeek,
      }).eq('id', group.id)
      group.cups_won = (group.cups_won ?? 0) + 1
    }

    return { ...group, members: membersWithScore.sort((a, b) => b.score - a.score), teamScore, teamDayScore, cupsWon: group.cups_won ?? 0 }
  }))

  return NextResponse.json({ groups: result })
}

// ── POST — créer / rejoindre / quitter ───────────────────────
export async function POST(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body   = await req.json()
  const { action } = body

  // ── Envoyer un message ───────────────────────────────────
  if (action === 'send_message') {
    const { groupId, message } = body
    if (!groupId || !message?.trim()) return NextResponse.json({ error: 'groupId et message requis' }, { status: 400 })
    // Vérifier que l'utilisateur est membre
    const { data: membership } = await supabaseAdmin
      .from('group_members').select('id').eq('group_id', groupId).eq('user_id', userId).single()
    if (!membership) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    // Récupérer le nom d'affichage
    const { data: prof } = await supabaseAdmin
      .from('profiles').select('full_name').eq('id', userId).single()
    const fullName = (prof as any)?.full_name ?? 'Anonyme'
    const displayName = fullName.split(' ')[0] + ' ' + (fullName.split(' ')[1]?.[0] ?? '') + '.'
    const { data: msg, error } = await supabaseAdmin
      .from('group_messages')
      .insert({ group_id: groupId, user_id: userId, message: message.trim().slice(0, 120), display_name: displayName })
      .select('id,user_id,message,created_at,display_name')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: msg })
  }

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

    if (gErr) return NextResponse.json({ error: 'Erreur lors de la création du groupe' }, { status: 500 })

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

  // ── Renommer ─────────────────────────────────────────────
  if (action === 'rename') {
    const { groupId, name } = body
    if (!groupId || !name?.trim()) return NextResponse.json({ error: 'groupId et nom requis' }, { status: 400 })
    const { data: membership } = await supabaseAdmin
      .from('group_members').select('id').eq('group_id', groupId).eq('user_id', userId).single()
    if (!membership) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    const { error } = await supabaseAdmin
      .from('friend_groups').update({ name: name.trim() }).eq('id', groupId)
    if (error) return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Quitter ──────────────────────────────────────────────
  if (action === 'leave') {
    const { groupId } = body
    if (!groupId) return NextResponse.json({ error: 'groupId requis' }, { status: 400 })

    // Vérifier que l'utilisateur est bien membre de ce groupe avant de procéder
    const { data: membership } = await supabaseAdmin
      .from('group_members').select('id').eq('group_id', groupId).eq('user_id', userId).single()

    if (!membership) return NextResponse.json({ error: 'Tu n\'es pas membre de ce groupe' }, { status: 403 })

    await supabaseAdmin.from('group_members')
      .delete().eq('group_id', groupId).eq('user_id', userId)

    const { count } = await supabaseAdmin
      .from('group_members').select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)

    // Supprimer le groupe seulement s'il est vide
    if ((count ?? 0) === 0) {
      await supabaseAdmin.from('friend_groups').delete().eq('id', groupId)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
