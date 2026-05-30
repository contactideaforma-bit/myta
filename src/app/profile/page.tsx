'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format, subDays, subMonths, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Check, Loader2, User, Scale, Ruler, Calendar,
  Flame, Dumbbell, LogOut, Layers, TrendingDown,
  TrendingUp, ChevronDown, BarChart3, Activity,
  Target, RefreshCw,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string
  full_name: string | null
  weight_kg: number | null
  height_cm: number | null
  birth_date: string | null
  sex: string | null
  activity_factor: number | null
  goal: string | null
  calorie_target: number | null
  prot_target: number | null
  carb_target: number | null
  fat_target: number | null
}

interface WeightLog { date: string; weight_kg: number }
interface JournalDay { date: string; cal: number }
interface SessionDay { date: string; calories_burned: number }

const SPORT_GOALS = [
  { value: 'perte de poids',  label: '🔥 Perte de poids' },
  { value: 'prise de masse',  label: '💪 Prise de masse' },
  { value: 'endurance',       label: '🏃 Endurance' },
  { value: 'forme generale',  label: '⚡ Forme générale' },
  { value: 'performance',     label: '🏆 Performance' },
]

const ACTIVITY_LEVELS = [
  { value: 1.2,   label: 'Sédentaire (bureau, peu de sport)' },
  { value: 1.375, label: 'Légèrement actif (1–3j/sem)' },
  { value: 1.55,  label: 'Modérément actif (3–5j/sem)' },
  { value: 1.725, label: 'Très actif (6–7j/sem)' },
  { value: 1.9,   label: 'Extrêmement actif (sport intensif quotidien)' },
]

const PERIODS = [
  { key: '1m',  label: '1 mois',   days: 30 },
  { key: '3m',  label: '3 mois',   days: 90 },
  { key: '6m',  label: '6 mois',   days: 180 },
  { key: '1an', label: '1 an',     days: 365 },
  { key: 'all', label: 'Tout',     days: 9999 },
]

// ─── Calculs nutritionnels ─────────────────────────────────────────────────────
function calcTDEE(w: number, h: number, age: number, sex: string, activity: number) {
  const bmr = sex === 'femme'
    ? 10 * w + 6.25 * h - 5 * age - 161
    : 10 * w + 6.25 * h - 5 * age + 5
  return Math.round(bmr * activity)
}

function calcAutoMacros(cal: number, w: number, goal: string) {
  const protPerKg = goal === 'prise de masse' ? 2.0 : goal === 'perte de poids' ? 1.8 : 1.6
  const prot = Math.round(w * protPerKg)
  const fat  = Math.round(cal * 0.28 / 9)
  const carb = Math.round((cal - prot * 4 - fat * 9) / 4)
  return { prot, carb, fat }
}

// ─── Composants mini ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color = 'text-zinc-900' }: {
  label: string; value: string | number; sub?: string; icon: string; color?: string
}) {
  return (
    <div className="kpi-card">
      <span className="text-lg">{icon}</span>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────
type Tab = 'profil' | 'objectifs' | 'bilan'

export default function ProfilePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [tab, setTab]         = useState<Tab>('bilan')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [email, setEmail]     = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [period, setPeriod]   = useState('3m')

  // Données bilan
  const [weights, setWeights]         = useState<WeightLog[]>([])
  const [journalDays, setJournalDays] = useState<JournalDay[]>([])
  const [sessionDays, setSessionDays] = useState<SessionDay[]>([])
  const [sleepLogs, setSleepLogs]     = useState<{ date: string; duration_min: number }[]>([])
  const [aiReport, setAiReport]       = useState<string>('')
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingBilan, setLoadingBilan] = useState(false)

  // Form
  const [form, setForm] = useState({
    full_name: '', weight_kg: '', height_cm: '',
    birth_date: '', sex: 'homme', activity_factor: '1.55',
    goal: '', calorie_target: '', prot_target: '', carb_target: '', fat_target: '',
  })

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (tab === 'bilan') loadBilan() }, [tab, period])
  useEffect(() => { loadBilan() }, []) // charge au montage car bilan est l'onglet par défaut

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setEmail(user.email ?? '')
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setForm({
        full_name:       data.full_name      ?? '',
        weight_kg:       data.weight_kg      ? String(data.weight_kg)      : '',
        height_cm:       data.height_cm      ? String(data.height_cm)      : '',
        birth_date:      data.birth_date     ?? '',
        sex:             data.sex            ?? 'homme',
        activity_factor: data.activity_factor ? String(data.activity_factor) : '1.55',
        goal:            data.goal           ?? '',
        calorie_target:  data.calorie_target ? String(data.calorie_target)  : '',
        prot_target:     data.prot_target    ? String(data.prot_target)     : '',
        carb_target:     data.carb_target    ? String(data.carb_target)     : '',
        fat_target:      data.fat_target     ? String(data.fat_target)      : '',
      })
    }
    setLoading(false)
  }

  async function loadBilan() {
    setLoadingBilan(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingBilan(false); return }

    const p = PERIODS.find(p => p.key === period)!
    const from = p.days === 9999
      ? '2020-01-01'
      : format(subDays(new Date(), p.days), 'yyyy-MM-dd')

    const [{ data: wts }, { data: jnl }, { data: ses }, { data: slp }] = await Promise.all([
      supabase.from('weight_log').select('date,weight_kg').eq('user_id', user.id).gte('date', from).order('date'),
      supabase.from('journal_entries').select('date,cal').eq('user_id', user.id).gte('date', from),
      supabase.from('sessions').select('session_date,calories_burned,duration_min').eq('user_id', user.id).gte('session_date', from),
      supabase.from('sleep_log').select('date,duration_min').eq('user_id', user.id).gte('date', from).order('date'),
    ])

    setWeights(wts ?? [])
    setSleepLogs(slp ?? [])

    const jMap: Record<string, number> = {}
    for (const r of jnl ?? []) jMap[r.date] = (jMap[r.date] ?? 0) + Number(r.cal)
    setJournalDays(Object.entries(jMap).map(([date, cal]) => ({ date, cal })).sort((a, b) => a.date.localeCompare(b.date)))

    const sMap: Record<string, number> = {}
    for (const r of ses ?? []) sMap[r.session_date] = (sMap[r.session_date] ?? 0) + Number(r.calories_burned ?? 0)
    setSessionDays(Object.entries(sMap).map(([date, calories_burned]) => ({ date, calories_burned })).sort((a, b) => a.date.localeCompare(b.date)))

    setLoadingBilan(false)
  }

  async function generateAIReport() {
    setLoadingReport(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const from7 = format(subDays(new Date(), 7), 'yyyy-MM-dd')

      const [{ data: jnl }, { data: ses }, { data: slp }, { data: wts }] = await Promise.all([
        supabase.from('journal_entries').select('date,cal,prot,carb,fat').eq('user_id', user.id).gte('date', from7),
        supabase.from('sessions').select('session_date,duration_min,calories_burned').eq('user_id', user.id).gte('session_date', from7),
        supabase.from('sleep_log').select('date,duration_min,bedtime,wake_time').eq('user_id', user.id).gte('date', from7),
        supabase.from('weight_log').select('date,weight_kg').eq('user_id', user.id).gte('date', from7).order('date'),
      ])

      // Agréger nutrition par jour
      const jMap: Record<string, { cal: number; prot: number; carb: number; fat: number }> = {}
      for (const r of jnl ?? []) {
        if (!jMap[r.date]) jMap[r.date] = { cal: 0, prot: 0, carb: 0, fat: 0 }
        jMap[r.date].cal  += Number(r.cal)
        jMap[r.date].prot += Number(r.prot)
        jMap[r.date].carb += Number(r.carb)
        jMap[r.date].fat  += Number(r.fat)
      }

      const calTarget = profile?.calorie_target ?? 2000
      const nutritionSummary = Object.entries(jMap).map(([date, m]) =>
        `${date}: ${Math.round(m.cal)} kcal (P:${Math.round(m.prot)}g G:${Math.round(m.carb)}g L:${Math.round(m.fat)}g)`
      ).join('\n') || 'Aucune donnée nutrition'

      const sportSummary = (ses ?? []).map(s =>
        `${s.session_date}: ${s.duration_min} min, ${Math.round(s.calories_burned ?? 0)} kcal brûlées`
      ).join('\n') || 'Aucune séance enregistrée'

      const sleepSummary = (slp ?? []).map(s =>
        `${s.date}: ${Math.floor(s.duration_min / 60)}h${s.duration_min % 60 > 0 ? s.duration_min % 60 + 'min' : ''} (couché ${s.bedtime?.slice(0,5)} réveil ${s.wake_time?.slice(0,5)})`
      ).join('\n') || 'Aucune donnée sommeil'

      const weightSummary = (wts ?? []).map(w => `${w.date}: ${w.weight_kg} kg`).join('\n') || 'Aucune donnée poids'

      const res = await fetch('/api/health-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calTarget,
          nutrition: nutritionSummary,
          sport:     sportSummary,
          sleep:     sleepSummary,
          weight:    weightSummary,
          goal:      profile?.goal ?? 'non défini',
        }),
      })
      const data = await res.json()
      setAiReport(data.report ?? '')
    } catch (err) { console.error(err) }
    setLoadingReport(false)
  }

  // Calcul TDEE depuis form
  const tdee = (() => {
    const w = parseFloat(form.weight_kg)
    const h = parseInt(form.height_cm)
    const bd = form.birth_date
    const act = parseFloat(form.activity_factor)
    if (!w || !h || !bd || !act) return null
    const age = new Date().getFullYear() - new Date(bd).getFullYear()
    return calcTDEE(w, h, age, form.sex, act)
  })()

  // Macros auto
  const autoMacros = (() => {
    const cal = tdee ?? parseInt(form.calorie_target)
    const w   = parseFloat(form.weight_kg)
    if (!cal || !w) return null
    return calcAutoMacros(cal, w, form.goal)
  })()

  function applyAutoMacros() {
    if (!autoMacros || !tdee) return
    setForm(f => ({
      ...f,
      calorie_target: String(tdee),
      prot_target:    String(autoMacros.prot),
      carb_target:    String(autoMacros.carb),
      fat_target:     String(autoMacros.fat),
    }))
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      id:              user.id,
      full_name:       form.full_name.trim()           || null,
      weight_kg:       parseFloat(form.weight_kg)      || null,
      height_cm:       parseInt(form.height_cm)        || null,
      birth_date:      form.birth_date                 || null,
      sex:             form.sex                        || null,
      activity_factor: parseFloat(form.activity_factor)|| null,
      goal:            form.goal                       || null,
      calorie_target:  parseInt(form.calorie_target)   || null,
      prot_target:     parseInt(form.prot_target)      || null,
      carb_target:     parseInt(form.carb_target)      || null,
      fat_target:      parseInt(form.fat_target)       || null,
    }

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    if (!error) {
      // Enregistrer aussi le poids dans weight_log
      if (payload.weight_kg) {
        await supabase.from('weight_log').upsert(
          { user_id: user.id, date: format(new Date(), 'yyyy-MM-dd'), weight_kg: payload.weight_kg },
          { onConflict: 'date,user_id' }
        )
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      await loadProfile()
    }
    setSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // ── Stats bilan ──────────────────────────────────────────────────────────────
  const bilanStats = (() => {
    if (!weights.length && !journalDays.length) return null
    const calTarget = profile?.calorie_target ?? tdee ?? 2000

    const avgCal = journalDays.length
      ? Math.round(journalDays.reduce((s, d) => s + d.cal, 0) / journalDays.length)
      : 0
    const totalCalBurned = sessionDays.reduce((s, d) => s + d.calories_burned, 0)
    const avgDeficit = avgCal ? avgCal - calTarget : null

    const firstWeight = weights[0]?.weight_kg ?? null
    const lastWeight  = weights[weights.length - 1]?.weight_kg ?? null
    const weightDiff  = firstWeight && lastWeight ? Math.round((lastWeight - firstWeight) * 10) / 10 : null

    // Graphique poids
    const weightData = weights.map(w => ({
      date: format(parseISO(w.date), 'd MMM', { locale: fr }),
      poids: w.weight_kg,
    }))

    // Graphique calories (journal - sport = net)
    const allDates = new Set([...journalDays.map(d => d.date), ...sessionDays.map(d => d.date)])
    const calData = [...allDates].sort().map(date => {
      const consumed = journalDays.find(d => d.date === date)?.cal ?? 0
      const burned   = sessionDays.find(d => d.date === date)?.calories_burned ?? 0
      return {
        date: format(parseISO(date), 'd MMM', { locale: fr }),
        consommées: consumed,
        brûlées: burned,
        net: consumed - burned,
        objectif: calTarget,
      }
    })

    return { avgCal, totalCalBurned, avgDeficit, weightDiff, firstWeight, lastWeight, weightData, calData }
  })()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {profile?.full_name ? profile.full_name.split(' ')[0] : 'Mon profil'}
          </h1>
          <p className="text-sm text-zinc-400">{email}</p>
        </div>
        <button onClick={signOut} className="btn-ghost text-zinc-400 hover:text-red-500 text-xs gap-1.5">
          <LogOut size={14} />Déconnexion
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-100 rounded-xl p-1 gap-1">
        {([
          { key: 'profil',    label: '👤 Profil' },
          { key: 'objectifs', label: '🎯 Objectifs' },
          { key: 'bilan',     label: '📊 Bilan santé' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ONGLET PROFIL ── */}
      {tab === 'profil' && (
        <div className="flex flex-col gap-4">
          <div className="card flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
              <User size={14} />Informations personnelles
            </h2>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Prénom et nom</label>
              <input className="input" placeholder="ex: Marie Dupont" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Sexe</label>
                <div className="flex gap-2">
                  {['homme', 'femme'].map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, sex: s }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${form.sex === s ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 text-zinc-500'}`}>
                      {s === 'homme' ? '♂ Homme' : '♀ Femme'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Date de naissance</label>
                <input type="date" className="input" value={form.birth_date}
                  onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Poids (kg)</label>
                <input type="number" min="30" max="250" step="0.1" className="input" placeholder="ex: 68"
                  value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Taille (cm)</label>
                <input type="number" min="100" max="250" className="input" placeholder="ex: 168"
                  value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Niveau d'activité</label>
              <select className="input" value={form.activity_factor}
                onChange={e => setForm(f => ({ ...f, activity_factor: e.target.value }))}>
                {ACTIVITY_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Objectif sport */}
          <div className="card flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
              <Dumbbell size={14} />Objectif principal
            </h2>
            <div className="flex flex-wrap gap-2">
              {SPORT_GOALS.map(g => (
                <button key={g.value} onClick={() => setForm(f => ({ ...f, goal: g.value }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.goal === g.value ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className={`btn-primary justify-center py-3 transition-all ${saved ? 'bg-green-600 hover:bg-green-600' : ''}`}>
            {saving ? <><Loader2 size={16} className="animate-spin" />Sauvegarde…</>
              : saved ? <><Check size={16} />Profil sauvegardé !</>
              : <><Check size={16} />Sauvegarder</>}
          </button>
        </div>
      )}

      {/* ── ONGLET OBJECTIFS ── */}
      {tab === 'objectifs' && (
        <div className="flex flex-col gap-4">

          {/* TDEE calculé */}
          {tdee && (
            <div className="card bg-tta-light border-tta-mid/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-tta-mid font-semibold uppercase tracking-wide">TDEE calculé</p>
                  <p className="text-3xl font-black text-tta-mid">{tdee} <span className="text-base font-semibold">kcal/jour</span></p>
                </div>
                <Activity size={28} className="text-tta-mid/50" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Perte de poids', cal: tdee - 300, color: 'text-blue-600' },
                  { label: 'Maintien',        cal: tdee,       color: 'text-tta-mid' },
                  { label: 'Prise de masse',  cal: tdee + 300, color: 'text-orange-600' },
                ].map(g => (
                  <button key={g.label} onClick={() => setForm(f => ({ ...f, calorie_target: String(g.cal) }))}
                    className="bg-white/60 rounded-xl p-2 text-center hover:bg-white transition-colors">
                    <p className={`text-base font-black ${g.color}`}>{g.cal}</p>
                    <p className="text-[10px] text-zinc-500 leading-tight">{g.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Macros auto */}
          {autoMacros && (
            <div className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Target size={14} />Macros recommandées
                </h2>
                <button onClick={applyAutoMacros} className="btn-ghost text-xs gap-1 text-tta-mid">
                  <RefreshCw size={11} />Appliquer
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Protéines', val: autoMacros.prot, color: 'bg-blue-500' },
                  { label: 'Glucides',  val: autoMacros.carb, color: 'bg-yellow-400' },
                  { label: 'Lipides',   val: autoMacros.fat,  color: 'bg-purple-500' },
                ].map(m => (
                  <div key={m.label} className="kpi-card items-center text-center p-2">
                    <p className="text-lg font-black text-zinc-900">{m.val}g</p>
                    <p className="text-xs text-zinc-400">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Objectifs manuels */}
          <div className="card flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
              <Flame size={14} />Objectifs personnalisés
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Calories/jour (kcal)</label>
                <input type="number" min="1000" max="6000" className="input"
                  placeholder={tdee ? `TDEE : ${tdee}` : 'ex: 2000'}
                  value={form.calorie_target}
                  onChange={e => setForm(f => ({ ...f, calorie_target: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Protéines (g)</label>
                <input type="number" min="50" max="400" className="input"
                  placeholder={autoMacros ? `Auto: ${autoMacros.prot}` : 'ex: 120'}
                  value={form.prot_target}
                  onChange={e => setForm(f => ({ ...f, prot_target: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Glucides (g)</label>
                <input type="number" min="50" max="600" className="input"
                  placeholder={autoMacros ? `Auto: ${autoMacros.carb}` : 'ex: 225'}
                  value={form.carb_target}
                  onChange={e => setForm(f => ({ ...f, carb_target: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Lipides (g)</label>
                <input type="number" min="20" max="300" className="input"
                  placeholder={autoMacros ? `Auto: ${autoMacros.fat}` : 'ex: 65'}
                  value={form.fat_target}
                  onChange={e => setForm(f => ({ ...f, fat_target: e.target.value }))} />
              </div>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className={`btn-primary justify-center py-3 ${saved ? 'bg-green-600 hover:bg-green-600' : ''}`}>
            {saving ? <><Loader2 size={16} className="animate-spin" />Sauvegarde…</>
              : saved ? <><Check size={16} />Objectifs sauvegardés !</>
              : <><Check size={16} />Sauvegarder</>}
          </button>
        </div>
      )}

      {/* ── ONGLET BILAN SANTÉ ── */}
      {tab === 'bilan' && (
        <div className="flex flex-col gap-5">

          {/* Sélecteur période */}
          <div className="flex gap-1.5 bg-zinc-100 rounded-xl p-1">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${period === p.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {loadingBilan ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-zinc-400" />
            </div>
          ) : !bilanStats ? (
            <div className="card text-center py-14 text-zinc-400">
              <BarChart3 size={36} className="mx-auto mb-3 text-zinc-300" />
              <p className="text-sm">Pas encore de données.</p>
              <p className="text-xs mt-1">Commence à enregistrer des aliments et des séances.</p>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  label="Moy. calories/jour" value={`${bilanStats.avgCal} kcal`}
                  icon="🔥" color="text-orange-500"
                  sub={profile?.calorie_target ? `Objectif : ${profile.calorie_target} kcal` : undefined}
                />
                <KpiCard
                  label="Cal. brûlées (sport)" value={`${Math.round(bilanStats.totalCalBurned)}`}
                  icon="🏋️" color="text-tta-mid"
                  sub="total sur la période"
                />
                {bilanStats.avgDeficit !== null && (
                  <KpiCard
                    label="Déficit calorique moy." icon={bilanStats.avgDeficit < 0 ? '📉' : '📈'}
                    value={`${bilanStats.avgDeficit > 0 ? '+' : ''}${bilanStats.avgDeficit} kcal`}
                    color={bilanStats.avgDeficit < 0 ? 'text-nutri-dark' : 'text-orange-500'}
                    sub={bilanStats.avgDeficit < 0 ? 'Déficit — perte de poids' : 'Surplus calorique'}
                  />
                )}
                {bilanStats.weightDiff !== null && (
                  <KpiCard
                    label="Évolution du poids" icon={bilanStats.weightDiff < 0 ? '📉' : '📈'}
                    value={`${bilanStats.weightDiff > 0 ? '+' : ''}${bilanStats.weightDiff} kg`}
                    color={bilanStats.weightDiff < 0 ? 'text-nutri-dark' : 'text-orange-500'}
                    sub={`${bilanStats.firstWeight} → ${bilanStats.lastWeight} kg`}
                  />
                )}
              </div>

              {/* Courbe de poids */}
              {bilanStats.weightData.length > 1 && (
                <div className="card flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Scale size={14} />Courbe de poids
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={bilanStats.weightData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip formatter={(v: number) => [`${v} kg`, 'Poids']} />
                      <Area type="monotone" dataKey="poids" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} dot={false} />
                      {profile?.weight_kg && (
                        <ReferenceLine y={profile.weight_kg} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Actuel', fontSize: 10 }} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Calories consommées vs brûlées */}
              {bilanStats.calData.length > 1 && (
                <div className="card flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Flame size={14} />Calories consommées vs brûlées
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={bilanStats.calData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                      <Tooltip />
                      <ReferenceLine y={profile?.calorie_target ?? tdee ?? 2000} stroke="#6366f1" strokeDasharray="4 2" label={{ value: 'Objectif', fontSize: 9 }} />
                      <Line type="monotone" dataKey="consommées" stroke="#f97316" strokeWidth={2} dot={false} name="Consommées" />
                      <Line type="monotone" dataKey="brûlées"   stroke="#3b82f6" strokeWidth={2} dot={false} name="Brûlées sport" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 justify-center text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block" />Consommées</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block" />Brûlées sport</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-400 inline-block border-dashed" />Objectif</span>
                  </div>
                </div>
              )}

              {/* Balance calorique nette */}
              {bilanStats.calData.length > 1 && (
                <div className="card flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700">⚖️ Balance calorique nette</h3>
                  <p className="text-xs text-zinc-400">Calories consommées − calories brûlées par le sport</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={bilanStats.calData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                      <Tooltip formatter={(v: number) => [`${v} kcal`, 'Net']} />
                      <ReferenceLine y={0} stroke="#6366f1" />
                      <Area type="monotone" dataKey="net"
                        stroke="#16a34a" fill="#dcfce7" strokeWidth={2} dot={false}
                        name="Bilan net"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pas assez de données */}
              {bilanStats.weightData.length <= 1 && bilanStats.calData.length <= 1 && (
                <div className="card text-center py-8 text-zinc-400">
                  <p className="text-sm">Pas encore assez de données sur cette période.</p>
                  <p className="text-xs mt-1">Essaie une période plus longue ou continue à enregistrer.</p>
                </div>
              )}

              {/* Sommeil */}
              {sleepLogs.length > 0 && (
                <div className="card flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                    🌙 Sommeil
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Nuits loggées', value: sleepLogs.length },
                      { label: 'Moy. par nuit', value: (() => { const avg = Math.round(sleepLogs.reduce((s, l) => s + l.duration_min, 0) / sleepLogs.length); return `${Math.floor(avg/60)}h${avg%60>0?avg%60+'min':''}` })() },
                    ].map(({ label, value }) => (
                      <div key={label} className="kpi-card text-center p-3">
                        <p className="text-xl font-extrabold text-tta-mid">{value}</p>
                        <p className="text-xs text-zinc-400">{label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Mini graphique sommeil */}
                  <div className="flex items-end gap-1 h-16">
                    {sleepLogs.slice(-14).map((l, i) => {
                      const pct = Math.min(100, Math.round((l.duration_min / 540) * 100))
                      const color = l.duration_min >= 420 ? '#22c55e' : l.duration_min >= 360 ? '#eab308' : '#ef4444'
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${l.date}: ${Math.floor(l.duration_min/60)}h${l.duration_min%60}min`}>
                          <div className="w-full rounded-t-sm transition-all" style={{ height: `${pct}%`, background: color, minHeight: '4px' }} />
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-400 text-center">Barre verte = 7h+, jaune = 6-7h, rouge = {'<'}6h</p>
                </div>
              )}

              {/* Rapport IA 7 jours */}
              <div className="card flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-700">🤖 Rapport IA — 7 jours</h3>
                  <button onClick={generateAIReport} disabled={loadingReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tta-mid text-white text-xs font-bold hover:bg-tta transition-all disabled:opacity-60">
                    {loadingReport
                      ? <><Loader2 size={12} className="animate-spin" />Analyse…</>
                      : '✨ Générer'
                    }
                  </button>
                </div>

                {aiReport ? (
                  <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line bg-tta-light rounded-2xl p-4">
                    {aiReport}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-400">
                    <p className="text-3xl mb-2">🤖</p>
                    <p className="text-sm">Clique sur "Générer" pour obtenir un rapport personnalisé basé sur tes 7 derniers jours.</p>
                    <p className="text-xs mt-1 text-zinc-300">Nutrition · Sport · Sommeil · Poids</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Info partagé */}
      <div className="card bg-tta-light border-tta-mid/20">
        <div className="flex gap-2 items-start">
          <Layers size={14} className="text-tta-mid flex-shrink-0 mt-0.5" />
          <p className="text-xs text-tta-mid leading-relaxed">
            <span className="font-semibold">Profil partagé MYTA.</span> Ces données alimentent les deux modules Nutrition et Sport — poids, TDEE, macros et calories brûlées sont synchronisés automatiquement.
          </p>
        </div>
      </div>
    </div>
  )
}
