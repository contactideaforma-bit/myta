'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Calculator, Scale, Zap, Dumbbell } from 'lucide-react'
import { round1, calcIMC, calcTDEE } from '@/lib/utils'
import type { Profile } from '@/types'

// ─── Constantes ────────────────────────────────────────────────────────────
const ACTIVITY_LEVELS = [
  { value: 1.2,   label: 'Sédentaire (bureau, peu de sport)' },
  { value: 1.375, label: 'Légèrement actif (1–3j/sem)' },
  { value: 1.55,  label: 'Modérément actif (3–5j/sem)' },
  { value: 1.725, label: 'Très actif (6–7j/sem)' },
  { value: 1.9,   label: 'Extrêmement actif (sport intensif quotidien)' },
]

const MACRO_PROFILES = {
  perte:    { label: 'Perte de poids',          prot: 0.30, carb: 0.40, fat: 0.30, protPerKg: 1.8 },
  maintien: { label: 'Maintien',                prot: 0.25, carb: 0.45, fat: 0.30, protPerKg: 1.4 },
  masse:    { label: 'Prise de masse',           prot: 0.25, carb: 0.50, fat: 0.25, protPerKg: 1.6 },
  sport:    { label: 'Performance sportive',    prot: 0.25, carb: 0.50, fat: 0.25, protPerKg: 1.8 },
  keto:     { label: 'Cétogène',                prot: 0.25, carb: 0.05, fat: 0.70, protPerKg: 1.6 },
} as const
type GoalKey = keyof typeof MACRO_PROFILES

function bmiCategory(bmi: number) {
  if (bmi < 16.5) return { label: 'Dénutrition sévère',         color: 'text-red-700',    bg: 'bg-red-100',    advice: 'IMC très bas — consultation médicale urgente.' }
  if (bmi < 18.5) return { label: 'Insuffisance pondérale',      color: 'text-orange-600', bg: 'bg-orange-100', advice: 'En dessous du poids santé. Enrichissement calorique progressif conseillé.' }
  if (bmi < 25)   return { label: 'Poids normal',                color: 'text-nutri-dark', bg: 'bg-nutri-light',advice: 'Vous êtes dans la fourchette de poids sain. Continuez votre équilibre.' }
  if (bmi < 30)   return { label: 'Surpoids',                    color: 'text-orange-600', bg: 'bg-orange-100', advice: 'Léger surpoids. Rééquilibrage alimentaire et activité régulière conseillés.' }
  if (bmi < 35)   return { label: 'Obésité modérée (classe I)',  color: 'text-red-600',    bg: 'bg-red-100',    advice: 'Consultation avec un médecin ou diététicien conseillée.' }
  if (bmi < 40)   return { label: 'Obésité sévère (classe II)',  color: 'text-red-700',    bg: 'bg-red-100',    advice: 'Suivi médical régulier nécessaire.' }
  return           { label: 'Obésité morbide (classe III)', color: 'text-red-900',    bg: 'bg-red-100',    advice: 'Prise en charge médicale spécialisée recommandée.' }
}

// ─── Composants ────────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-nutri text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'}`}>
      <Icon size={14} />{label}
    </button>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-bold text-zinc-900">{value}</span>
    </div>
  )
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(Math.round((value / target) * 100), 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-zinc-600">{label}</span>
        <span className="text-zinc-400">{value}g / {target}g</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────
type Tab = 'tdee' | 'imc' | 'macros'

export default function CalculatorPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('tdee')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [toast, setToast] = useState('')

  // TDEE form
  const [sex, setSex]           = useState<'homme' | 'femme'>('homme')
  const [age, setAge]           = useState('')
  const [height, setHeight]     = useState('')
  const [weight, setWeight]     = useState('')
  const [activity, setActivity] = useState(1.55)
  const [tdeeResult, setTdeeResult] = useState<{ bmr: number; tdee: number } | null>(null)
  const [savingTdee, setSavingTdee] = useState(false)

  // IMC form
  const [imcHeight, setImcHeight] = useState('')
  const [imcWeight, setImcWeight] = useState('')
  const [imcResult, setImcResult] = useState<number | null>(null)

  // Macros form
  const [macroGoal, setMacroGoal] = useState<GoalKey>('maintien')
  const [macroCal, setMacroCal]   = useState('')
  const [macroWeight, setMacroWeight] = useState('')
  const [macros, setMacros] = useState<{ prot: number; carb: number; fat: number } | null>(null)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!data) return
    setProfile(data)
    // Pré-remplir
    if (data.birth_date) setAge(String(new Date().getFullYear() - new Date(data.birth_date).getFullYear()))
    if (data.height_cm)  { setHeight(String(data.height_cm)); setImcHeight(String(data.height_cm)) }
    if (data.weight_kg)  { setWeight(String(data.weight_kg)); setImcWeight(String(data.weight_kg)); setMacroWeight(String(data.weight_kg)) }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // ── TDEE ──────────────────────────────────────────────────────────────
  async function computeTDEE() {
    const a = Number(age), h = Number(height), w = Number(weight)
    if (!a || !h || !w) { showToast('Veuillez remplir tous les champs'); return }
    const bmr = sex === 'femme'
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5
    const tdee = Math.round(bmr * activity)
    setTdeeResult({ bmr: Math.round(bmr), tdee })
    // Sync macros
    setMacroCal(String(tdee))
    setMacroWeight(weight)

    // Sauvegarder profil
    setSavingTdee(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        height_cm: h,
        weight_kg: w,
        calorie_target: tdee,
      }, { onConflict: 'id' })
      // Sauvegarder dans weight_log
      await supabase.from('weight_log').upsert(
        { user_id: user.id, date: new Date().toISOString().split('T')[0], weight_kg: w },
        { onConflict: 'date,user_id' }
      )
      showToast('✓ Profil enregistré')
    }
    setSavingTdee(false)
  }

  // ── IMC ───────────────────────────────────────────────────────────────
  function computeIMC() {
    const h = Number(imcHeight), w = Number(imcWeight)
    if (!h || !w) { showToast('Veuillez remplir taille et poids'); return }
    setImcResult(calcIMC(w, h))
  }

  // ── Macros ─────────────────────────────────────────────────────────────
  function computeMacros() {
    const cal = Number(macroCal), w = Number(macroWeight)
    if (!cal) { showToast('Veuillez entrer votre apport calorique'); return }
    const { protPerKg, carb: cp, fat: fp } = MACRO_PROFILES[macroGoal]
    const protG    = w ? Math.round(w * protPerKg) : Math.round(cal * 0.25 / 4)
    const remaining = cal - protG * 4
    const carbRatio = cp / (cp + fp)
    const carbG    = Math.round(remaining * carbRatio / 4)
    const fatG     = Math.round((remaining - carbG * 4) / 9)
    setMacros({ prot: protG, carb: carbG, fat: fatG })
  }

  const imcData = imcResult ? bmiCategory(imcResult) : null
  const imcGaugePct = imcResult ? Math.min(Math.max(((imcResult - 16) / (40 - 16)) * 100, 0), 100) : 50

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-nutri shadow-lg">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Calculateur</h1>
        <p className="text-sm text-zinc-400">IMC, TDEE & répartition des macros</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <TabButton active={tab === 'tdee'}  onClick={() => setTab('tdee')}  icon={Zap}        label="TDEE" />
        <TabButton active={tab === 'imc'}   onClick={() => setTab('imc')}   icon={Scale}       label="IMC" />
        <TabButton active={tab === 'macros'} onClick={() => setTab('macros')} icon={Calculator} label="Macros" />
      </div>

      {/* ── TDEE ── */}
      {tab === 'tdee' && (
        <div className="flex flex-col gap-4">
          <div className="card flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-700">🔥 Calcul de votre TDEE</h2>

            {/* Sexe */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Sexe</label>
              <div className="flex gap-2">
                {(['homme', 'femme'] as const).map(s => (
                  <button key={s} onClick={() => setSex(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${sex === s ? 'bg-nutri text-white border-nutri' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                    {s === 'homme' ? '♂ Homme' : '♀ Femme'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Âge</label>
                <input type="number" min="10" max="100" placeholder="25" value={age} onChange={e => setAge(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Taille (cm)</label>
                <input type="number" min="100" max="250" placeholder="170" value={height} onChange={e => setHeight(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Poids (kg)</label>
                <input type="number" min="30" max="300" step="0.1" placeholder="70" value={weight} onChange={e => setWeight(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Activité</label>
                <select value={activity} onChange={e => setActivity(Number(e.target.value))} className="input">
                  {ACTIVITY_LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={computeTDEE} disabled={savingTdee} className="btn-nutri justify-center py-2.5">
              {savingTdee ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              Calculer mon TDEE
            </button>
          </div>

          {tdeeResult && (
            <div className="card flex flex-col gap-4">
              {/* Résultat principal */}
              <div className="text-center py-4">
                <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Dépense énergétique totale</p>
                <p className="text-5xl font-black text-nutri-dark">{tdeeResult.tdee}</p>
                <p className="text-zinc-400 text-sm mt-1">kcal / jour</p>
              </div>

              <ResultRow label="🛌 Métabolisme de base (MB)" value={`${tdeeResult.bmr} kcal`} />
              <ResultRow label="⚡ Facteur d'activité" value={`× ${activity}`} />
              <ResultRow label="📐 Formule" value="Mifflin-St Jeor" />

              <div className="border-t border-zinc-100 pt-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">🎯 Objectifs caloriques</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Perte de poids', cal: tdeeResult.tdee - 300, color: 'border-blue-200 bg-blue-50', text: 'text-blue-700', sub: '-300 kcal' },
                    { label: 'Maintien',        cal: tdeeResult.tdee,       color: 'border-nutri/40 bg-nutri-light', text: 'text-nutri-dark', sub: 'équilibre' },
                    { label: 'Prise de masse',  cal: tdeeResult.tdee + 300, color: 'border-orange-200 bg-orange-50', text: 'text-orange-700', sub: '+300 kcal' },
                  ].map(g => (
                    <div key={g.label} className={`rounded-xl p-3 text-center border ${g.color}`}>
                      <p className={`text-lg font-black ${g.text}`}>{g.cal}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{g.sub}</p>
                      <p className={`text-[10px] font-medium mt-0.5 ${g.text}`}>{g.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-50 rounded-xl p-3 text-xs text-zinc-500 leading-relaxed">
                💡 Le TDEE est une estimation. Les variations individuelles peuvent représenter ±200 kcal/jour. Ajustez selon vos résultats sur 2 à 4 semaines.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── IMC ── */}
      {tab === 'imc' && (
        <div className="flex flex-col gap-4">
          <div className="card flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-700">📏 Calcul de l'IMC</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Taille (cm)</label>
                <input type="number" min="100" max="250" placeholder="170" value={imcHeight} onChange={e => setImcHeight(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Poids (kg)</label>
                <input type="number" min="30" max="300" step="0.1" placeholder="70" value={imcWeight} onChange={e => setImcWeight(e.target.value)} className="input" />
              </div>
            </div>
            <button onClick={computeIMC} className="btn-nutri justify-center py-2.5">
              <Scale size={15} />Calculer mon IMC
            </button>
          </div>

          {imcResult && imcData && (
            <div className="card flex flex-col gap-4">
              <div className="text-center py-4">
                <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Indice de Masse Corporelle</p>
                <p className={`text-5xl font-black ${imcData.color}`}>{imcResult}</p>
                <p className="text-zinc-400 text-sm mt-1">kg/m²</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${imcData.bg} ${imcData.color}`}>
                  {imcData.label}
                </span>
              </div>

              {/* Jauge */}
              <div>
                <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #dc2626 0%, #f97316 20%, #22c55e 35%, #22c55e 60%, #f97316 75%, #ef4444 87%, #991b1b 100%)' }}>
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-zinc-400 rounded-full shadow-md -translate-x-1/2 transition-all"
                    style={{ left: `${imcGaugePct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                  {['16', '18.5', '25', '30', '35', '40+'].map(v => <span key={v}>{v}</span>)}
                </div>
              </div>

              {(() => {
                const h = Number(imcHeight) / 100
                const normalMin = round1(18.5 * h * h)
                const normalMax = round1(24.9 * h * h)
                return <>
                  <ResultRow label="📐 Votre IMC"           value={`${imcResult} kg/m²`} />
                  <ResultRow label="✅ Fourchette normale"  value={`${normalMin} – ${normalMax} kg`} />
                  <ResultRow label="📏 Taille"              value={`${imcHeight} cm`} />
                  <ResultRow label="⚖️ Poids"               value={`${imcWeight} kg`} />
                </>
              })()}

              <div className={`rounded-xl p-3 text-sm ${imcData.bg} ${imcData.color}`}>
                {imcData.advice}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ⚠️ L'IMC est un indicateur limité. Il ne tient pas compte de la composition corporelle ni de la masse musculaire. À interpréter avec précaution.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MACROS ── */}
      {tab === 'macros' && (
        <div className="flex flex-col gap-4">
          <div className="card flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-700">⚖️ Répartition des macronutriments</h2>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Objectif</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.entries(MACRO_PROFILES) as [GoalKey, typeof MACRO_PROFILES[GoalKey]][]).map(([key, { label }]) => (
                  <button key={key} onClick={() => setMacroGoal(key)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${macroGoal === key ? 'bg-nutri text-white border-nutri' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Apport calorique (kcal)</label>
                <input type="number" min="1000" max="6000" placeholder="2000" value={macroCal} onChange={e => setMacroCal(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Poids (kg) — optionnel</label>
                <input type="number" min="30" max="300" step="0.1" placeholder="70" value={macroWeight} onChange={e => setMacroWeight(e.target.value)} className="input" />
              </div>
            </div>

            <button onClick={computeMacros} className="btn-nutri justify-center py-2.5">
              <Calculator size={15} />Calculer mes macros
            </button>
          </div>

          {macros && (
            <div className="card flex flex-col gap-5">
              <div className="text-center">
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Objectif — {MACRO_PROFILES[macroGoal].label}</p>
              </div>

              {/* Cercles */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Protéines', val: macros.prot, cal: macros.prot * 4,  color: 'bg-blue-500',   text: 'text-blue-600' },
                  { label: 'Glucides',  val: macros.carb, cal: macros.carb * 4,  color: 'bg-yellow-400', text: 'text-yellow-600' },
                  { label: 'Lipides',   val: macros.fat,  cal: macros.fat  * 9,  color: 'bg-purple-500', text: 'text-purple-600' },
                ].map(({ label, val, cal, color, text }) => {
                  const totalCal = macros.prot * 4 + macros.carb * 4 + macros.fat * 9
                  const pct = Math.round((cal / totalCal) * 100)
                  return (
                    <div key={label} className="text-center">
                      <div className="kpi-card items-center gap-0.5 p-3">
                        <p className={`text-2xl font-black ${text}`}>{val}g</p>
                        <p className="text-xs text-zinc-400">{label}</p>
                        <p className="text-xs font-semibold text-zinc-500">{pct}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Barres vs journal */}
              <div className="flex flex-col gap-3">
                <MacroBar label="Protéines" value={0} target={macros.prot} color="bg-blue-500" />
                <MacroBar label="Glucides"  value={0} target={macros.carb} color="bg-yellow-400" />
                <MacroBar label="Lipides"   value={0} target={macros.fat}  color="bg-purple-500" />
              </div>

              <div className="bg-zinc-50 rounded-xl p-3 text-xs text-zinc-500">
                💡 Ces valeurs sont calculées pour <strong>{MACRO_PROFILES[macroGoal].label}</strong>.
                Enregistrez des aliments dans le journal pour voir votre progression du jour.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
