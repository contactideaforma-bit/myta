'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format, subDays, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Check, Loader2, User, Scale,
  Dumbbell, LogOut, Layers, BarChart3,
} from 'lucide-react'
import { Waty } from '@/components/ui/Waty'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string
  full_name: string | null
  weight_kg: number | null
  height_cm: number | null
  weight_goal: number | null
  birth_date: string | null
  sex: string | null
  activity_factor: number | null
  goal: string | null
  calorie_target: number | null
  prot_target: number | null
  carb_target: number | null
  fat_target: number | null
  condition: string | null
  health_conditions: string[] | null
}
interface WeightLog { date: string; weight_kg: number }
interface JournalDay { date: string; cal: number }
interface SessionDay { date: string; calories_burned: number }

// ─── Constantes ───────────────────────────────────────────────────────────────
const ACTIVITY_LEVELS = [
  { value: 1.2,   label: 'Sédentaire (bureau, peu de sport)' },
  { value: 1.375, label: 'Légèrement actif (1–3j/sem)' },
  { value: 1.55,  label: 'Modérément actif (3–5j/sem)' },
  { value: 1.725, label: 'Très actif (6–7j/sem)' },
  { value: 1.9,   label: 'Extrêmement actif (sport intensif quotidien)' },
]

const SPORT_GOALS = [
  { value: 'perte de poids', label: '🔥 Perte de poids' },
  { value: 'prise de masse', label: '💪 Prise de masse' },
  { value: 'endurance',      label: '🏃 Endurance' },
  { value: 'forme generale', label: '⚡ Forme générale' },
  { value: 'performance',    label: '🏆 Performance' },
]

const PERIODS = [
  { key: '1m',  label: '1 mois', days: 30 },
  { key: '3m',  label: '3 mois', days: 90 },
  { key: '6m',  label: '6 mois', days: 180 },
  { key: '1an', label: '1 an',   days: 365 },
  { key: 'all', label: 'Tout',   days: 9999 },
]

const MACRO_GOALS = [
  { key: 'perte',    label: '🔥 Perte de poids' },
  { key: 'maintien', label: '⚖️ Maintien' },
  { key: 'masse',    label: '💪 Prise de masse' },
  { key: 'sport',    label: '🏆 Performance' },
  { key: 'keto',     label: '🥑 Cétogène' },
]

const HEALTH_CONDITIONS = [
  { value: 'diabete_type2',      label: '🩸 Diabète type 2',          color: 'bg-red-50 border-red-200 text-red-700',
    note: 'Glucides limités, index glycémique bas, répartition des repas régulière' },
  { value: 'diabete_type1',      label: '🩸 Diabète type 1',          color: 'bg-red-50 border-red-200 text-red-700',
    note: 'Suivi glycémique, adaptation des glucides aux insulines' },
  { value: 'inflammatoire',      label: '🔥 Maladie inflammatoire',    color: 'bg-orange-50 border-orange-200 text-orange-700',
    note: 'Régime anti-inflammatoire, oméga-3++, éviter sucres raffinés' },
  { value: 'allergie_gluten',    label: '🌾 Allergie / Intolérance gluten', color: 'bg-amber-50 border-amber-200 text-amber-700',
    note: 'Aliments sans gluten uniquement : riz, quinoa, sarrasin, patate douce' },
  { value: 'intolerance_lactose',label: '🥛 Intolérance au lactose',   color: 'bg-blue-50 border-blue-200 text-blue-700',
    note: 'Produits laitiers sans lactose ou alternatives végétales' },
  { value: 'hypertension',       label: '❤️ Hypertension',            color: 'bg-rose-50 border-rose-200 text-rose-700',
    note: 'Sel limité à 5g/jour, potassium augmenté, hydratation++' },
  { value: 'hypothyroidie',      label: '🦋 Hypothyroïdie',           color: 'bg-purple-50 border-purple-200 text-purple-700',
    note: 'Iode et sélénium, éviter soja et chou cru en excès' },
]

const CONDITIONS_FEMME = [
  { value: '',                   label: '— Aucune' },
  { value: 'enceinte',           label: '🤰 Enceinte' },
  { value: 'post-partum',        label: '👶 Post-partum' },
  { value: 'post-partum-allait', label: '🤱 Post-partum + allaitement' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTDEE(w: number, h: number, age: number, sex: string, activity: number, condition?: string | null, healthConditions?: string[] | null) {
  let bmr = sex === 'femme'
    ? 10 * w + 6.25 * h - 5 * age - 161
    : 10 * w + 6.25 * h - 5 * age + 5
  if (condition === 'enceinte')           bmr += 300
  if (condition === 'post-partum')        bmr += 500
  if (condition === 'post-partum-allait') bmr += 600
  // Hypothyroïdie : métabolisme ralenti de ~10%
  if (healthConditions?.includes('hypothyroidie')) bmr = Math.round(bmr * 0.90)
  return Math.round(bmr * activity)
}

// Adapter les macros selon les conditions de santé
function adaptMacrosForHealth(
  cal: number, prot: number, carb: number, fat: number,
  healthConditions?: string[] | null
): { cal: number; prot: number; carb: number; fat: number; notes: string[] } {
  let c = cal, p = prot, g = carb, l = fat
  const notes: string[] = []

  if (healthConditions?.includes('diabete_type1') || healthConditions?.includes('diabete_type2')) {
    // Glucides max 40% des calories, index glycémique bas
    const maxCarb = Math.round(c * 0.40 / 4)
    if (g > maxCarb) {
      g = maxCarb
      l = Math.round((c - p * 4 - g * 4) / 9)
    }
    notes.push('🩸 Glucides limités à 40% — privilégie riz complet, légumineuses, légumes')
  }

  if (healthConditions?.includes('inflammatoire')) {
    // Protéines légèrement augmentées, lipides anti-inflam
    p = Math.round(p * 1.1)
    notes.push('🔥 Protéines + 10% — oméga-3, curcuma, gingembre conseillés')
  }

  if (healthConditions?.includes('allergie_gluten')) {
    notes.push('🌾 Sources de glucides : riz, quinoa, patate douce, sarrasin uniquement')
  }

  if (healthConditions?.includes('hypertension')) {
    notes.push('❤️ Sel < 5g/jour — potassium++ : banane, avocat, haricots')
  }

  if (healthConditions?.includes('hypothyroidie')) {
    notes.push('🦋 Sélénium++ : noix du Brésil. Évite soja et crucifères crus en excès')
  }

  if (healthConditions?.includes('intolerance_lactose')) {
    notes.push("🥛 Substituts : lait d'amande, soja, avoine. Fromages affinés tolérés")
  }

  return { cal: c, prot: p, carb: g, fat: l, notes }
}

function imcCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Insuffisance pondérale', color: 'text-orange-600', bg: 'bg-orange-100', advice: 'En dessous du poids santé. Enrichissement calorique progressif conseillé.' }
  if (bmi < 25)   return { label: 'Poids normal',           color: 'text-green-700',  bg: 'bg-green-50',   advice: 'Vous êtes dans la fourchette de poids sain. Continuez votre équilibre.' }
  if (bmi < 30)   return { label: 'Surpoids',               color: 'text-orange-600', bg: 'bg-orange-100', advice: 'Légère surcharge pondérale. Rééquilibrage alimentaire conseillé.' }
  return           { label: 'Obésité',                      color: 'text-red-600',    bg: 'bg-red-100',    advice: 'Consultation avec un médecin ou diététicien conseillée.' }
}

// ─── Sous-composants ──────────────────────────────────────────────────────────
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

function ConditionBanner({ condition }: { condition: string }) {
  if (condition === 'enceinte') return (
    <div className="flex items-start gap-2 bg-pink-50 border border-pink-200 rounded-2xl p-3">
      <span className="text-lg">🤰</span>
      <div>
        <p className="text-xs font-bold text-pink-700">Mode Grossesse activé</p>
        <p className="text-[11px] text-pink-500 leading-relaxed mt-0.5">
          +300 kcal/jour, protéines augmentées. Consultez toujours votre médecin ou sage-femme.
        </p>
      </div>
    </div>
  )
  if (condition === 'post-partum') return (
    <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-2xl p-3">
      <span className="text-lg">👶</span>
      <div>
        <p className="text-xs font-bold text-purple-700">Mode Post-partum activé</p>
        <p className="text-[11px] text-purple-500 leading-relaxed mt-0.5">
          +500 kcal/jour, récupération post-partum, sport progressif.
        </p>
      </div>
    </div>
  )
  if (condition === 'post-partum-allait') return (
    <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3">
      <span className="text-lg">🤱</span>
      <div>
        <p className="text-xs font-bold text-rose-700">Mode Post-partum + Allaitement</p>
        <p className="text-[11px] text-rose-500 leading-relaxed mt-0.5">
          +600 kcal/jour, protéines augmentées. Évitez les régimes restrictifs pendant l'allaitement.
        </p>
      </div>
    </div>
  )
  return null
}

// ─── Page principale ──────────────────────────────────────────────────────────
type Tab = 'bilan' | 'profil' | 'calculateur'
type CalcTab = 'tdee' | 'imc' | 'macros'

export default function ProfilePage() {
  const router   = useRouter()
  const supabase = createClient()

  // ── États principaux ────────────────────────────────────────────────────────
  const [tab, setTab]         = useState<Tab>('bilan')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [email, setEmail]     = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [period, setPeriod]   = useState('3m')

  // ── États bilan ─────────────────────────────────────────────────────────────
  const [weights, setWeights]         = useState<WeightLog[]>([])
  const [journalDays, setJournalDays] = useState<JournalDay[]>([])
  const [sessionDays, setSessionDays] = useState<SessionDay[]>([])
  const [sleepLogs, setSleepLogs]     = useState<{ date: string; duration_min: number }[]>([])
  const [aiReport, setAiReport]       = useState('')
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingBilan, setLoadingBilan]   = useState(false)

  // ── États formulaire profil ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    full_name: '', weight_kg: '', height_cm: '', weight_goal: '',
    birth_date: '', sex: 'homme', activity_factor: '1.55',
    goal: '', calorie_target: '', prot_target: '', carb_target: '', fat_target: '',
    condition: '',
    health_conditions: [] as string[],
  })

  // ── États calculateur ───────────────────────────────────────────────────────
  const [calcTab, setCalcTab]         = useState<CalcTab>('tdee')
  const [calcSex, setCalcSex]         = useState<'homme' | 'femme'>('homme')
  const [calcAge, setCalcAge]         = useState('')
  const [calcHeight, setCalcHeight]   = useState('')
  const [calcWeight, setCalcWeight]   = useState('')
  const [calcActivity, setCalcActivity] = useState(1.55)
  const [tdeeResult, setTdeeResult]   = useState<{ bmr: number; tdee: number } | null>(null)
  const [savingCalc, setSavingCalc]   = useState(false)
  const [imcHeight, setImcHeight]     = useState('')
  const [imcWeight, setImcWeight]     = useState('')
  const [imcResult, setImcResult]     = useState<number | null>(null)
  const [macroGoalKey, setMacroGoalKey] = useState('maintien')
  const [macroCal, setMacroCal]       = useState('')
  const [macroWeight, setMacroWeight] = useState('')
  const [macroResult, setMacroResult] = useState<{ prot: number; carb: number; fat: number } | null>(null)

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (tab === 'bilan') loadBilan() }, [tab, period])
  useEffect(() => { loadBilan() }, [])

  useEffect(() => {
    if (!profile) return
    if (profile.birth_date) setCalcAge(String(new Date().getFullYear() - new Date(profile.birth_date).getFullYear()))
    if (profile.height_cm)  { setCalcHeight(String(profile.height_cm)); setImcHeight(String(profile.height_cm)) }
    if (profile.weight_kg)  { setCalcWeight(String(profile.weight_kg)); setImcWeight(String(profile.weight_kg)); setMacroWeight(String(profile.weight_kg)) }
    if (profile.sex)        setCalcSex((profile.sex as 'homme' | 'femme') ?? 'homme')
    if (profile.activity_factor) setCalcActivity(profile.activity_factor)
  }, [profile])

  // ── Fonctions données ───────────────────────────────────────────────────────
  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setEmail(user.email ?? '')
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setForm({
        full_name:       data.full_name       ?? '',
        weight_kg:       data.weight_kg       ? String(data.weight_kg)       : '',
        height_cm:       data.height_cm       ? String(data.height_cm)       : '',
        weight_goal:     data.weight_goal     ? String(data.weight_goal)     : '',
        birth_date:      data.birth_date      ?? '',
        sex:             data.sex             ?? 'homme',
        activity_factor: data.activity_factor ? String(data.activity_factor) : '1.55',
        goal:            data.goal            ?? '',
        calorie_target:  data.calorie_target  ? String(data.calorie_target)  : '',
        prot_target:     data.prot_target     ? String(data.prot_target)     : '',
        carb_target:     data.carb_target     ? String(data.carb_target)     : '',
        fat_target:      data.fat_target      ? String(data.fat_target)      : '',
        condition:       data.condition       ?? '',
        health_conditions: data.health_conditions ?? [],
      })
    }
    setLoading(false)
  }

  async function loadBilan() {
    setLoadingBilan(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingBilan(false); return }
    const p = PERIODS.find(p => p.key === period)!
    const from = p.days === 9999 ? '2020-01-01' : format(subDays(new Date(), p.days), 'yyyy-MM-dd')
    const [{ data: wts }, { data: jnl }, { data: ses }, { data: slp }] = await Promise.all([
      supabase.from('weight_log').select('date,weight_kg').eq('user_id', user.id).gte('date', from).order('date'),
      supabase.from('journal_entries').select('date,cal').eq('user_id', user.id).gte('date', from),
      supabase.from('sessions').select('session_date,calories_burned').eq('user_id', user.id).gte('session_date', from),
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

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const payload: Record<string, unknown> = {
      id:              user.id,
      full_name:       form.full_name.trim()            || null,
      weight_kg:       parseFloat(form.weight_kg)       || null,
      height_cm:       parseInt(form.height_cm)         || null,
      birth_date:      form.birth_date                  || null,
      sex:             form.sex                         || null,
      activity_factor: parseFloat(form.activity_factor) || null,
      goal:            form.goal                        || null,
      calorie_target:  parseInt(form.calorie_target)    || null,
      prot_target:     parseInt(form.prot_target)       || null,
      carb_target:     parseInt(form.carb_target)       || null,
      fat_target:      parseInt(form.fat_target)        || null,
      condition:       form.condition                   || null,
      weight_goal:     parseFloat(form.weight_goal)    || null,
      health_conditions: (form as any).health_conditions?.length ? (form as any).health_conditions : null,
    }
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    if (!error) {
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

  async function generateAIReport() {
    setLoadingReport(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const from7 = format(subDays(new Date(), 7), 'yyyy-MM-dd')
      const [{ data: jnl }, { data: ses }, { data: slp }, { data: wts }] = await Promise.all([
        supabase.from('journal_entries').select('date,cal,prot,carb,fat').eq('user_id', user.id).gte('date', from7),
        supabase.from('sessions').select('session_date,duration_min,calories_burned').eq('user_id', user.id).gte('session_date', from7),
        supabase.from('sleep_log').select('date,duration_min').eq('user_id', user.id).gte('date', from7),
        supabase.from('weight_log').select('date,weight_kg').eq('user_id', user.id).gte('date', from7).order('date'),
      ])
      const jMap: Record<string, { cal: number; prot: number; carb: number; fat: number }> = {}
      for (const r of jnl ?? []) {
        if (!jMap[r.date]) jMap[r.date] = { cal: 0, prot: 0, carb: 0, fat: 0 }
        jMap[r.date].cal  += Number(r.cal)
        jMap[r.date].prot += Number(r.prot)
        jMap[r.date].carb += Number(r.carb)
        jMap[r.date].fat  += Number(r.fat)
      }
      const hc = (form as any).health_conditions as string[] ?? []
      const conditionNote = [
        form.condition === 'enceinte'           ? 'La personne est enceinte (+300 kcal).'           : '',
        form.condition === 'post-partum'        ? 'La personne est en post-partum (+500 kcal).'     : '',
        form.condition === 'post-partum-allait' ? 'Post-partum avec allaitement (+600 kcal).'        : '',
        hc.includes('diabete_type1')            ? 'Diabétique type 1 — glycémie à surveiller.'      : '',
        hc.includes('diabete_type2')            ? 'Diabétique type 2 — glucides à limiter.'         : '',
        hc.includes('inflammatoire')            ? 'Maladie inflammatoire — régime anti-inflam.'     : '',
        hc.includes('allergie_gluten')          ? 'Intolérance au gluten — sans gluten strict.'     : '',
        hc.includes('intolerance_lactose')      ? 'Intolérance au lactose.'                         : '',
        hc.includes('hypertension')             ? 'Hypertension — sel < 5g/jour.'                   : '',
        hc.includes('hypothyroidie')            ? 'Hypothyroïdie — métabolisme ralenti.'             : '',
      ].filter(Boolean).join(' ')
      const res = await fetch('/api/health-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calTarget:    profile?.calorie_target ?? 2000,
          nutrition:    Object.entries(jMap).map(([d, m]) => `${d}: ${Math.round(m.cal)} kcal — P:${Math.round(m.prot)}g G:${Math.round(m.carb)}g L:${Math.round(m.fat)}g`).join('\n') || 'Aucune donnée',
          sport:        (ses ?? []).map(s => `${s.session_date}: ${s.duration_min}min — ${s.calories_burned ?? 0} kcal brûlées`).join('\n') || 'Aucune séance',
          sleep:        (slp ?? []).map(s => `${s.date}: ${Math.floor(s.duration_min/60)}h${s.duration_min%60}min`).join('\n') || 'Aucune donnée',
          weight:       (wts ?? []).map(w => `${w.date}: ${w.weight_kg} kg`).join('\n') || 'Aucune donnée',
          goal:         profile?.goal ?? 'non défini',
          weightGoal:   profile?.weight_goal ? `Objectif poids : ${profile.weight_goal} kg` : null,
          age:          form.birth_date ? `${new Date().getFullYear() - new Date(form.birth_date).getFullYear()} ans` : null,
          condition:    conditionNote,
        }),
      })
      const data = await res.json()
      setAiReport(data.report ?? '')
    } catch (err) { console.error(err) }
    setLoadingReport(false)
  }

  // ── Fonctions calculateur ───────────────────────────────────────────────────
  async function computeTDEE() {
    const a = Number(calcAge), h = Number(calcHeight), w = Number(calcWeight)
    if (!a || !h || !w) return
    const bmr = calcSex === 'femme' ? 10*w + 6.25*h - 5*a - 161 : 10*w + 6.25*h - 5*a + 5
    const tdee = Math.round(bmr * calcActivity)
    setTdeeResult({ bmr: Math.round(bmr), tdee })
    setMacroCal(String(tdee))
    setSavingCalc(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, height_cm: h, weight_kg: w, calorie_target: tdee }, { onConflict: 'id' })
      await supabase.from('weight_log').upsert({ user_id: user.id, date: new Date().toISOString().split('T')[0], weight_kg: w }, { onConflict: 'date,user_id' })
    }
    setSavingCalc(false)
  }

  function computeIMC() {
    const h = Number(imcHeight), w = Number(imcWeight)
    if (!h || !w) return
    setImcResult(Math.round((w / ((h / 100) ** 2)) * 10) / 10)
  }

  function computeMacros() {
    const cal = Number(macroCal), w = Number(macroWeight)
    if (!cal) return
    const protPerKg: Record<string, number> = { perte: 1.8, maintien: 1.4, masse: 1.6, sport: 1.8, keto: 1.6 }
    const prot = w ? Math.round(w * (protPerKg[macroGoalKey] ?? 1.4)) : Math.round(cal * 0.25 / 4)
    const remaining = cal - prot * 4
    const carbRatio = macroGoalKey === 'keto' ? 0.05 : 0.6
    const carb = Math.round(remaining * carbRatio / 4)
    const fat  = Math.round((remaining - carb * 4) / 9)
    setMacroResult({ prot, carb, fat })
  }

  // ── Calculs dérivés ─────────────────────────────────────────────────────────
  const tdee = (() => {
    const w = parseFloat(form.weight_kg)
    const h = parseInt(form.height_cm)
    const bd = form.birth_date
    const act = parseFloat(form.activity_factor)
    if (!w || !h || !bd || !act) return null
    const age = new Date().getFullYear() - new Date(bd).getFullYear()
    return calcTDEE(w, h, age, form.sex, act, form.condition, (form as any).health_conditions)
  })()

  const bilanStats = (() => {
    if (!weights.length && !journalDays.length) return null
    const calTarget = profile?.calorie_target ?? tdee ?? 2000
    const avgCal = journalDays.length ? Math.round(journalDays.reduce((s, d) => s + d.cal, 0) / journalDays.length) : 0
    const totalCalBurned = sessionDays.reduce((s, d) => s + d.calories_burned, 0)
    const avgDeficit = avgCal ? avgCal - calTarget : null
    const sortedW = [...weights].sort((a, b) => a.date.localeCompare(b.date))
    const firstWeight = sortedW[0]?.weight_kg ?? null
    const lastWeight  = sortedW[sortedW.length - 1]?.weight_kg ?? null
    const weightDiff  = firstWeight && lastWeight ? Math.round((lastWeight - firstWeight) * 10) / 10 : null
    const weightData  = sortedW.map(w => ({ date: format(parseISO(w.date), 'd MMM', { locale: fr }), poids: w.weight_kg }))
    return { avgCal, totalCalBurned, avgDeficit, weightDiff, firstWeight, lastWeight, weightData }
  })()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  const isFemme = form.sex === 'femme'

  // ── Rendu ───────────────────────────────────────────────────────────────────
  return (
    <div className="page">

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
          { key: 'bilan',       label: '📊 Bilan' },
          { key: 'profil',      label: '👤 Profil' },
          { key: 'calculateur', label: '🧮 Calculateur' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET BILAN                                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'bilan' && (
        <div className="flex flex-col gap-5">

          {profile?.condition && profile.condition !== '' && (
            <ConditionBanner condition={profile.condition} />
          )}

          {/* Sélecteur période */}
          <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${period === p.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {loadingBilan ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-zinc-400" /></div>
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
                <KpiCard label="Moy. calories/jour" value={`${bilanStats.avgCal} kcal`} icon="🔥" color="text-orange-500"
                  sub={profile?.calorie_target ? `Objectif : ${profile.calorie_target} kcal` : undefined} />
                <KpiCard label="Cal. brûlées sport" value={Math.round(bilanStats.totalCalBurned)} icon="🏋️" color="text-tta-mid" sub="total période" />
                {bilanStats.avgDeficit !== null && (
                  <KpiCard label="Déficit moy." icon={bilanStats.avgDeficit < 0 ? '📉' : '📈'}
                    value={`${bilanStats.avgDeficit > 0 ? '+' : ''}${bilanStats.avgDeficit} kcal`}
                    color={bilanStats.avgDeficit < 0 ? 'text-nutri-dark' : 'text-orange-500'}
                    sub={bilanStats.avgDeficit < 0 ? 'Déficit — perte de poids' : 'Surplus calorique'} />
                )}
                {bilanStats.weightDiff !== null && (
                  <KpiCard label="Évolution poids" icon={bilanStats.weightDiff < 0 ? '📉' : '📈'}
                    value={`${bilanStats.weightDiff > 0 ? '+' : ''}${bilanStats.weightDiff} kg`}
                    color={bilanStats.weightDiff < 0 ? 'text-nutri-dark' : 'text-orange-500'}
                    sub={`${bilanStats.firstWeight} → ${bilanStats.lastWeight} kg`} />
                )}
              </div>

              {/* Courbe poids */}
              {bilanStats.weightData.length > 1 ? (
                <div className="card flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                    <Scale size={14} />Courbe de poids
                    <span className="ml-auto text-[10px] text-zinc-400 font-normal">{bilanStats.weightData.length} mesures</span>
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={bilanStats.weightData}>
                      <defs>
                        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#4B47A0" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#4B47A0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip formatter={(v: number) => [`${v} kg`, 'Poids']} />
                      <Area type="monotone" dataKey="poids" stroke="#4B47A0" fill="url(#wg)" strokeWidth={2.5} dot={{ r: 3, fill: '#4B47A0' }} />
                      {profile?.weight_kg && (
                        <ReferenceLine y={profile.weight_kg} stroke="#22c55e" strokeDasharray="4 2"
                          label={{ value: 'Actuel', fontSize: 9, fill: '#22c55e' }} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Min', val: `${Math.min(...bilanStats.weightData.map(d => d.poids))} kg` },
                      { label: 'Max', val: `${Math.max(...bilanStats.weightData.map(d => d.poids))} kg` },
                      { label: 'Évolution', val: bilanStats.weightDiff !== null ? `${bilanStats.weightDiff > 0 ? '+' : ''}${bilanStats.weightDiff} kg` : '—' },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-zinc-50 rounded-xl p-2 text-center">
                        <p className="text-sm font-bold text-zinc-900">{val}</p>
                        <p className="text-[10px] text-zinc-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card text-center py-6 text-zinc-400">
                  <Scale size={28} className="mx-auto mb-2 text-zinc-300" />
                  <p className="text-sm">Pas encore assez de mesures de poids</p>
                  <p className="text-xs mt-1">Entre ton poids dans le journal chaque jour</p>
                </div>
              )}

              {/* Sommeil */}
              {sleepLogs.length > 0 && (
                <div className="card flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700">🌙 Sommeil</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="kpi-card text-center p-3">
                      <p className="text-xl font-extrabold text-tta-mid">{sleepLogs.length}</p>
                      <p className="text-xs text-zinc-400">Nuits loggées</p>
                    </div>
                    <div className="kpi-card text-center p-3">
                      <p className="text-xl font-extrabold text-tta-mid">
                        {(() => { const avg = Math.round(sleepLogs.reduce((s, l) => s + l.duration_min, 0) / sleepLogs.length); return `${Math.floor(avg/60)}h${avg%60>0?avg%60+'m':''}` })()}
                      </p>
                      <p className="text-xs text-zinc-400">Moy. par nuit</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-14">
                    {sleepLogs.slice(-14).map((l, i) => {
                      const pct = Math.min(100, Math.round((l.duration_min / 540) * 100))
                      const color = l.duration_min >= 420 ? '#22c55e' : l.duration_min >= 360 ? '#eab308' : '#ef4444'
                      return <div key={i} className="flex-1"><div className="w-full rounded-t-sm" style={{ height: `${pct}%`, background: color, minHeight: '4px' }} /></div>
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-400 text-center">Vert = 7h+, jaune = 6-7h, rouge = &lt;6h</p>
                </div>
              )}

              {/* Rapport IA */}
              <div className="card flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-700">🤖 Rapport IA — 7 jours</h3>
                  <button onClick={generateAIReport} disabled={loadingReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tta-mid text-white text-xs font-bold hover:bg-tta transition-all disabled:opacity-60">
                    {loadingReport ? <><Loader2 size={12} className="animate-spin" />Analyse…</> : '✨ Générer'}
                  </button>
                </div>
                {aiReport ? (
                  <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line bg-tta-light rounded-2xl p-4">{aiReport}</div>
                ) : (
                  <div className="text-center py-6 text-zinc-400">
                    <p className="text-3xl mb-2">🤖</p>
                    <p className="text-sm">Clique sur "Générer" pour un rapport personnalisé.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET PROFIL                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
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

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Sexe</label>
              <div className="flex gap-2">
                {['homme', 'femme'].map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, sex: s, condition: s === 'homme' ? '' : f.condition }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${form.sex === s ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 text-zinc-500'}`}>
                    {s === 'homme' ? '♂ Homme' : '♀ Femme'}
                  </button>
                ))}
              </div>
            </div>

            {isFemme && (
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Condition particulière</label>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS_FEMME.map(c => (
                    <button key={c.value} onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.condition === c.value ? 'bg-pink-500 text-white border-pink-500' : 'border-zinc-200 text-zinc-600'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
                {form.condition !== '' && (
                  <p className="text-[10px] text-pink-500 mt-1.5">
                    {form.condition === 'enceinte'           ? '✓ +300 kcal/j, protéines augmentées'
                    : form.condition === 'post-partum'       ? '✓ +500 kcal/j, récupération post-partum'
                    : '✓ +600 kcal/j, allaitement — pas de régime restrictif'}
                  </p>
                )}
              </div>
            )}

            {/* ── Conditions de santé ── */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wide">
                Conditions de santé
                <span className="font-normal normal-case ml-1 text-zinc-300">— adapte tes objectifs automatiquement</span>
              </label>
              <div className="flex flex-col gap-2">
                {HEALTH_CONDITIONS.map(hc => {
                  const selected = ((form as any).health_conditions as string[] ?? []).includes(hc.value)
                  return (
                    <button
                      key={hc.value}
                      onClick={() => {
                        const current = (form as any).health_conditions as string[] ?? []
                        const next = selected
                          ? current.filter((v: string) => v !== hc.value)
                          : [...current, hc.value]
                        setForm(f => ({ ...f, health_conditions: next }))
                      }}
                      className={`flex items-start gap-3 text-left px-3 py-2.5 rounded-2xl border-2 transition-all ${
                        selected ? hc.color + ' border-current' : 'border-zinc-100 bg-zinc-50 text-zinc-600 hover:border-zinc-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'bg-current border-current' : 'border-zinc-300'}`}>
                        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold leading-tight">{hc.label}</p>
                        {selected && <p className="text-[10px] mt-0.5 opacity-80 leading-relaxed">{hc.note}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
              {((form as any).health_conditions as string[] ?? []).length > 0 && (
                <p className="text-[10px] text-tta-mid font-semibold">
                  ✓ Tes objectifs nutritionnels seront adaptés lors du calcul TDEE
                </p>
              )}
            </div>

            {/* Date naissance + poids + taille dans une grille propre */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Date de naissance</label>
                <input
                  type="date"
                  className="input w-full"
                  value={form.birth_date}
                  onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                  style={{ colorScheme: 'light' }}
                />
              </div>
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
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">
                  🎯 Poids cible (kg)
                  <span className="font-normal text-zinc-300 ml-1">— affiché sur ta courbe de poids</span>
                </label>
                <input type="number" min="30" max="250" step="0.1" className="input w-full" placeholder="ex: 65"
                  value={form.weight_goal} onChange={e => setForm(f => ({ ...f, weight_goal: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Niveau d'activité</label>
              <select className="input" value={form.activity_factor}
                onChange={e => setForm(f => ({ ...f, activity_factor: e.target.value }))}>
                {ACTIVITY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div className="card flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
              <Dumbbell size={14} />Objectif principal
            </h2>
            <div className="flex flex-wrap gap-2">
              {SPORT_GOALS.map(g => (
                <button key={g.value} onClick={() => setForm(f => ({ ...f, goal: g.value }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.goal === g.value ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 text-zinc-600'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Objectifs caloriques */}
          {tdee && (
            <div className="card bg-tta-light border-tta-mid/20 flex flex-col gap-3">
              <p className="text-xs text-tta-mid font-semibold uppercase tracking-wide">TDEE calculé : {tdee} kcal/jour</p>
              {form.condition === 'enceinte'           && <p className="text-[10px] text-pink-500">+300 kcal grossesse inclus</p>}
              {form.condition === 'post-partum'        && <p className="text-[10px] text-purple-500">+500 kcal post-partum inclus</p>}
              {form.condition === 'post-partum-allait' && <p className="text-[10px] text-rose-500">+600 kcal allaitement inclus</p>}
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Perte de poids', cal: tdee - 300, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Maintien',        cal: tdee,       color: 'text-tta-mid',  bg: 'bg-white/60' },
                  { label: 'Prise de masse',  cal: tdee + 300, color: 'text-orange-600', bg: 'bg-orange-50' },
                ].map(g => (
                  <button key={g.label} onClick={() => setForm(f => ({ ...f, calorie_target: String(g.cal) }))}
                    className={`${g.bg} rounded-xl p-2.5 text-center hover:opacity-80 transition-all`}>
                    <p className={`text-base font-black ${g.color}`}>{g.cal} kcal</p>
                    <p className="text-[10px] text-zinc-500">{g.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-700">🎯 Objectifs nutritionnels</h2>

            {/* Suggestions automatiques selon profil + conditions */}
            {tdee && (() => {
              const hc = (form as any).health_conditions as string[] ?? []
              const adapted = adaptMacrosForHealth(
                tdee,
                form.weight_kg ? Math.round(parseFloat(form.weight_kg) * 1.4) : Math.round(tdee * 0.25 / 4),
                Math.round(tdee * 0.40 / 4),
                Math.round(tdee * 0.30 / 9),
                hc
              )
              // Ajuster selon objectif
              const goalAdjust = form.goal === 'perte de poids' ? -300
                : form.goal === 'prise de masse' ? +300
                : 0
              const suggestedCal = adapted.cal + goalAdjust
              return (
                <div className="bg-tta-light border border-tta-mid/20 rounded-2xl p-3 flex flex-col gap-2">
                  <p className="text-xs font-bold text-tta-mid">
                    ✨ Objectifs suggérés pour ton profil
                    {hc.length > 0 && <span className="font-normal"> · adaptés à tes conditions</span>}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Calories', val: suggestedCal, unit: 'kcal', key: 'calorie_target' },
                      { label: 'Protéines', val: adapted.prot, unit: 'g', key: 'prot_target' },
                      { label: 'Glucides', val: adapted.carb, unit: 'g', key: 'carb_target' },
                      { label: 'Lipides', val: adapted.fat, unit: 'g', key: 'fat_target' },
                    ].map(({ label, val, unit, key }) => (
                      <button key={key}
                        onClick={() => setForm(f => ({ ...f, [key]: String(val) }))}
                        className="flex items-center justify-between bg-white rounded-xl px-3 py-2 hover:bg-tta-mid hover:text-white transition-all group">
                        <span className="text-xs text-zinc-500 group-hover:text-white/80">{label}</span>
                        <span className="text-sm font-extrabold text-tta-mid group-hover:text-white">{val}<span className="text-[10px] font-normal ml-0.5">{unit}</span></span>
                      </button>
                    ))}
                  </div>
                  {adapted.notes.length > 0 && (
                    <div className="flex flex-col gap-1 pt-1 border-t border-tta-mid/10">
                      {adapted.notes.map((n, i) => (
                        <p key={i} className="text-[10px] text-tta-mid leading-relaxed">{n}</p>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-400">Clique sur une valeur pour l'appliquer</p>
                </div>
              )
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Calories/jour (kcal)</label>
                <input type="number" min="1000" max="6000" className="input"
                  placeholder={tdee ? `TDEE calculé : ${tdee}` : 'ex: 2000'}
                  value={form.calorie_target} onChange={e => setForm(f => ({ ...f, calorie_target: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Protéines (g)</label>
                <input type="number" min="50" max="400" className="input" placeholder="ex: 120"
                  value={form.prot_target} onChange={e => setForm(f => ({ ...f, prot_target: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Glucides (g)</label>
                <input type="number" min="50" max="600" className="input" placeholder="ex: 225"
                  value={form.carb_target} onChange={e => setForm(f => ({ ...f, carb_target: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Lipides (g)</label>
                <input type="number" min="20" max="300" className="input" placeholder="ex: 65"
                  value={form.fat_target} onChange={e => setForm(f => ({ ...f, fat_target: e.target.value }))} />
              </div>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className={`btn-primary justify-center py-3 transition-all ${saved ? 'bg-green-600 hover:bg-green-600' : ''}`}>
            {saving ? <><Loader2 size={16} className="animate-spin" />Sauvegarde…</>
              : saved ? <><Check size={16} />Sauvegardé !</>
              : <><Check size={16} />Sauvegarder</>}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET CALCULATEUR                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'calculateur' && (
        <div className="flex flex-col gap-4">

          {/* Sous-onglets */}
          <div className="flex gap-2">
            {([
              { key: 'tdee',   label: '🔥 TDEE' },
              { key: 'imc',    label: '📏 IMC' },
              { key: 'macros', label: '⚖️ Macros' },
            ] as { key: CalcTab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setCalcTab(t.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${calcTab === t.key ? 'bg-tta-mid text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* TDEE */}
          {calcTab === 'tdee' && (
            <div className="flex flex-col gap-4">
              <div className="card flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-zinc-700">🔥 Calcul du TDEE</h2>
                <Waty
                  mode="nutrition"
                  message="Le TDEE (Total Daily Energy Expenditure) est ta dépense énergétique totale journalière. C'est le nombre de calories que ton corps brûle en une journée. Ces données sont indicatives — consulte un professionnel de santé pour un suivi personnalisé. 📊"
                  size="sm"
                  dismissible={true}
                />
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Sexe</label>
                  <div className="flex gap-2">
                    {(['homme', 'femme'] as const).map(s => (
                      <button key={s} onClick={() => setCalcSex(s)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${calcSex === s ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 text-zinc-500'}`}>
                        {s === 'homme' ? '♂ Homme' : '♀ Femme'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-zinc-400 mb-1 block">Âge</label>
                    <input type="number" min="10" max="100" placeholder="25" value={calcAge} onChange={e => setCalcAge(e.target.value)} className="input" /></div>
                  <div><label className="text-xs text-zinc-400 mb-1 block">Taille (cm)</label>
                    <input type="number" placeholder="170" value={calcHeight} onChange={e => setCalcHeight(e.target.value)} className="input" /></div>
                  <div><label className="text-xs text-zinc-400 mb-1 block">Poids (kg)</label>
                    <input type="number" step="0.1" placeholder="70" value={calcWeight} onChange={e => setCalcWeight(e.target.value)} className="input" /></div>
                  <div><label className="text-xs text-zinc-400 mb-1 block">Activité</label>
                    <select value={calcActivity} onChange={e => setCalcActivity(Number(e.target.value))} className="input">
                      {ACTIVITY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select></div>
                </div>
                <button onClick={computeTDEE} disabled={savingCalc} className="btn-primary justify-center py-2.5">
                  {savingCalc ? <Loader2 size={15} className="animate-spin" /> : '⚡'} Calculer mon TDEE
                </button>
              </div>
              {tdeeResult && (
                <div className="card flex flex-col gap-4">
                  <div className="text-center py-3">
                    <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Dépense énergétique totale</p>
                    <p className="text-5xl font-black text-tta-mid">{tdeeResult.tdee}</p>
                    <p className="text-zinc-400 text-sm mt-1">kcal / jour</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Perte de poids', cal: tdeeResult.tdee - 300, color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
                      { label: 'Maintien',        cal: tdeeResult.tdee,       color: 'text-tta-mid',   bg: 'bg-tta-light border-tta-mid/30' },
                      { label: 'Prise de masse',  cal: tdeeResult.tdee + 300, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
                    ].map(g => (
                      <div key={g.label} className={`rounded-xl p-3 text-center border ${g.bg}`}>
                        <p className={`text-lg font-black ${g.color}`}>{g.cal} kcal</p>
                        <p className={`text-xs font-medium mt-0.5 ${g.color}`}>{g.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 bg-zinc-50 rounded-xl p-3">
                    💡 MB : {tdeeResult.bmr} kcal · Formule Mifflin-St Jeor. Ajustez selon vos résultats sur 2–4 semaines.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* IMC */}
          {calcTab === 'imc' && (
            <div className="flex flex-col gap-4">
              <div className="card flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-zinc-700">📏 Calcul de l'IMC</h2>
                <Waty
                  mode="nutrition"
                  message="L'IMC (Indice de Masse Corporelle) est un indicateur général. Il ne tient pas compte de la masse musculaire ni de la répartition des graisses. À utiliser à titre indicatif uniquement — ton médecin reste le meilleur interlocuteur. 💡"
                  size="sm"
                  dismissible={true}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-zinc-400 mb-1 block">Taille (cm)</label>
                    <input type="number" placeholder="170" value={imcHeight} onChange={e => setImcHeight(e.target.value)} className="input" /></div>
                  <div><label className="text-xs text-zinc-400 mb-1 block">Poids (kg)</label>
                    <input type="number" step="0.1" placeholder="70" value={imcWeight} onChange={e => setImcWeight(e.target.value)} className="input" /></div>
                </div>
                <button onClick={computeIMC} className="btn-primary justify-center py-2.5">📏 Calculer mon IMC</button>
              </div>
              {imcResult !== null && (() => {
                const cat = imcCategory(imcResult)
                const pct = Math.min(Math.max(((imcResult - 16) / (40 - 16)) * 100, 0), 100)
                return (
                  <div className="card flex flex-col gap-4">
                    <div className="text-center py-3">
                      <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Indice de Masse Corporelle</p>
                      <p className={`text-5xl font-black ${cat.color}`}>{imcResult}</p>
                      <p className="text-zinc-400 text-sm mt-1">kg/m²</p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${cat.bg} ${cat.color}`}>{cat.label}</span>
                    </div>
                    <div>
                      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #dc2626 0%, #f97316 20%, #22c55e 35%, #22c55e 60%, #f97316 75%, #ef4444 90%)' }}>
                        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-zinc-400 rounded-full shadow -translate-x-1/2" style={{ left: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                        {['16', '18.5', '25', '30', '35', '40+'].map(v => <span key={v}>{v}</span>)}
                      </div>
                    </div>
                    <div className={`rounded-xl p-3 text-sm ${cat.bg} ${cat.color}`}>{cat.advice}</div>
                    <p className="text-xs text-zinc-400 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      ⚠️ L'IMC est un indicateur limité. Il ne tient pas compte de la masse musculaire.
                    </p>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Macros */}
          {calcTab === 'macros' && (
            <div className="flex flex-col gap-4">
              <div className="card flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-zinc-700">⚖️ Répartition des macros</h2>
                <Waty
                  mode="nutrition"
                  message="Les macronutriments (protéines, glucides, lipides) sont calculés selon des formules standard. Ces recommandations sont indicatives et peuvent varier selon ton métabolisme, ta santé et tes objectifs précis. Consulte un diététicien pour un plan sur mesure. 🥗"
                  size="sm"
                  dismissible={true}
                />
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Objectif</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MACRO_GOALS.map(g => (
                      <button key={g.key} onClick={() => setMacroGoalKey(g.key)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${macroGoalKey === g.key ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 text-zinc-500'}`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-zinc-400 mb-1 block">Calories (kcal)</label>
                    <input type="number" min="1000" max="6000" placeholder="2000" value={macroCal} onChange={e => setMacroCal(e.target.value)} className="input" /></div>
                  <div><label className="text-xs text-zinc-400 mb-1 block">Poids (kg)</label>
                    <input type="number" step="0.1" placeholder="70" value={macroWeight} onChange={e => setMacroWeight(e.target.value)} className="input" /></div>
                </div>
                <button onClick={computeMacros} className="btn-primary justify-center py-2.5">⚖️ Calculer mes macros</button>
              </div>
              {macroResult && (
                <div className="card flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Protéines', val: macroResult.prot, color: 'text-blue-600' },
                      { label: 'Glucides',  val: macroResult.carb, color: 'text-yellow-600' },
                      { label: 'Lipides',   val: macroResult.fat,  color: 'text-purple-600' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="kpi-card items-center text-center p-3">
                        <p className={`text-2xl font-black ${color}`}>{val}g</p>
                        <p className="text-xs text-zinc-400">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 bg-zinc-50 rounded-xl p-3">
                    💡 Calculé pour <strong>{MACRO_GOALS.find(g => g.key === macroGoalKey)?.label}</strong>.
                    Enregistre tes aliments dans le journal pour voir ta progression.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="card bg-tta-light border-tta-mid/20">
        <div className="flex gap-2 items-start">
          <Layers size={14} className="text-tta-mid flex-shrink-0 mt-0.5" />
          <p className="text-xs text-tta-mid leading-relaxed">
            <span className="font-semibold">Profil partagé MYTA.</span> Ces données alimentent les deux modules Nutrition et Sport.
          </p>
        </div>
      </div>
    </div>
  )
}
