'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Flame, Dumbbell, Salad, TrendingUp,
  ArrowRight, ChevronRight, Zap,
} from 'lucide-react'
import { cn, todayISO, minutesToHuman } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Profile, Session, JournalEntry } from '@/types'

interface DashStats {
  profile: Profile | null
  // Nutrition today
  calToday: number
  calTarget: number
  // Sport this week
  weekSessions: number
  weekCalBurned: number
  weekMinutes: number
  streak: number
  // Recent
  lastSession: Session | null
}

export default function DashboardPage() {
  const [stats, setStats]   = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const today      = todayISO()
    const weekStart  = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd    = format(endOfWeek(new Date(),   { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const [
      { data: prof },
      { data: journal },
      { data: weekData },
      { data: lastSess },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('journal_entries').select('cal').eq('user_id', user.id).eq('date', today),
      supabase.from('sessions').select('*').eq('user_id', user.id).gte('session_date', weekStart).lte('session_date', weekEnd),
      supabase.from('sessions').select('*, discipline:disciplines(*)').eq('user_id', user.id).order('session_date', { ascending: false }).limit(1),
    ])

    const calToday = (journal ?? []).reduce((s, e) => s + Number(e.cal), 0)
    const weekSess = weekData ?? []

    setStats({
      profile:      prof ?? null,
      calToday,
      calTarget:    prof?.calorie_target ?? 2000,
      weekSessions: weekSess.length,
      weekCalBurned: weekSess.reduce((s, e) => s + (e.calories_burned ?? 0), 0),
      weekMinutes:  weekSess.reduce((s, e) => s + (e.duration_min ?? 0), 0),
      streak:       0,
      lastSession:  lastSess?.[0] ?? null,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-tta-mid border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const s = stats!
  const calPct = Math.min(100, Math.round((s.calToday / s.calTarget) * 100))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <p className="text-zinc-400 text-sm capitalize">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">
          Bonjour{s.profile?.full_name ? `, ${s.profile.full_name.split(' ')[0]}` : ''} 👋
        </h1>
      </div>

      {/* Twin modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Module Nutrition */}
        <button
          onClick={() => router.push('/nutrition/journal')}
          className="card text-left hover:border-nutri/40 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-nutri-light rounded-lg flex items-center justify-center">
                <Salad size={16} className="text-nutri-dark" />
              </div>
              <span className="font-semibold text-zinc-900">Nutrition</span>
            </div>
            <span className="badge-nutri">Aujourd'hui</span>
          </div>

          {/* Calories bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>{Math.round(s.calToday)} kcal consommées</span>
              <span>{s.calTarget} kcal objectif</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-nutri rounded-full transition-all"
                style={{ width: `${calPct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">{calPct}% de l'objectif</p>
          </div>

          <div className="flex items-center gap-1 text-sm text-nutri font-medium group-hover:gap-2 transition-all">
            Ouvrir le journal <ArrowRight size={14} />
          </div>
        </button>

        {/* Module Sport */}
        <button
          onClick={() => router.push('/sport/session')}
          className="card text-left hover:border-tta-mid/40 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-tta-light rounded-lg flex items-center justify-center">
                <Dumbbell size={16} className="text-tta-mid" />
              </div>
              <span className="font-semibold text-zinc-900">Sport</span>
            </div>
            <span className="badge-sport">Cette semaine</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Séances', value: s.weekSessions },
              { label: 'Cal. brûlées', value: Math.round(s.weekCalBurned) },
              { label: 'Temps', value: minutesToHuman(s.weekMinutes) },
            ].map(({ label, value }) => (
              <div key={label} className="kpi-card text-center p-2">
                <p className="text-base font-bold text-zinc-900">{value}</p>
                <p className="text-xs text-zinc-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 text-sm text-tta-mid font-medium group-hover:gap-2 transition-all">
            Nouvelle séance <ArrowRight size={14} />
          </div>
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Kcal aujourd\'hui', value: Math.round(s.calToday), icon: Flame, color: 'text-orange-500' },
          { label: 'Séances / semaine', value: s.weekSessions, icon: Dumbbell, color: 'text-tta-mid' },
          { label: 'Min d\'entraînement', value: s.weekMinutes, icon: TrendingUp, color: 'text-swim' },
          { label: 'Cal. brûlées', value: Math.round(s.weekCalBurned), icon: Zap, color: 'text-cardio' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="kpi-card">
            <Icon size={18} className={cn(color, 'mb-1')} />
            <p className="text-xl font-bold text-zinc-900">{value}</p>
            <p className="text-xs text-zinc-400 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Dernière séance */}
      {s.lastSession && (
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Dernière séance</p>
            <p className="font-medium text-zinc-900">
              {(s.lastSession as any).discipline?.name ?? 'Séance'}
            </p>
            <p className="text-sm text-zinc-500">
              {s.lastSession.session_date} · {minutesToHuman(s.lastSession.duration_min)}
            </p>
          </div>
          <button
            onClick={() => router.push('/sport/history')}
            className="btn-ghost"
          >
            Historique <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
