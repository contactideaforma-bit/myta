'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
// WeightChart et MonthProgress déplacés vers journal/profil
import { fr } from 'date-fns/locale'
import { ArrowRight, Loader2, Baby } from 'lucide-react'
import { todayISO, minutesToHuman } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Waty } from '@/components/ui/Waty'
import { WelcomeModal } from '@/components/ui/WelcomeModal'
import { TourGuide } from '@/components/ui/TourGuide'
import { BadgeDisplay } from '@/components/ui/BadgeDisplay'
import { ChallengeCard } from '@/components/ui/ChallengeCard'
import {
  calcStreak, getBadgeFromStreak,
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

  const items = [
    { label: 'Nutrition',    pct: calPct,  icon: '🥗', color: '#f97316' },
    { label: 'Séances',      pct: sesPct,  icon: '🏋️', color: '#7b7fd4' },
    { label: 'Cal. brûlées', pct: burnPct, icon: '⚡',  color: '#22c55e' },
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
            <span className="text-xs text-zinc-600">{icon} {label}</span>
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
          <Baby size={22} className="text-amber-600" />
        </div>
        <div>
          <p className="text-amber-600 text-sm font-medium capitalize">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
          <h1 className="text-2xl font-extrabold text-zinc-900">
            Bonjour{cs.firstName ? `, ${cs.firstName}` : ''} 👋
          </h1>
        </div>
      </div>

      {/* Calories du jour */}
      <button onClick={() => router.push('/nutrition/journal')}
        className="w-full text-left bg-gradient-to-br from-nutri to-nutri-mid rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/25 rounded-2xl flex items-center justify-center text-xl">🥗</div>
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
          Ouvrir le journal <ArrowRight size={14} />
        </div>
      </button>

      {/* Protéines */}
      {cs.prot > 0 && (
        <div className="card flex items-center gap-4">
          <div className="text-3xl">💪</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-zinc-800">Protéines aujourd'hui</p>
            <p className="text-2xl font-black text-blue-600">{Math.round(cs.prot)} <span className="text-sm font-semibold text-zinc-400">g</span></p>
          </div>
        </div>
      )}

      <div className="card text-center py-6 text-zinc-400">
        <p className="text-4xl mb-3">👨‍👩‍👧</p>
        <p className="text-sm font-semibold text-zinc-600">Tu consultes le profil de {cs.firstName}</p>
        <p className="text-xs mt-1">Le journal alimentaire ci-dessus est propre à {cs.firstName}.</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]         = useState<Stats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [period, setPeriod]       = useState<Period>('semaine')
  const [showModal, setShowModal] = useState(false)
  const [showTour,  setShowTour]  = useState(false)
  const [childStats, setChildStats] = useState<ChildStats | null>(null)

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tour') === '1') {
      setShowTour(true)
      window.history.replaceState({}, '', '/dashboard')
      return
    }
    const seen = localStorage.getItem('myta_guide_seen')
    if (!seen) setShowModal(true)
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
    const from90  = format(subDays(now, 90), 'yyyy-MM-dd')

    const [
      { data: prof },
      { data: journalToday },
      { data: journalPeriod },
      { data: sessions },
      { data: journalDates },
      { data: completions },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('journal_entries').select('cal').eq('user_id', user.id).eq('date', today),
      supabase.from('journal_entries').select('cal,prot').eq('user_id', user.id).gte('date', dateFrom).lte('date', dateTo),
      supabase.from('sessions').select('*').eq('user_id', user.id).gte('session_date', dateFrom).lte('session_date', dateTo),
      supabase.from('journal_entries').select('date').eq('user_id', user.id).gte('date', from90),
      supabase.from('challenge_completions').select('challenge_key').eq('user_id', user.id).eq('completed_date', today),
    ])

    const calToday    = (journalToday ?? []).reduce((s, e) => s + Number(e.cal), 0)
    const calConsumed = (journalPeriod ?? []).reduce((s, e) => s + Number(e.cal), 0)
    const totalProt   = (journalPeriod ?? []).reduce((s, e) => s + Number(e.prot ?? 0), 0)
    const sessList    = sessions ?? []
    const calBurned   = sessList.reduce((s, e) => s + Number(e.calories_burned ?? 0), 0)
    const dates       = (journalDates ?? []).map(r => r.date)
    const streak      = calcStreak(dates)
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
  const calPct    = Math.min(100, s.calTarget > 0 ? Math.round((s.calToday / s.calTarget) * 100) : 0)
  const firstName = s.profile?.full_name?.split(' ')[0] ?? ''
  const badge     = getBadgeFromStreak(s.streak)
  const challenges = getChallengesForToday()
  const dailyTip  = getDailyTip({
    goal:             s.profile?.goal ?? null,
    healthConditions: (s.profile as any)?.health_conditions ?? [],
    smokingGoal:      (s.profile as any)?.smoking_goal ?? false,
  })

  const watyMsg = getWatyProactifMessage({
    firstName,
    goal:         s.profile?.goal ?? null,
    calToday:     s.calToday,
    calTarget:    s.calTarget,
    streak:       s.streak,
    weekSessions: s.weekSessions,
  })

  return (
    <div className="page">

      {showModal && <WelcomeModal onStartTour={handleStartTour} onClose={handleCloseModal} />}
      {showTour  && <TourGuide onDone={handleDoneTour} />}

      {/* ── Salutation — header lavande ── */}
      <div
        id="tour-greeting"
        className="rounded-3xl px-5 py-4"
        style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(196,181,253,0.12) 100%)', border: '1px solid rgba(167,139,250,0.25)' }}
      >
        <p className="text-violet-400 text-sm capitalize font-medium">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
        <h1 className="text-2xl font-extrabold text-zinc-900 mt-0.5">
          Bonjour{firstName ? `, ${firstName}` : ''} 👋
        </h1>
      </div>

      {/* ── Waty proactif ── */}
      <div className="card bg-tta-light border border-tta-mid/20 flex items-start gap-3">
        <img src="/waty-nutrition.png" alt="Waty" className="w-12 h-12 object-contain flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-tta-mid mb-1">Waty te parle :</p>
          <p className="text-sm text-zinc-700 leading-relaxed">{watyMsg}</p>
        </div>
      </div>

      {/* ── Série + Badge ── */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-zinc-900 text-sm">🔥 Ma série</h2>
          <span className={`text-xl font-black ${s.streak > 0 ? 'text-orange-500' : 'text-zinc-300'}`}>
            {s.streak} jour{s.streak > 1 ? 's' : ''}
          </span>
        </div>

        {badge && <BadgeDisplay badge={badge} streak={s.streak} size="sm" />}
      </div>

      {/* ── Raccourcis rapides ── */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push('/nutrition/journal')}
          className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-orange-50 border border-orange-100 hover:bg-orange-100 active:scale-[0.97] transition-all"
        >
          <span className="text-lg">🥗</span>
          <span className="text-xs font-bold text-orange-700 leading-tight">Journal<br/>alimentaire</span>
          <ArrowRight size={12} className="ml-auto text-orange-400 flex-shrink-0" />
        </button>
        <button
          onClick={() => router.push('/sport/session')}
          className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 active:scale-[0.97] transition-all"
        >
          <span className="text-lg">🏋️</span>
          <span className="text-xs font-bold text-indigo-700 leading-tight">Séance<br/>de sport</span>
          <ArrowRight size={12} className="ml-auto text-indigo-400 flex-shrink-0" />
        </button>
      </div>

      {/* ── Bilan IA 7j ── */}
      <button
        onClick={() => router.push('/profile?section=rapport')}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
        style={{ background: 'linear-gradient(90deg, #4B47A0, #7b7fd4)' }}
      >
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">📊</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Bilan santé 7 jours — Waty IA</p>
          <p className="text-xs text-white/70">Analyse personnalisée de ta semaine</p>
        </div>
        <ArrowRight size={16} className="text-white/60 flex-shrink-0" />
      </button>

      {/* ── Challenge du jour ── */}
      <ChallengeCard
        challenges={challenges}
        completedKeys={s.completedChallenges}
        onComplete={handleChallengeComplete}
      />

      {/* ── Actu du jour ── */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-zinc-900 text-sm flex items-center gap-1.5">
            📰 Actu du jour
          </h2>
          <span className="text-[10px] text-zinc-400 bg-zinc-50 px-2 py-1 rounded-full">
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="flex items-start gap-3 bg-zinc-50 rounded-2xl px-4 py-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{dailyTip.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-900 leading-tight">{dailyTip.title}</p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{dailyTip.body}</p>
            {dailyTip.source && (
              <p className="text-[10px] text-zinc-400 mt-1.5 italic">Source : {dailyTip.source}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Objectifs semaine/mois ── */}
      <div id="tour-objectives" className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-zinc-900">🎯 Mes objectifs</h2>
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
                { label: 'Calories consommées', current: Math.round(s.calConsumed), target: calObj,   pct: calPct2,  unit: 'kcal',    color: '#f97316', icon: '🔥' },
                { label: 'Protéines',            current: Math.round(s.totalProt),  target: protObj,  pct: protPct,  unit: 'g',       color: '#3b82f6', icon: '💪' },
                { label: 'Séances sport',         current: s.weekSessions,          target: 3,        pct: sportPct, unit: 'séances', color: '#7b7fd4', icon: '🏋️' },
                { label: 'Calories brûlées',      current: Math.round(s.calBurned), target: 1500,     pct: burnPct,  unit: 'kcal',    color: '#22c55e', icon: '⚡' },
              ].map(obj => (
                <div key={obj.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-600">{obj.icon} {obj.label}</span>
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

      {/* ── Nutrition aujourd'hui ── */}
      <button id="tour-nutrition" onClick={() => router.push('/nutrition/journal')}
        className="w-full text-left bg-gradient-to-br from-nutri to-nutri-mid rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/25 rounded-2xl flex items-center justify-center text-xl">🥗</div>
            <span className="font-extrabold text-white text-lg">Nutrition</span>
          </div>
          <span className="text-xs font-bold bg-white/25 text-white px-3 py-1 rounded-full">Aujourd'hui</span>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/80 mb-2">
            <span className="font-bold">{Math.round(s.calToday)} kcal consommées</span>
            <span>{s.calTarget} kcal objectif</span>
          </div>
          <div className="h-2.5 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${calPct}%` }} />
          </div>
          <p className="text-xs text-white/70 mt-1">{calPct}% de l'objectif</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-white font-bold group-hover:gap-2 transition-all">
          Ouvrir le journal <ArrowRight size={14} />
        </div>
      </button>

      {/* ── Sport ── */}
      <button id="tour-sport" onClick={() => router.push('/sport/session')}
        className="w-full text-left bg-gradient-to-br from-sport to-tta-mid rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/25 rounded-2xl flex items-center justify-center text-xl">🏋️</div>
            <span className="font-extrabold text-white text-lg">Sport</span>
          </div>
          <span className="text-xs font-bold bg-white/25 text-white px-3 py-1 rounded-full capitalize">{period}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Séances',      value: s.weekSessions },
            { label: 'Cal. brûlées', value: Math.round(s.calBurned) },
            { label: 'Temps',        value: minutesToHuman(s.weekMinutes) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/20 rounded-2xl p-2.5 text-center">
              <p className="text-lg font-extrabold text-white">{value}</p>
              <p className="text-[10px] text-white/70">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-sm text-white font-bold group-hover:gap-2 transition-all">
          Nouvelle séance <ArrowRight size={14} />
        </div>
      </button>

    </div>
  )
}
