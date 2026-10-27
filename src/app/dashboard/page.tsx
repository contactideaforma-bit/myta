'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
// WeightChart et MonthProgress déplacés vers journal/profil
import { fr } from 'date-fns/locale'
import { MytaIcon } from '@/components/ui/MytaIcon'
import { MytaIllustration } from '@/components/ui/MytaIllustration'
import { todayISO } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Waty } from '@/components/ui/Waty'
import { WelcomeModal } from '@/components/ui/WelcomeModal'
import { TourGuide } from '@/components/ui/TourGuide'
import OnboardingCoach from '@/components/ui/OnboardingCoach'
import { useOnboarding, ONBOARDING_ROUTE, type OnboardingStep } from '@/lib/onboarding'
import { BadgeDisplay } from '@/components/ui/BadgeDisplay'
import { ChallengeCard } from '@/components/ui/ChallengeCard'
import {
  getBadgeFromStreak, getNextBadge,
  getChallengesForToday, getWatyProactifMessage,
} from '@/lib/gamification'
import { getDailyTip } from '@/lib/daily-tips'
import { getActiveProfile } from '@/lib/active-profile'
import type { Profile } from '@/types'

type Period = 'semaine' | 'mois'

interface Stats {
  profile:             Profile | null
  calToday:            number
  calTarget:           number
  calConsumed:         number
  calBurned:           number
  totalProt:           number
  weekSessions:        number
  weekMinutes:         number
  streak:              number
  completedChallenges: string[]
  protToday:           number
  lastMeal:            { name: string; cal: number; prot: number; at: string | null } | null
  lastSession:         { label: string; minutes: number; cal: number; date: string } | null
  lastSleep:           { minutes: number; date: string } | null
}



// ── Indicateur de progression mensuel ────────────────────────────────────────
function MonthProgress({ calConsumed, calTarget, sessions, sessionTarget, calBurned }: {
  calConsumed: number; calTarget: number; sessions: number; sessionTarget: number; calBurned: number
}) {
  const now         = new Date()
  const dayOfMonth  = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthPct    = Math.round((dayOfMonth / daysInMonth) * 100)
  const prorata     = dayOfMonth / daysInMonth
  const calExpected = Math.round(calTarget * 30 * prorata)
  const sesExpected = Math.round(sessionTarget * prorata)
  const calPct      = calExpected > 0 ? Math.min(150, Math.round((calConsumed / calExpected) * 100)) : 0
  const sesPct      = sesExpected > 0 ? Math.min(150, Math.round((sessions / Math.max(1, sesExpected)) * 100)) : 0
  const burnPct     = Math.min(150, Math.round((calBurned / Math.max(1, 6000 * prorata)) * 100))

  const items: { label: string; pct: number; icon: 'journal' | 'sport' | 'flame'; color: string }[] = [
    { label: 'Nutrition',    pct: calPct,  icon: 'journal', color: '#f97316' },
    { label: 'Séances',      pct: sesPct,  icon: 'sport',   color: '#7b7fd4' },
    { label: 'Cal. brûlées', pct: burnPct, icon: 'flame',   color: '#22c55e' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Progression du mois</span>
        <span className="font-bold text-zinc-600">Jour {dayOfMonth}/{daysInMonth}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-300 rounded-full" style={{ width: `${monthPct}%` }} />
        </div>
        <p className="text-[10px] text-zinc-400 text-right">{monthPct}% du mois écoulé</p>
      </div>
      {items.map(({ label, pct, icon, color }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-600 inline-flex items-center gap-1.5">
              <MytaIcon name={icon} size={13} style={{ color }} /> {label}
            </span>
            <span className={`text-xs font-bold ${pct >= 100 ? 'text-nutri-mid' : pct >= 70 ? 'text-yellow-500' : 'text-zinc-400'}`}>
              {pct}%
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? color : `${color}99` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard enfant ─────────────────────────────────────────────────────────
interface ChildStats { firstName: string; calToday: number; calTarget: number; prot: number }

function ChildDashboard({ cs, router }: { cs: ChildStats; router: ReturnType<typeof useRouter> }) {
  const calPct = Math.min(100, cs.calTarget > 0 ? Math.round((cs.calToday / cs.calTarget) * 100) : 0)
  return (
    <div className="page">
      {/* Salutation enfant */}
      <div className="rounded-3xl px-5 py-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.10) 100%)', border: '1px solid rgba(251,191,36,0.3)' }}>
        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <MytaIcon name="waty" size={22} className="text-amber-600" />
        </div>
        <div>
          <p className="text-amber-600 text-sm font-medium capitalize">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
          <h1 className="text-2xl font-extrabold text-zinc-900">
            Bonjour{cs.firstName ? `, ${cs.firstName}` : ''}
          </h1>
        </div>
      </div>

      {/* Calories du jour */}
      <button onClick={() => router.push('/nutrition/journal')}
        className="w-full text-left bg-gradient-to-br from-nutri to-nutri-mid rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/25 rounded-2xl flex items-center justify-center"><MytaIcon name="journal" size={19} className="text-white" /></div>
            <span className="font-extrabold text-white text-lg">Nutrition</span>
          </div>
          <span className="text-xs font-bold bg-white/25 text-white px-3 py-1 rounded-full">Aujourd'hui</span>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/80 mb-2">
            <span className="font-bold">{Math.round(cs.calToday)} kcal consommées</span>
            <span>{cs.calTarget} kcal objectif</span>
          </div>
          <div className="h-2.5 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${calPct}%` }} />
          </div>
          <p className="text-xs text-white/70 mt-1">{calPct}% de l'objectif</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-white font-bold group-hover:gap-2 transition-all">
          Ouvrir le journal <MytaIcon name="chevron" size={14} />
        </div>
      </button>

      {/* Protéines */}
      {cs.prot > 0 && (
        <div className="card flex items-center gap-4">
          <MytaIcon name="sport" size={26} className="text-tta-mid" />
          <div className="flex-1">
            <p className="text-sm font-bold text-zinc-800">Protéines aujourd'hui</p>
            <p className="text-2xl font-black text-blue-600">{Math.round(cs.prot)} <span className="text-sm font-semibold text-zinc-400">g</span></p>
          </div>
        </div>
      )}

      <div className="card text-center py-6 text-zinc-400">
        <MytaIcon name="friends" size={34} className="mx-auto mb-3 text-tta-mid" />
        <p className="text-sm font-semibold text-zinc-600">Tu consultes le profil de {cs.firstName}</p>
        <p className="text-xs mt-1">Le journal alimentaire ci-dessus est propre à {cs.firstName}.</p>
      </div>
    </div>
  )
}

/** Messages du « hub » d'onboarding affichés sur le dashboard selon l'étape. */
const ONBOARDING_HUB: Record<Exclude<OnboardingStep, 'done'>,
  { mode: 'nutrition' | 'sport'; title: string; message: string; cta: string }> = {
  profile: { mode: 'nutrition', title: 'Bienvenue sur MYTA',
    message: "Commençons par compléter ton profil : c'est lui qui personnalise tes calories, tes macros et les conseils de Waty.",
    cta: 'Compléter mon profil' },
  journal: { mode: 'nutrition', title: 'Profil prêt',
    message: 'Note ton premier repas (voix, photo ou texte) et regarde tes scores macro & micro s’adapter à toi.',
    cta: 'Aller au journal' },
  sport:   { mode: 'sport', title: 'Et côté sport ?',
    message: 'Enregistre ta première séance — décris-la simplement, Waty s’occupe du reste.',
    cta: 'Nouvelle séance' },
  sleep:   { mode: 'nutrition', title: 'Le sommeil compte aussi',
    message: 'Suis tes nuits pour un bilan complet de ta forme.',
    cta: 'Suivre mon sommeil' },
  account: { mode: 'nutrition', title: 'Dernière étape',
    message: 'Découvre ton compte et la gestion de ton abonnement.',
    cta: 'Voir mon compte' },
}

// ── Anneau de progression (calories du jour) ─────────────────────────────────
function Ring({ value, max, size = 132, stroke = 12, color = '#22C55E', children }: {
  value: number; max: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(value)} sur ${max}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--raised)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="animate-myta-ring" style={{ ['--ring-full' as any]: c }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

function Gauge({ label, value, max, unit, color, text }: { label: string; value: number; max: number; unit: string; color: string; text: string }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs font-bold">
        <span className="t-text">{label}</span>
        <span style={{ color: text }}>{value} / {max} {unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-raised overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function minutesToHm(min: number) {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export default function DashboardPage() {
  const [stats, setStats]         = useState<Stats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [period, setPeriod]       = useState<Period>('semaine')
  const [showModal, setShowModal] = useState(false)
  const [showTour,  setShowTour]  = useState(false)
  const [childStats, setChildStats] = useState<ChildStats | null>(null)

  const { step: obStep, skip: obSkip } = useOnboarding()

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Replay manuel du tour spotlight via ?tour=1 (depuis la page Guide).
    if (params.get('tour') === '1') {
      setShowTour(true)
      window.history.replaceState({}, '', '/dashboard')
    }
    // Arrivée depuis le tuto d'introduction (?welcome=1) : lancer le tour
    // spotlight automatiquement, une seule fois (skippable — croix / clic fond).
    if (params.get('welcome') === '1') {
      if (!localStorage.getItem('myta_guide_seen')) setShowTour(true)
      window.history.replaceState({}, '', '/dashboard')
    }
    // L'ancien WelcomeModal auto est remplacé par le parcours guidé (OnboardingCoach).
  }, [])

  function handleStartTour()  { localStorage.setItem('myta_guide_seen', '1'); setShowModal(false); setShowTour(true) }
  function handleCloseModal() { localStorage.setItem('myta_guide_seen', '1'); setShowModal(false) }
  function handleDoneTour()   { localStorage.setItem('myta_guide_seen', '1'); setShowTour(false) }

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    // ── Mode enfant ──────────────────────────────────────────────────────────
    const ap = getActiveProfile()
    if (ap.isChild && ap.childId) {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const today = todayISO()

      // Profil enfant
      const cpRes = await fetch(`/api/family/child?id=${ap.childId}`, { headers })
      const cp    = cpRes.ok ? await cpRes.json() : null

      // Entrées du jour
      const jRes  = await fetch(`/api/child-journal?child_id=${ap.childId}&date=${today}`, { headers })
      const entries: any[] = jRes.ok ? await jRes.json() : []

      const calToday = entries.reduce((s, e) => s + Number(e.cal ?? 0), 0)
      const prot     = entries.filter((e: any) => e.food_cat !== 'complément')
                              .reduce((s: number, e: any) => s + Number(e.prot ?? 0), 0)

      // Objectif calorique enfant (BMR × 1.4)
      let calTarget = 1800
      if (cp?.weight_kg && cp?.height_cm && cp?.birth_date) {
        const age = new Date().getFullYear() - new Date(cp.birth_date).getFullYear()
        const isFemale = ['female', 'fille', 'f'].includes((cp.gender ?? '').toLowerCase())
        const bmr = isFemale
          ? 10 * cp.weight_kg + 6.25 * cp.height_cm - 5 * age - 161
          : 10 * cp.weight_kg + 6.25 * cp.height_cm - 5 * age + 5
        calTarget = Math.max(1000, Math.round(bmr * 1.4))
      }

      setChildStats({
        firstName: ap.viewingName.split(' ')[0] || ap.viewingName,
        calToday,
        calTarget,
        prot,
      })
      setLoading(false)
      return
    }
    // ── Fin mode enfant ──────────────────────────────────────────────────────

    const today   = todayISO()
    const now     = new Date()
    const dateFrom = period === 'semaine'
      ? format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(startOfMonth(now), 'yyyy-MM-dd')
    const dateTo = period === 'semaine'
      ? format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(endOfMonth(now), 'yyyy-MM-dd')

    const [
      { data: prof },
      { data: journalToday },
      { data: journalPeriod },
      { data: sessions },
      { data: loggedDays },
      { data: completions },
      { data: lastMeals },
      { data: lastSessions },
      { data: lastSleeps },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('journal_entries').select('cal,prot').eq('user_id', user.id).eq('date', today),
      supabase.from('journal_entries').select('cal,prot').eq('user_id', user.id).gte('date', dateFrom).lte('date', dateTo),
      supabase.from('sessions').select('*').eq('user_id', user.id).gte('session_date', dateFrom).lte('session_date', dateTo),
      // Série cumulative = nombre de jours DISTINCTS loggés, compté côté base.
      // (L'ancienne requête ramenait toutes les lignes : plafonnée à 1 000
      //  lignes par Supabase → série figée et différente selon l'appareil.)
      supabase.rpc('logged_days_count', { p_user: user.id }),
      supabase.from('challenge_completions').select('challenge_key').eq('user_id', user.id).eq('completed_date', today),
      supabase.from('journal_entries').select('food_name,cal,prot,created_at,food_cat').eq('user_id', user.id).neq('food_cat', 'complément').order('created_at', { ascending: false }).limit(1),
      supabase.from('sessions').select('session_date,duration_min,calories_burned,notes,discipline_id').eq('user_id', user.id).order('session_date', { ascending: false }).limit(1),
      supabase.from('sleep_log').select('date,duration_min').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
    ])

    const calToday    = (journalToday ?? []).reduce((s, e) => s + Number(e.cal), 0)
    const protToday   = (journalToday ?? []).reduce((s, e) => s + Number((e as any).prot ?? 0), 0)
    const lm = (lastMeals ?? [])[0] as any
    const ls = (lastSessions ?? [])[0] as any
    const lz = (lastSleeps ?? [])[0] as any
    const calConsumed = (journalPeriod ?? []).reduce((s, e) => s + Number(e.cal), 0)
    const totalProt   = (journalPeriod ?? []).reduce((s, e) => s + Number(e.prot ?? 0), 0)
    const sessList    = sessions ?? []
    const calBurned   = sessList.reduce((s, e) => s + Number(e.calories_burned ?? 0), 0)
    const streak      = typeof loggedDays === 'number' ? loggedDays : 0
    const completed   = (completions ?? []).map(c => c.challenge_key)

    setStats({
      profile:             prof ?? null,
      calToday,
      calTarget:           prof?.calorie_target ?? 2000,
      calConsumed,
      calBurned,
      totalProt,
      weekSessions:        sessList.length,
      weekMinutes:         sessList.reduce((s, e) => s + Number(e.duration_min ?? 0), 0),
      streak,
      completedChallenges: completed,
      protToday,
      lastMeal:    lm ? { name: lm.food_name, cal: Number(lm.cal) || 0, prot: Number(lm.prot) || 0, at: lm.created_at ?? null } : null,
      lastSession: ls ? { label: (ls.notes || ls.discipline_id || 'Séance').toString().split('\n')[0].slice(0, 28), minutes: Number(ls.duration_min) || 0, cal: Number(ls.calories_burned) || 0, date: ls.session_date } : null,
      lastSleep:   lz ? { minutes: Number(lz.duration_min) || 0, date: lz.date } : null,
    })
    setLoading(false)
  }

  function handleChallengeComplete(key: string) {
    setStats(prev => prev
      ? { ...prev, completedChallenges: [...prev.completedChallenges, key] }
      : prev
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-nutri/30 border-t-nutri rounded-full animate-spin" />
    </div>
  )

  // Mode enfant — dashboard simplifié
  if (childStats) return <ChildDashboard cs={childStats} router={router} />

  const s            = stats!
  const firstName = s.profile?.full_name?.split(' ')[0] ?? ''
  const badge     = getBadgeFromStreak(s.streak)
  const challenges = getChallengesForToday()
  const dailyTip  = getDailyTip({
    goal:             s.profile?.goal ?? null,
    healthConditions: (s.profile as any)?.health_conditions ?? [],
    smokingGoal:      (s.profile as any)?.smoking_goal ?? false,
    condition:        (s.profile as any)?.condition ?? null,
  })

  const profileIncomplete = !s.profile?.weight_kg || !s.profile?.height_cm || !s.profile?.birth_date

  const watyMsg = getWatyProactifMessage({
    firstName,
    goal:         s.profile?.goal ?? null,
    calToday:     s.calToday,
    calTarget:    s.calTarget,
    streak:       s.streak,
    weekSessions: s.weekSessions,
  })

  const remaining  = Math.max(0, Math.round(s.calTarget - s.calToday))
  const protTarget = s.profile?.prot_target ?? Math.round((s.profile?.weight_kg ?? 70) * 1.6)
  const nextBadge  = getNextBadge(s.streak)
  const badgePct   = nextBadge ? Math.min(100, Math.round(s.streak / nextBadge.minStreak * 100)) : 100
  const relDay = (iso: string) => {
    const d = new Date(iso + 'T00:00:00'); const t = new Date(todayISO() + 'T00:00:00')
    const diff = Math.round((t.getTime() - d.getTime()) / 86400000)
    return diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : format(d, 'EEE d MMM', { locale: fr })
  }

  return (
    <div className="page">

      {showModal && <WelcomeModal onStartTour={handleStartTour} onClose={handleCloseModal} />}
      {showTour  && <TourGuide onDone={handleDoneTour} />}

      {/* ── Salutation + série ── */}
      <div id="tour-greeting" className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[1px] t-muted capitalize">
            {format(new Date(), 'EEEE d MMMM', { locale: fr })}
          </p>
          <h1 className="text-[28px] font-extrabold tracking-tight t-text leading-tight mt-0.5 truncate">
            Bonjour{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <button onClick={() => router.push('/bilan')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-extrabold flex-shrink-0 ${s.streak > 0 ? 'bg-orange-50 text-orange-700' : 'bg-raised t-muted'}`}>
          <MytaIcon name="flame" size={14} />{s.streak} j
        </button>
      </div>

      {/* ── Onboarding guidé : hub Waty (pointe vers l'étape en cours) ── */}
      {obStep && obStep !== 'done' && (
        <OnboardingCoach
          mode={ONBOARDING_HUB[obStep].mode}
          title={ONBOARDING_HUB[obStep].title}
          message={ONBOARDING_HUB[obStep].message}
          ctaLabel={ONBOARDING_HUB[obStep].cta}
          onCta={() => router.push(ONBOARDING_ROUTE[obStep])}
          onSkip={obSkip}
        />
      )}

      {/* ── Profil incomplet : Waty ne peut pas calculer les besoins ── */}
      {!(obStep && obStep !== 'done') && profileIncomplete && (
        <OnboardingCoach
          mode="nutrition"
          title="Paramétrons ton profil"
          message="Pour calculer tes besoins (calories, protéines, glucides, lipides) et te donner des conseils vraiment adaptés, il me faut ton poids, ta taille et ta date de naissance. Deux minutes suffisent."
          ctaLabel="Paramétrer mon profil"
          onCta={() => router.push('/profile')}
        />
      )}

      {/* ── Anneau calories + jauges ── */}
      <button onClick={() => router.push('/nutrition/journal')} className="card-hero flex items-center gap-4 text-left active:scale-[0.99] transition-transform">
        <Ring value={s.calToday} max={s.calTarget}>
          <span className="text-[26px] font-extrabold tracking-tight t-text leading-none">{Math.round(s.calToday).toLocaleString('fr-FR')}</span>
          <span className="text-[11px] font-bold t-muted mt-1">/ {s.calTarget.toLocaleString('fr-FR')} kcal</span>
        </Ring>
        <div className="flex-1 flex flex-col gap-2.5 min-w-0">
          <p className="text-xs font-bold t-muted">
            {remaining > 0 ? <>Il te reste <span className="t-text font-extrabold">{remaining.toLocaleString('fr-FR')} kcal</span></> : <span className="t-text font-extrabold">Objectif du jour atteint</span>}
          </p>
          <Gauge label="Protéines" value={Math.round(s.protToday)} max={protTarget} unit="g" color="#4B47A0" text="#4B47A0" />
          <Gauge label="Sport (semaine)" value={s.weekSessions} max={3} unit="séances" color="#7B7FD4" text="#5C60C0" />
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="t-text">Sommeil</span>
              <span style={{ color: '#6D28D9' }}>{s.lastSleep ? minutesToHm(s.lastSleep.minutes) : '—'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-raised overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.lastSleep ? Math.min(100, Math.round(s.lastSleep.minutes / 480 * 100)) : 0}%`, background: '#8B5CF6' }} />
            </div>
          </div>
        </div>
      </button>

      {/* ── Série + badge compact ── */}
      {badge && (
        <button onClick={() => router.push('/friends')} className="card-sm flex items-center gap-3 text-left">
          <div className="w-11 h-11 rounded-[14px] bg-orange-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {badge.image
              ? <img src={badge.image} alt="" className="w-9 h-9 object-contain" />
              : <MytaIllustration name="trophee" size={36} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-extrabold t-text truncate">{badge.label}</p>
              <p className="text-xs font-bold t-muted flex-shrink-0">{s.streak} / {nextBadge ? nextBadge.minStreak : s.streak} j</p>
            </div>
            <div className="h-1.5 rounded-full bg-raised overflow-hidden mt-1.5">
              <div className="h-full rounded-full" style={{ width: `${badgePct}%`, background: 'linear-gradient(90deg,#F97316,#FBBF24)' }} />
            </div>
            <p className="text-[11px] font-semibold t-muted mt-1.5 truncate">
              {nextBadge
                ? <>Plus que {nextBadge.minStreak - s.streak} jour{nextBadge.minStreak - s.streak > 1 ? 's' : ''} avant <span className="t-text font-extrabold">{nextBadge.label}</span></>
                : <>Niveau maximal atteint</>}
            </p>
          </div>
        </button>
      )}

      {/* ── Tuiles données : dernier repas / dernière séance ── */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => router.push('/nutrition/journal')} className="card-sm p-3.5 text-left flex flex-col active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <MytaIllustration name={s.lastMeal ? 'repas' : 'vide'} size={40} />
            <span className="text-[11px] font-bold t-muted">{s.lastMeal?.at ? format(new Date(s.lastMeal.at), 'HH:mm') : ''}</span>
          </div>
          <p className="text-xs font-bold t-muted mt-2.5">Dernier repas</p>
          <p className="text-sm font-extrabold t-text leading-tight mt-0.5 line-clamp-2">{s.lastMeal?.name ?? 'Rien de noté'}</p>
          <p className="text-xs font-bold text-green-700 mt-1.5">{s.lastMeal ? `${Math.round(s.lastMeal.cal)} kcal · ${Math.round(s.lastMeal.prot)} g prot.` : 'Ajoute ton premier repas'}</p>
        </button>
        <button onClick={() => router.push(s.lastSession ? '/sport/history' : '/sport/session')} className="card-sm p-3.5 text-left flex flex-col active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <MytaIllustration name="seance" size={40} />
            <span className="text-[11px] font-bold t-muted">{s.lastSession ? relDay(s.lastSession.date) : ''}</span>
          </div>
          <p className="text-xs font-bold t-muted mt-2.5">Dernière séance</p>
          <p className="text-sm font-extrabold t-text leading-tight mt-0.5 line-clamp-2">{s.lastSession ? `${s.lastSession.label} · ${s.lastSession.minutes} min` : 'Aucune séance'}</p>
          <p className="text-xs font-bold text-tta-mid mt-1.5">{s.lastSession ? `${Math.round(s.lastSession.cal)} kcal brûlées` : 'Logger une séance'}</p>
        </button>
      </div>

      {/* ── Waty : conseil du jour + bilan 7 j ── */}
      <div className="rounded-3xl p-4 text-white flex flex-col gap-2.5"
        style={{ background: 'linear-gradient(135deg, #2D2A5E 0%, #4B47A0 60%, #5C60C0 100%)', boxShadow: '0 14px 32px rgba(45,42,94,0.28)' }}>
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><MytaIllustration name="waty" size={34} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.8px] opacity-75">Waty · conseil du jour</p>
            <p className="text-sm font-extrabold leading-tight truncate">{dailyTip.title}</p>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed opacity-90">{watyMsg}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <button onClick={() => router.push('/bilan?section=rapport')} className="bg-white text-tta font-extrabold text-[13px] px-3.5 py-2 rounded-full active:scale-95 transition-transform">
            Voir le bilan 7 jours
          </button>
          <button onClick={() => router.push('/nutrition/advice')} className="text-[13px] font-bold opacity-85 px-2">Lire le conseil</button>
        </div>
      </div>

      {/* ── Challenge du jour ── */}
      <ChallengeCard
        challenges={challenges}
        completedKeys={s.completedChallenges}
        onComplete={handleChallengeComplete}
      />

      {/* ── Objectifs semaine/mois ── */}
      <div id="tour-objectives" className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-zinc-900">
            <span className="inline-flex items-center gap-2">
              <MytaIcon name="target" size={16} className="text-tta-mid" />
              {period === 'semaine' ? 'Mes objectifs de la semaine' : 'Mes objectifs du mois'}
            </span>
          </h2>
          <div className="flex bg-zinc-100 rounded-2xl p-0.5 gap-0.5">
            {(['semaine', 'mois'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${period === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {!s.profile?.calorie_target ? (
          <div className="text-center py-4">
            <p className="text-sm text-zinc-400">Renseigne tes objectifs dans le profil</p>
            <button onClick={() => router.push('/profile')} className="mt-2 text-xs font-bold text-tta-mid hover:underline">
              Configurer mon profil →
            </button>
          </div>
        ) : period === 'semaine' ? (
          <div className="flex flex-col gap-4">
            {(() => {
              const days    = 7
              const calObj  = (s.profile?.calorie_target ?? 2000) * days
              const protObj = (s.profile?.prot_target ?? 120) * days
              const calPct2 = calObj  > 0 ? Math.min(150, Math.round((s.calConsumed / calObj)  * 100)) : 0
              const protPct = protObj > 0 ? Math.min(150, Math.round((s.totalProt   / protObj)  * 100)) : 0
              const sportPct = Math.min(150, Math.round((s.weekSessions / 3) * 100))
              const burnPct  = Math.min(150, Math.round((s.calBurned / 1500) * 100))

              return [
                { label: 'Calories consommées', current: Math.round(s.calConsumed), target: calObj,   pct: calPct2,  unit: 'kcal',    color: '#f97316', icon: 'flame' as const },
                { label: 'Protéines',            current: Math.round(s.totalProt),  target: protObj,  pct: protPct,  unit: 'g',       color: '#3b82f6', icon: 'journal' as const },
                { label: 'Séances sport',         current: s.weekSessions,          target: 3,        pct: sportPct, unit: 'séances', color: '#7b7fd4', icon: 'sport' as const },
                { label: 'Calories brûlées',      current: Math.round(s.calBurned), target: 1500,     pct: burnPct,  unit: 'kcal',    color: '#22c55e', icon: 'flame' as const },
              ].map(obj => (
                <div key={obj.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-600 inline-flex items-center gap-1.5">
                      <MytaIcon name={obj.icon} size={13} style={{ color: obj.color }} /> {obj.label}
                    </span>
                    <span className="text-xs text-zinc-400">
                      <span className="font-bold" style={{ color: obj.color }}>{obj.current}</span> / {obj.target} {obj.unit}
                    </span>
                  </div>
                  <div className="relative h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, obj.pct)}%`, background: obj.pct >= 100 ? obj.color : `${obj.color}99` }} />
                  </div>
                  <div className="flex justify-end mt-0.5">
                    <span className={`text-[10px] font-bold ${obj.pct >= 100 ? 'text-nutri-mid' : obj.pct >= 70 ? 'text-yellow-500' : 'text-zinc-400'}`}>
                      {obj.pct}%
                    </span>
                  </div>
                </div>
              ))
            })()}
          </div>
        ) : (
          <MonthProgress
            calConsumed={s.calConsumed}
            calTarget={s.profile?.calorie_target ?? 2000}
            sessions={s.weekSessions}
            sessionTarget={12}
            calBurned={s.calBurned}
          />
        )}
      </div>

    </div>
  )
}
