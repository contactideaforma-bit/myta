'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowRight, ChevronRight, Scale, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { todayISO, minutesToHuman } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Waty } from '@/components/ui/Waty'
import type { Profile, Session } from '@/types'

type Period = 'semaine' | 'mois'

interface WeightPoint { date: string; weight_kg: number }

interface Stats {
  profile:      Profile | null
  calToday:     number
  calTarget:    number
  calConsumed:  number
  calBurned:    number
  totalProt:    number
  weekSessions: number
  weekMinutes:  number
  lastSession:  Session | null
  weights:      WeightPoint[]
}

function getWatyBilanMessage(calConsumed: number, calBurned: number, calTarget: number, period: Period): string {
  const net    = calConsumed - calBurned
  const days   = period === 'semaine' ? 7 : 30
  const target = calTarget * days
  const deficit = net - target
  if (calConsumed === 0) return "Commence à noter tes repas pour que je puisse analyser ton bilan calorique ! 📝"
  if (calBurned === 0 && calConsumed > 0) return `Tu as consommé ${Math.round(calConsumed)} kcal cette ${period}. Ajoute des séances sport pour brûler des calories ! 🏋️`
  if (deficit < -500 * days / 7) return `Excellent déficit de ${Math.abs(Math.round(deficit))} kcal ! Tu es sur la voie de la perte de poids 🎯`
  if (deficit < 0) return `Beau travail ! Déficit de ${Math.abs(Math.round(deficit))} kcal. Continue comme ça 💪`
  if (deficit < 200 * days / 7) return `Tu es presque à l'équilibre — parfait pour le maintien ⚖️`
  return `Tu es en surplus de ${Math.round(deficit)} kcal cette ${period}. Allège un peu les repas 😊`
}

// ── Courbe de poids SVG légère ─────────────────────────────────────────────
function WeightChart({ weights, targetWeight }: { weights: WeightPoint[]; targetWeight?: number | null }) {
  if (weights.length < 2) return null

  const sorted  = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const vals    = sorted.map(w => w.weight_kg)
  const allVals = targetWeight ? [...vals, targetWeight] : vals
  const minV    = Math.min(...allVals) - 0.5
  const maxV    = Math.max(...allVals) + 0.5
  const range   = maxV - minV || 1

  const W = 300; const H = 90
  const pad = { l: 28, r: 10, t: 8, b: 18 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b

  function x(i: number) { return pad.l + (i / (sorted.length - 1)) * innerW }
  function y(v: number)  { return pad.t + (1 - (v - minV) / range) * innerH }

  const linePath = sorted.map((w, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(w.weight_kg).toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L${x(sorted.length - 1).toFixed(1)},${(pad.t + innerH).toFixed(1)} L${pad.l},${(pad.t + innerH).toFixed(1)} Z`

  const first = sorted[0].weight_kg
  const last  = sorted[sorted.length - 1].weight_kg
  const diff  = parseFloat((last - first).toFixed(1))

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">Évolution du poids</span>
        <span className={`font-bold flex items-center gap-0.5 ${diff < 0 ? 'text-nutri-mid' : diff > 0 ? 'text-orange-500' : 'text-zinc-400'}`}>
          {diff < 0 ? <TrendingDown size={12} /> : diff > 0 ? <TrendingUp size={12} /> : <Minus size={12} />}
          {diff > 0 ? '+' : ''}{diff} kg
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <defs>
          <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4B47A0" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4B47A0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grille légère */}
        {[minV + range * 0.25, minV + range * 0.5, minV + range * 0.75].map((v, i) => (
          <line key={i} x1={pad.l} y1={y(v)} x2={W - pad.r} y2={y(v)} stroke="#f0f0f0" strokeWidth="1" />
        ))}

        {/* Labels Y */}
        <text x={pad.l - 3} y={y(maxV - 0.3) + 4} textAnchor="end" fontSize="8" fill="#a1a1aa">{(maxV - 0.5).toFixed(0)}</text>
        <text x={pad.l - 3} y={y(minV + 0.3) + 4} textAnchor="end" fontSize="8" fill="#a1a1aa">{(minV + 0.5).toFixed(0)}</text>

        {/* Ligne cible */}
        {targetWeight && targetWeight >= minV && targetWeight <= maxV && (
          <>
            <line x1={pad.l} y1={y(targetWeight)} x2={W - pad.r} y2={y(targetWeight)}
              stroke="#22c55e" strokeWidth="1" strokeDasharray="4,3" />
            <text x={W - pad.r + 2} y={y(targetWeight) + 3} fontSize="7" fill="#22c55e">cible</text>
          </>
        )}

        {/* Aire */}
        <path d={areaPath} fill="url(#wgrad)" />

        {/* Ligne */}
        <path d={linePath} fill="none" stroke="#4B47A0" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Points */}
        {sorted.map((w, i) => (
          <circle key={i} cx={x(i)} cy={y(w.weight_kg)} r="3"
            fill={i === sorted.length - 1 ? '#4B47A0' : '#fff'}
            stroke="#4B47A0" strokeWidth="1.5" />
        ))}

        {/* Labels dates */}
        {[0, sorted.length - 1].map(i => (
          <text key={i} x={x(i)} y={H - 2} textAnchor="middle" fontSize="8" fill="#a1a1aa">
            {format(new Date(sorted[i].date + 'T12:00'), 'd MMM', { locale: fr })}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ── Indicateur de progression mensuel ────────────────────────────────────────
function MonthProgress({ calConsumed, calTarget, sessions, sessionTarget, calBurned }: {
  calConsumed: number; calTarget: number; sessions: number; sessionTarget: number; calBurned: number
}) {
  const now       = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthPct   = Math.round((dayOfMonth / daysInMonth) * 100)

  // Objectif proratisé au jour actuel
  const prorata    = dayOfMonth / daysInMonth
  const calExpected = Math.round(calTarget * 30 * prorata)
  const sesExpected = Math.round(sessionTarget * prorata)

  const calPct  = calExpected > 0 ? Math.min(150, Math.round((calConsumed / calExpected) * 100)) : 0
  const sesPct  = sesExpected > 0 ? Math.min(150, Math.round((sessions / Math.max(1, sesExpected)) * 100)) : 0
  const burnPct = Math.min(150, Math.round((calBurned / Math.max(1, 6000 * prorata)) * 100))

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
      {/* Barre temps écoulé */}
      <div className="flex flex-col gap-1">
        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-300 rounded-full" style={{ width: `${monthPct}%` }} />
        </div>
        <p className="text-[10px] text-zinc-400 text-right">{monthPct}% du mois écoulé</p>
      </div>
      {/* Objectifs proratisés */}
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

export default function DashboardPage() {
  const [stats, setStats]           = useState<Stats | null>(null)
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState<Period>('semaine')
  const [weightInput, setWeightInput]   = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightSaved, setWeightSaved]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [period])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const today = todayISO()
    const now   = new Date()
    const dateFrom = period === 'semaine'
      ? format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(startOfMonth(now), 'yyyy-MM-dd')
    const dateTo = period === 'semaine'
      ? format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      : format(endOfMonth(now), 'yyyy-MM-dd')
    const from30 = format(subDays(now, 30), 'yyyy-MM-dd')

    const [
      { data: prof },
      { data: journalToday },
      { data: journalPeriod },
      { data: sessions },
      { data: lastSess },
      { data: weightData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('journal_entries').select('cal').eq('user_id', user.id).eq('date', today),
      supabase.from('journal_entries').select('cal,prot').eq('user_id', user.id).gte('date', dateFrom).lte('date', dateTo),
      supabase.from('sessions').select('*').eq('user_id', user.id).gte('session_date', dateFrom).lte('session_date', dateTo),
      supabase.from('sessions').select('*, discipline:disciplines(*)').eq('user_id', user.id).order('session_date', { ascending: false }).limit(1),
      supabase.from('weight_log').select('date,weight_kg').eq('user_id', user.id).gte('date', from30).order('date', { ascending: false }).limit(15),
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
      weights:      (weightData ?? []) as WeightPoint[],
    })
    setLoading(false)
  }

  async function logWeight() {
    const val = parseFloat(weightInput)
    if (!val || val < 20 || val > 300) return
    setSavingWeight(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const today = todayISO()
      await supabase.from('weight_log').delete().eq('user_id', user.id).eq('date', today)
      const { error: insErr } = await supabase.from('weight_log').insert({ user_id: user.id, date: today, weight_kg: val })
      if (insErr) { console.error('[weight_log]', insErr); setSavingWeight(false); return }
      await supabase.from('profiles').upsert({ id: user.id, weight_kg: val }, { onConflict: 'id' })
      setWeightSaved(true)
      setTimeout(() => setWeightSaved(false), 2000)
      await loadData()
      setWeightInput('')
    }
    setSavingWeight(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-nutri/30 border-t-nutri rounded-full animate-spin" />
    </div>
  )

  const s         = stats!
  const calPct    = Math.min(100, s.calTarget > 0 ? Math.round((s.calToday / s.calTarget) * 100) : 0)
  const firstName = s.profile?.full_name?.split(' ')[0] ?? ''
  const bilanMsg  = getWatyBilanMessage(s.calConsumed, s.calBurned, s.calTarget, period)
  const lastWeight = s.weights[0] ?? null
  const targetWeight = (s.profile as any)?.weight_goal ?? null

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

      {/* ── Objectifs semaine/mois ── */}
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
            <p className="text-sm text-zinc-400">Renseigne tes objectifs dans le profil</p>
            <button onClick={() => router.push('/profile')} className="mt-2 text-xs font-bold text-tta-mid hover:underline">
              Configurer mon profil →
            </button>
          </div>
        ) : period === 'semaine' ? (
          // ── Vue semaine : barres de progression ────────────────────────────
          <div className="flex flex-col gap-4">
            {(() => {
              const days     = 7
              const calObj   = (s.profile?.calorie_target ?? 2000) * days
              const protObj  = (s.profile?.prot_target ?? 120) * days
              const calPct2  = calObj  > 0 ? Math.min(150, Math.round((s.calConsumed / calObj)  * 100)) : 0
              const protPct  = protObj > 0 ? Math.min(150, Math.round((s.totalProt   / protObj)  * 100)) : 0
              const sportPct = Math.min(150, Math.round((s.weekSessions / 3) * 100))
              const burnPct  = Math.min(150, Math.round((s.calBurned / 1500) * 100))

              return [
                { label: 'Calories consommées', current: Math.round(s.calConsumed), target: calObj,          pct: calPct2, unit: 'kcal', color: '#f97316', icon: '🔥' },
                { label: 'Protéines',            current: Math.round(s.totalProt),  target: protObj,         pct: protPct, unit: 'g',    color: '#3b82f6', icon: '💪' },
                { label: 'Séances sport',         current: s.weekSessions,          target: 3,               pct: sportPct,unit: 'séances', color: '#7b7fd4', icon: '🏋️' },
                { label: 'Calories brûlées',      current: Math.round(s.calBurned), target: 1500,            pct: burnPct, unit: 'kcal', color: '#22c55e', icon: '⚡' },
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
          // ── Vue mois : progression proratisée ──────────────────────────────
          <MonthProgress
            calConsumed={s.calConsumed}
            calTarget={s.profile?.calorie_target ?? 2000}
            sessions={s.weekSessions}
            sessionTarget={12}
            calBurned={s.calBurned}
          />
        )}

        {/* Waty bilan */}
        <Waty mode="nutrition" message={bilanMsg} size="sm" dismissible={true} />
      </div>

      {/* ── Poids du jour + courbe ── */}
      <div className="card flex flex-col gap-4">
        <h2 className="font-extrabold text-zinc-900 flex items-center gap-2">
          <Scale size={16} className="text-tta-mid" />Poids
          {lastWeight && (
            <span className="ml-auto text-sm font-bold text-tta-mid">{lastWeight.weight_kg} kg</span>
          )}
        </h2>

        {/* Saisie */}
        <div className="flex gap-2">
          <input
            type="number" step="0.1" min="30" max="300"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && logWeight()}
            placeholder={lastWeight ? `Dernier : ${lastWeight.weight_kg} kg` : 'ex: 72.5 kg'}
            className="input flex-1"
          />
          <button onClick={logWeight} disabled={savingWeight}
            className={`px-4 py-2 rounded-2xl text-sm font-bold text-white transition-all whitespace-nowrap ${weightSaved ? 'bg-green-500' : 'bg-tta-mid hover:bg-tta'}`}>
            {savingWeight ? <Loader2 size={14} className="animate-spin" /> : weightSaved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>

        {/* Courbe */}
        {s.weights.length >= 2 ? (
          <WeightChart weights={s.weights} targetWeight={targetWeight} />
        ) : (
          <p className="text-xs text-zinc-400 text-center py-2">
            Pèse-toi régulièrement pour voir ta courbe de progression 📈
          </p>
        )}
      </div>

      {/* ── Nutrition aujourd'hui ── */}
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

      {/* ── Sport ── */}
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
