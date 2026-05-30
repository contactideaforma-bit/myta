'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { cn, todayISO, minutesToHuman } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Waty } from '@/components/ui/Waty'
import type { Profile, Session } from '@/types'

type Period = 'semaine' | 'mois'

interface Stats {
  profile: Profile | null
  calToday: number
  calTarget: number
  calConsumed: number
  calBurned: number
  totalProt: number
  weekSessions: number
  weekMinutes: number
  lastSession: Session | null
}

function getWatyBilanMessage(calConsumed: number, calBurned: number, calTarget: number, period: Period): string {
  const net    = calConsumed - calBurned
  const days   = period === 'semaine' ? 7 : 30
  const target = calTarget * days
  const deficit = net - target

  if (calConsumed === 0) return "Commence à noter tes repas pour que je puisse analyser ton bilan calorique ! 📝"
  if (calBurned === 0 && calConsumed > 0) return `Tu as consommé ${Math.round(calConsumed)} kcal cette ${period}. Ajoute des séances sport pour brûler des calories ! 🏋️`

  if (deficit < -500 * days / 7) return `Excellent déficit calorique de ${Math.abs(Math.round(deficit))} kcal ! Tu es bien sur la voie de la perte de poids 🎯`
  if (deficit < 0) return `Beau travail ! Tu es en déficit de ${Math.abs(Math.round(deficit))} kcal. Continue comme ça 💪`
  if (deficit < 200 * days / 7) return `Tu es presque à l'équilibre — ${Math.round(deficit)} kcal de surplus. C'est parfait pour le maintien ⚖️`
  return `Tu es en surplus de ${Math.round(deficit)} kcal cette ${period}. Ajoute une séance ou allège un peu les repas 😊`
}

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState<Period>('semaine')
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const today    = todayISO()
    const now      = new Date()
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
      { data: lastSess },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('journal_entries').select('cal').eq('user_id', user.id).eq('date', today),
      supabase.from('journal_entries').select('cal,prot').eq('user_id', user.id).gte('date', dateFrom).lte('date', dateTo),
      supabase.from('sessions').select('*').eq('user_id', user.id).gte('session_date', dateFrom).lte('session_date', dateTo),
      supabase.from('sessions').select('*, discipline:disciplines(*)').eq('user_id', user.id).order('session_date', { ascending: false }).limit(1),
    ])

    const calToday    = (journalToday ?? []).reduce((s, e) => s + Number(e.cal), 0)
    const calConsumed = (journalPeriod ?? []).reduce((s, e) => s + Number(e.cal), 0)
    const totalProt   = (journalPeriod ?? []).reduce((s, e) => s + Number(e.prot ?? 0), 0)
    const sessList    = sessions ?? []
    const calBurned   = sessList.reduce((s, e) => s + Number(e.calories_burned ?? 0), 0)

    setStats({
      profile:      prof ?? null,
      calToday,
      calTarget:    prof?.calorie_target ?? 2000,
      calConsumed,
      calBurned,
      totalProt,
      weekSessions: sessList.length,
      weekMinutes:  sessList.reduce((s, e) => s + Number(e.duration_min ?? 0), 0),
      lastSession:  lastSess?.[0] ?? null,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-nutri/30 border-t-nutri rounded-full animate-spin" />
    </div>
  )

  const s       = stats!
  const calPct  = Math.min(100, s.calTarget > 0 ? Math.round((s.calToday / s.calTarget) * 100) : 0)
  const netCal  = Math.round(s.calConsumed - s.calBurned)
  const firstName = s.profile?.full_name?.split(' ')[0] ?? ''

  const bilanMsg = getWatyBilanMessage(s.calConsumed, s.calBurned, s.calTarget, period)

  return (
    <div className="page">

      {/* ── Salutation ── */}
      <div>
        <p className="text-zinc-400 text-sm capitalize">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
        <h1 className="text-2xl font-extrabold text-zinc-900 mt-0.5">
          Bonjour{firstName ? `, ${firstName}` : ''} 👋
        </h1>
      </div>

      {/* ── Objectifs semaine/mois avec curseurs ── */}
      <div className="card flex flex-col gap-4">
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
            <p className="text-sm text-zinc-400">Renseigne tes objectifs dans le profil pour voir ta progression</p>
            <button onClick={() => router.push('/profile')}
              className="mt-2 text-xs font-bold text-tta-mid hover:underline">
              Configurer mon profil →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {(() => {
              const days     = period === 'semaine' ? 7 : 30
              const calObj   = (s.profile?.calorie_target ?? 2000) * days
              const protObj  = (s.profile?.prot_target ?? 120) * days
              const calPct   = calObj  > 0 ? Math.min(150, Math.round((s.calConsumed  / calObj)  * 100)) : 0
              const protPct  = protObj > 0 ? Math.min(150, Math.round((s.totalProt    / protObj)  * 100)) : 0
              const sportObj = period === 'semaine' ? 3 : 12
              const sportPct = Math.min(150, Math.round((s.weekSessions / sportObj) * 100))

              const objectives = [
                {
                  label:   'Calories consommées',
                  current: Math.round(s.calConsumed),
                  target:  calObj,
                  pct:     calPct,
                  unit:    'kcal',
                  color:   '#f97316',
                  icon:    '🔥',
                },
                {
                  label:   'Protéines',
                  current: Math.round(s.totalProt ?? 0),
                  target:  protObj,
                  pct:     protPct,
                  unit:    'g',
                  color:   '#3b82f6',
                  icon:    '💪',
                },
                {
                  label:   'Séances sport',
                  current: s.weekSessions,
                  target:  sportObj,
                  pct:     sportPct,
                  unit:    'séances',
                  color:   '#7b7fd4',
                  icon:    '🏋️',
                },
                {
                  label:   'Calories brûlées',
                  current: Math.round(s.calBurned),
                  target:  period === 'semaine' ? 1500 : 6000,
                  pct:     Math.min(150, Math.round((s.calBurned / (period === 'semaine' ? 1500 : 6000)) * 100)),
                  unit:    'kcal',
                  color:   '#22c55e',
                  icon:    '⚡',
                },
              ]

              return objectives.map(obj => (
                <div key={obj.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
                      {obj.icon} {obj.label}
                    </span>
                    <span className="text-xs text-zinc-400">
                      <span className="font-bold" style={{ color: obj.color }}>{obj.current}</span> / {obj.target} {obj.unit}
                    </span>
                  </div>
                  {/* Barre curseur */}
                  <div className="relative h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, obj.pct)}%`,
                        background: obj.pct >= 100 ? obj.color : `${obj.color}99`,
                      }} />
                    {/* Indicateur objectif (100%) */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-zinc-300" style={{ left: '66.6%' }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-zinc-400">0</span>
                    <span className={`text-[10px] font-bold ${obj.pct >= 100 ? 'text-nutri-mid' : obj.pct >= 70 ? 'text-yellow-500' : 'text-zinc-400'}`}>
                      {obj.pct}%
                    </span>
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

      {/* ── Modules Nutrition + Sport ── */}
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

      <button onClick={() => router.push('/sport/session')}
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
