'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowRight, ChevronRight, Zap, Flame, Dumbbell, TrendingUp } from 'lucide-react'
import { cn, todayISO, minutesToHuman } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Waty, getWatyMessage } from '@/components/ui/Waty'
import type { Profile, Session } from '@/types'

interface DashStats {
  profile: Profile | null
  calToday: number
  calTarget: number
  weekSessions: number
  weekCalBurned: number
  weekMinutes: number
  lastSession: Session | null
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const today     = todayISO()
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd   = format(endOfWeek(new Date(),   { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const [{ data: prof }, { data: journal }, { data: weekData }, { data: lastSess }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('journal_entries').select('cal').eq('user_id', user.id).eq('date', today),
      supabase.from('sessions').select('*').eq('user_id', user.id).gte('session_date', weekStart).lte('session_date', weekEnd),
      supabase.from('sessions').select('*, discipline:disciplines(*)').eq('user_id', user.id).order('session_date', { ascending: false }).limit(1),
    ])

    const calToday = (journal ?? []).reduce((s, e) => s + Number(e.cal), 0)
    const weekSess = weekData ?? []

    setStats({
      profile: prof ?? null,
      calToday,
      calTarget:    prof?.calorie_target ?? 2000,
      weekSessions: weekSess.length,
      weekCalBurned: weekSess.reduce((s, e) => s + (e.calories_burned ?? 0), 0),
      weekMinutes:  weekSess.reduce((s, e) => s + (e.duration_min ?? 0), 0),
      lastSession:  lastSess?.[0] ?? null,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-nutri-mid/30 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const s = stats!
  const calPct = Math.min(100, Math.round((s.calToday / s.calTarget) * 100))
  const firstName = s.profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="page">

      {/* ── Header salutation ── */}
      <div>
        <p className="text-zinc-400 text-sm capitalize">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
        <h1 className="text-2xl font-extrabold text-zinc-900 mt-0.5">
          Bonjour{firstName ? `, ${firstName}` : ''} 👋
        </h1>
      </div>

      {/* ── Waty ── */}
      {(() => {
        const { message, mode } = getWatyMessage({
          type: 'dashboard',
          calToday: s.calToday,
          calTarget: s.calTarget,
          weekSessions: s.weekSessions,
          isEmpty: !s.profile?.full_name,
        })
        return <Waty mode={mode} message={message} size="md" />
      })()}

      {/* ── Module Nutrition ── */}
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

      {/* ── Module Sport ── */}
      <button onClick={() => router.push('/sport/session')}
        className="w-full text-left bg-gradient-to-br from-tta-mid to-sport rounded-3xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/25 rounded-2xl flex items-center justify-center text-xl">🏋️</div>
            <span className="font-extrabold text-white text-lg">Sport</span>
          </div>
          <span className="text-xs font-bold bg-white/25 text-white px-3 py-1 rounded-full">Cette semaine</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Séances',      value: s.weekSessions },
            { label: 'Cal. brûlées', value: Math.round(s.weekCalBurned) },
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

      {/* ── KPIs colorés ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Kcal aujourd'hui", value: Math.round(s.calToday), icon: '🔥', bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100' },
          { label: 'Séances / semaine', value: s.weekSessions,         icon: '🏋️', bg: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-100' },
          { label: "Min d'entraînement", value: s.weekMinutes,         icon: '⏱️', bg: 'bg-blue-50',   text: 'text-blue-500',   border: 'border-blue-100' },
          { label: 'Cal. brûlées',       value: Math.round(s.weekCalBurned), icon: '⚡', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
        ].map(({ label, value, icon, bg, text, border }) => (
          <div key={label} className={cn('rounded-3xl p-4 border', bg, border)}>
            <span className="text-2xl">{icon}</span>
            <p className={cn('text-2xl font-extrabold mt-1', text)}>{value}</p>
            <p className="text-xs text-zinc-400 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Dernière séance ── */}
      {s.lastSession && (
        <button onClick={() => router.push('/sport/history')}
          className="card flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98]">
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Dernière séance</p>
            <p className="font-extrabold text-zinc-900">
              {(s.lastSession as any).discipline?.name ?? 'Séance'}
            </p>
            <p className="text-sm text-zinc-400">
              {s.lastSession.session_date} · {minutesToHuman(s.lastSession.duration_min)}
            </p>
          </div>
          <div className="w-10 h-10 bg-sport-light rounded-2xl flex items-center justify-center">
            <ChevronRight size={18} className="text-sport" />
          </div>
        </button>
      )}
    </div>
  )
}
