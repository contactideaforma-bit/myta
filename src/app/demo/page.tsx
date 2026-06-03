'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  ArrowRight, Flame, Scale, Moon, Dumbbell,
  ChevronRight, ChevronDown, ChevronUp, X, Sparkles,
  BarChart3, BookOpen, LayoutDashboard,
} from 'lucide-react'

// ─── Données fictives réalistes ───────────────────────────────────────────────

const FAKE_WEIGHTS = [
  { date: '27 mai', poids: 63.8 },
  { date: '28 mai', poids: 63.5 },
  { date: '29 mai', poids: 63.6 },
  { date: '30 mai', poids: 63.3 },
  { date: '31 mai', poids: 63.4 },
  { date: '1 juin', poids: 63.2 },
  { date: '3 juin', poids: 63.0 },
]

const FAKE_MEALS = [
  {
    meal: 'Petit-déjeuner', icon: '☀️', time: '07h30',
    items: [
      { name: 'Flocons d\'avoine', qty: 80, cal: 296, prot: 10, carb: 50, fat: 5 },
      { name: 'Lait demi-écrémé', qty: 200, cal: 88, prot: 7, carb: 9, fat: 3 },
      { name: 'Banane', qty: 120, cal: 107, prot: 1, carb: 24, fat: 0 },
    ]
  },
  {
    meal: 'Déjeuner', icon: '🌞', time: '12h30',
    items: [
      { name: 'Blanc de poulet grillé', qty: 180, cal: 198, prot: 42, carb: 0, fat: 2 },
      { name: 'Riz basmati cuit', qty: 200, cal: 246, prot: 5, carb: 53, fat: 0.5 },
      { name: 'Brocoli vapeur', qty: 150, cal: 51, prot: 4, carb: 7, fat: 0.5 },
    ]
  },
  {
    meal: 'Collation', icon: '🌤️', time: '16h00',
    items: [
      { name: 'Yaourt grec 0%', qty: 150, cal: 84, prot: 12, carb: 5, fat: 0 },
      { name: 'Myrtilles', qty: 80, cal: 46, prot: 1, carb: 11, fat: 0 },
    ]
  },
]

const TOTAL_CAL  = FAKE_MEALS.flatMap(m => m.items).reduce((s, i) => s + i.cal, 0)
const TOTAL_PROT = FAKE_MEALS.flatMap(m => m.items).reduce((s, i) => s + i.prot, 0)
const TOTAL_CARB = FAKE_MEALS.flatMap(m => m.items).reduce((s, i) => s + i.carb, 0)
const TOTAL_FAT  = FAKE_MEALS.flatMap(m => m.items).reduce((s, i) => s + i.fat, 0)

const CAL_TARGET  = 2100
const PROT_TARGET = 140
const CARB_TARGET = 240
const FAT_TARGET  = 65

const SPORT_TIPS = [
  { icon: '💧', titre: 'Hydratation', conseil: 'Bois 500ml d\'eau 2h avant l\'effort. Pendant l\'exercice, vise 150-200ml toutes les 20 minutes.' },
  { icon: '🔥', titre: 'Échauffement', conseil: '10 minutes d\'échauffement dynamique réduisent le risque de blessure de 50%. Ne saute jamais cette étape.' },
  { icon: '🥩', titre: 'Protéines post-effort', conseil: 'Mange des protéines dans les 30 minutes après ta séance. 20-40g suffisent pour optimiser la récupération musculaire.' },
  { icon: '😴', titre: 'Récupération', conseil: 'Le muscle se construit pendant le repos. Dors 7 à 9h et laisse 48h entre deux séances du même groupe musculaire.' },
]

// ─── Composants démo ──────────────────────────────────────────────────────────

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
        <span className="text-xs font-bold text-zinc-700">{value}g <span className="text-zinc-400 font-normal">/ {goal}g</span></span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function TipCard({ tip }: { tip: typeof SPORT_TIPS[0] }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen(v => !v)}
      className="w-full text-left card-sm transition-all hover:shadow-sm active:scale-[0.98]">
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">{tip.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-zinc-900">{tip.titre}</p>
          {!open && <p className="text-xs text-zinc-400 truncate mt-0.5">{tip.conseil}</p>}
        </div>
        {open ? <ChevronUp size={16} className="text-zinc-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-zinc-400 flex-shrink-0" />}
      </div>
      {open && <p className="text-sm text-zinc-600 leading-relaxed mt-3 pl-11">{tip.conseil}</p>}
    </button>
  )
}

function DemoToast({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-zinc-900 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
        <span className="text-lg">🔒</span>
        <p className="text-sm flex-1">Fonctionnalité disponible après inscription</p>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'journal' | 'bilan' | 'sport'

export default function DemoPage() {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('dashboard')
  const [showToast, setShowToast] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<number | null>(0)

  function triggerDemo() {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8f8fc' }}>

      {/* ── Bannière démo ── */}
      <div className="sticky top-0 z-40 w-full"
        style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}>
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-white/80 flex-shrink-0" />
            <p className="text-white text-xs font-medium">Mode démo — données fictives</p>
          </div>
          <button
            onClick={() => router.push('/auth')}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all flex-shrink-0">
            S'inscrire <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <img src="/logo_my_twin_app.png" alt="MYTA" className="h-8 object-contain" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400">Bonjour,</span>
          <span className="text-xs font-bold text-zinc-700">Marie 👋</span>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="w-full max-w-lg mx-auto px-4 mb-1">
        <div className="flex bg-white rounded-2xl p-1 gap-1 shadow-sm border border-zinc-100">
          {([
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { key: 'journal',   label: 'Journal',   icon: BookOpen },
            { key: 'bilan',     label: 'Bilan',     icon: BarChart3 },
            { key: 'sport',     label: 'Sport',     icon: Dumbbell },
          ] as { key: Tab; label: string; icon: any }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                tab === t.key
                  ? 'bg-tta-mid text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}>
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <main className="page !pt-3">

        {/* ════════════════════════════ DASHBOARD ════════════════════════════ */}
        {tab === 'dashboard' && (
          <div className="flex flex-col gap-4">

            {/* Date */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-extrabold text-zinc-900">Aujourd'hui</p>
                <p className="text-xs text-zinc-400">Mardi 3 juin 2025</p>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-2xl px-3 py-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-green-700">En bonne voie 🎯</span>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="kpi-card">
                <span className="text-lg">🔥</span>
                <p className="text-xl font-black text-orange-500">{TOTAL_CAL} kcal</p>
                <p className="text-xs text-zinc-500 font-medium">Calories aujourd'hui</p>
                <p className="text-[10px] text-zinc-400">Objectif : {CAL_TARGET} kcal</p>
              </div>
              <div className="kpi-card">
                <span className="text-lg">🏋️</span>
                <p className="text-xl font-black text-tta-mid">310 kcal</p>
                <p className="text-xs text-zinc-500 font-medium">Brûlées ce matin</p>
                <p className="text-[10px] text-zinc-400">Muscu dos/biceps · 45min</p>
              </div>
              <div className="kpi-card">
                <span className="text-lg">🌙</span>
                <p className="text-xl font-black text-nutri-dark">7h30</p>
                <p className="text-xs text-zinc-500 font-medium">Sommeil cette nuit</p>
                <p className="text-[10px] text-zinc-400">✨ Sommeil optimal</p>
              </div>
              <div className="kpi-card">
                <span className="text-lg">⚖️</span>
                <p className="text-xl font-black text-zinc-900">63.0 kg</p>
                <p className="text-xs text-zinc-500 font-medium">Poids ce matin</p>
                <p className="text-[10px] text-zinc-400">↓ 0.8 kg ce mois</p>
              </div>
            </div>

            {/* Progression calories */}
            <div className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-800">Calories du jour</h3>
                <span className="text-xs text-zinc-400">{Math.round((TOTAL_CAL / CAL_TARGET) * 100)}%</span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((TOTAL_CAL / CAL_TARGET) * 100)}%`, background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }} />
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{TOTAL_CAL} consommées</span>
                <span className="text-nutri-mid font-bold">{CAL_TARGET - TOTAL_CAL} restantes</span>
              </div>
            </div>

            {/* Macros */}
            <div className="card flex flex-col gap-3">
              <h3 className="text-sm font-bold text-zinc-800">Macronutriments</h3>
              <MacroBar label="Protéines" value={TOTAL_PROT} goal={PROT_TARGET} color="#3b82f6" />
              <MacroBar label="Glucides"  value={TOTAL_CARB} goal={CARB_TARGET} color="#eab308" />
              <MacroBar label="Lipides"   value={TOTAL_FAT}  goal={FAT_TARGET}  color="#a855f7" />
            </div>

            {/* Waty message */}
            <div className="card bg-tta-light border-tta-mid/20 flex gap-3 items-start">
              <img src="/waty-nutrition.png" alt="Waty" className="w-12 h-12 object-contain flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-tta-mid mb-1">Waty dit :</p>
                <p className="text-sm text-zinc-700 leading-relaxed">
                  Belle journée Marie ! Déficit de 189 kcal sur la semaine, tu es sur la bonne trajectoire pour atteindre ton objectif 🎯 Pense à manger des protéines au dîner ce soir.
                </p>
              </div>
            </div>

            {/* CTA */}
            <button onClick={() => router.push('/auth')}
              className="w-full py-4 rounded-3xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              ✨ Essaie MYTA gratuitement — 14 jours offerts <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ════════════════════════════ JOURNAL ════════════════════════════ */}
        {tab === 'journal' && (
          <div className="flex flex-col gap-4">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-extrabold text-zinc-900">Journal alimentaire</p>
                <p className="text-xs text-zinc-400">Mardi 3 juin 2025</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-base font-black text-orange-500">{TOTAL_CAL}</span>
                <span className="text-[10px] text-zinc-400">/ {CAL_TARGET} kcal</span>
              </div>
            </div>

            {/* Macros compactes */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', val: TOTAL_CAL,  unit: 'kcal', color: '#f97316' },
                { label: 'Prot.',    val: TOTAL_PROT, unit: 'g',    color: '#3b82f6' },
                { label: 'Gluc.',    val: TOTAL_CARB, unit: 'g',    color: '#eab308' },
                { label: 'Lip.',     val: TOTAL_FAT,  unit: 'g',    color: '#a855f7' },
              ].map(({ label, val, unit, color }) => (
                <div key={label} className="kpi-card items-center text-center !p-2.5">
                  <p className="text-base font-black" style={{ color }}>{val}</p>
                  <p className="text-[9px] text-zinc-400 uppercase">{label}</p>
                </div>
              ))}
            </div>

            {/* Repas */}
            {FAKE_MEALS.map((meal, mi) => (
              <div key={mi} className="card flex flex-col gap-0 !p-0 overflow-hidden">
                <button
                  className="flex items-center justify-between px-5 py-4 w-full text-left"
                  onClick={() => setExpandedMeal(expandedMeal === mi ? null : mi)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meal.icon}</span>
                    <div>
                      <p className="text-sm font-extrabold text-zinc-900">{meal.meal}</p>
                      <p className="text-[10px] text-zinc-400">{meal.time} · {meal.items.reduce((s, i) => s + i.cal, 0)} kcal</p>
                    </div>
                  </div>
                  {expandedMeal === mi ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                </button>

                {expandedMeal === mi && (
                  <div className="border-t border-zinc-100 px-5 pb-4 flex flex-col gap-2.5 pt-3">
                    {meal.items.map((item, ii) => (
                      <div key={ii} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-400">{item.qty}g · P:{item.prot}g G:{item.carb}g L:{item.fat}g</p>
                        </div>
                        <span className="text-sm font-black text-orange-500 flex-shrink-0 ml-3">{item.cal}</span>
                      </div>
                    ))}
                    <button onClick={triggerDemo}
                      className="mt-1 w-full py-2 border-2 border-dashed border-zinc-200 rounded-2xl text-xs text-zinc-400 hover:border-tta-mid hover:text-tta-mid transition-all font-medium">
                      + Ajouter un aliment
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Dîner vide */}
            <button onClick={triggerDemo}
              className="card !border-dashed !border-zinc-200 flex items-center gap-3 hover:border-tta-mid hover:bg-tta-light/30 transition-all group">
              <span className="text-xl">🌙</span>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-zinc-400 group-hover:text-tta-mid">Dîner</p>
                <p className="text-[10px] text-zinc-300">Aucun aliment enregistré</p>
              </div>
              <ChevronRight size={16} className="text-zinc-300 group-hover:text-tta-mid" />
            </button>

            <button onClick={() => router.push('/auth')}
              className="w-full py-4 rounded-3xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              Commencer mon journal ✨ <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ════════════════════════════ BILAN ════════════════════════════ */}
        {tab === 'bilan' && (
          <div className="flex flex-col gap-4">

            <div>
              <p className="text-base font-extrabold text-zinc-900">Bilan & Évolution</p>
              <p className="text-xs text-zinc-400">7 derniers jours</p>
            </div>

            {/* KPIs bilan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="kpi-card">
                <span className="text-lg">🔥</span>
                <p className="text-xl font-black text-orange-500">1 890 kcal</p>
                <p className="text-xs text-zinc-500 font-medium">Moy. calories/jour</p>
                <p className="text-[10px] text-zinc-400">Objectif : 2 100 kcal</p>
              </div>
              <div className="kpi-card">
                <span className="text-lg">🏋️</span>
                <p className="text-xl font-black text-tta-mid">2 800 kcal</p>
                <p className="text-xs text-zinc-500 font-medium">Cal. brûlées sport</p>
                <p className="text-[10px] text-zinc-400">total 7 jours</p>
              </div>
              <div className="kpi-card">
                <span className="text-lg">📉</span>
                <p className="text-xl font-black text-nutri-dark">-210 kcal</p>
                <p className="text-xs text-zinc-500 font-medium">Déficit moyen</p>
                <p className="text-[10px] text-zinc-400">Perte de poids 🎯</p>
              </div>
              <div className="kpi-card">
                <span className="text-lg">🌙</span>
                <p className="text-xl font-black text-tta-mid">7h15</p>
                <p className="text-xs text-zinc-500 font-medium">Sommeil moy.</p>
                <p className="text-[10px] text-zinc-400">✨ Sommeil optimal</p>
              </div>
            </div>

            {/* Courbe de poids */}
            <div className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                  <Scale size={14} />Courbe de poids
                </h3>
                <span className="text-[10px] text-zinc-400">7 mesures</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={FAKE_WEIGHTS}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4B47A0" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4B47A0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} domain={[62.5, 64.2]} />
                  <Tooltip formatter={(v: number) => [`${v} kg`, 'Poids']} />
                  <ReferenceLine y={62.0} stroke="#22c55e" strokeDasharray="4 2"
                    label={{ value: 'Cible', fontSize: 9, fill: '#22c55e' }} />
                  <Area type="monotone" dataKey="poids" stroke="#4B47A0" fill="url(#wg)"
                    strokeWidth={2.5} dot={{ r: 3, fill: '#4B47A0' }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Départ',    val: '63.8 kg' },
                  { label: 'Actuel',    val: '63.0 kg' },
                  { label: 'Évolution', val: '−0.8 kg' },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-zinc-50 rounded-xl p-2 text-center">
                    <p className="text-sm font-bold text-zinc-900">{val}</p>
                    <p className="text-[10px] text-zinc-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rapport IA */}
            <div className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-700">Rapport IA — 7 jours</h3>
                <button onClick={triggerDemo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tta-mid text-white text-xs font-bold hover:bg-tta transition-all">
                  ✨ Générer
                </button>
              </div>
              <div className="flex gap-3 items-start bg-tta-light rounded-2xl p-4">
                <img src="/waty-rapport.png" alt="Waty" className="w-14 h-14 object-contain flex-shrink-0 drop-shadow-sm" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-tta-mid mb-1">Waty dit :</p>
                  <p className="text-sm text-zinc-700 leading-relaxed">
                    Bravo Marie ! Tu maintiens un déficit régulier de -210 kcal/jour et tu as perdu 0.8 kg en 7 jours 🎉 Ton sommeil est excellent (7h15 en moyenne). Continue sur cette lancée, tu atteindras ton objectif dans environ 6 semaines.
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => router.push('/auth')}
              className="w-full py-4 rounded-3xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              Suivre ma progression ✨ <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ════════════════════════════ SPORT ════════════════════════════ */}
        {tab === 'sport' && (
          <div className="flex flex-col gap-4">

            <div>
              <p className="text-base font-extrabold text-zinc-900">Séance du jour</p>
              <p className="text-xs text-zinc-400">Mardi 3 juin 2025</p>
            </div>

            {/* Dernière séance */}
            <div className="card bg-sport-light border-sport/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sport-dark">✅ Séance ce matin</h3>
                <span className="text-[10px] text-zinc-500 bg-white rounded-full px-2 py-0.5">07h00</span>
              </div>
              <div>
                <p className="text-base font-extrabold text-zinc-900">Musculation — Dos & Biceps</p>
                <p className="text-xs text-zinc-500 mt-0.5">Généré par Waty IA</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Durée',       val: '45 min' },
                  { label: 'Cal. brûlées', val: '310 kcal' },
                  { label: 'Exercices',   val: '6 mvts' },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white rounded-xl p-2 text-center">
                    <p className="text-sm font-extrabold text-sport-dark">{val}</p>
                    <p className="text-[10px] text-zinc-400">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                {['Tractions × 4×8', 'Rowing barre × 4×10', 'Tirage poulie × 3×12', 'Curl haltères × 3×12', 'Marteau × 3×10', 'Gainage 3×45s'].map((ex, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2">
                    <div className="w-5 h-5 rounded-full bg-sport/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-extrabold text-sport-dark">{i + 1}</span>
                    </div>
                    <span className="text-xs font-medium text-zinc-700">{ex}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nouvelle séance */}
            <button onClick={triggerDemo}
              className="w-full py-4 rounded-3xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              style={{ background: 'linear-gradient(90deg, #7b7fd4, #2BA8B0)' }}>
              🎙️ Logger une nouvelle séance
            </button>

            {/* Conseils */}
            <div>
              <p className="text-sm font-bold text-zinc-700 mb-2">💡 Conseils du coach</p>
              <div className="flex flex-col gap-2">
                {SPORT_TIPS.map((tip, i) => <TipCard key={i} tip={tip} />)}
              </div>
            </div>

            <button onClick={() => router.push('/auth')}
              className="w-full py-4 rounded-3xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
              style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
              Commencer mon suivi sport ✨ <ArrowRight size={16} />
            </button>
          </div>
        )}

      </main>

      {/* ── Bottom CTA fixe ── */}
      <div className="sticky bottom-0 w-full border-t border-zinc-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-zinc-900">Prêt(e) à commencer ?</p>
            <p className="text-[10px] text-zinc-400">14 jours d'essai gratuit · Sans CB</p>
          </div>
          <button onClick={() => router.push('/auth')}
            className="flex items-center gap-2 text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl flex-shrink-0 shadow-md active:scale-95 transition-all"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
            S'inscrire <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Toast */}
      {showToast && <DemoToast onClose={() => setShowToast(false)} />}
    </div>
  )
}
