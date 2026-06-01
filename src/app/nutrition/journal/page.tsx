'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Flame,
  Search, X, Trash2, Loader2,
  Scale, BarChart3, Mic,
} from 'lucide-react'
import { todayISO, round1 } from '@/lib/utils'
import { searchFoods, type FoodItem } from '@/lib/foods-db'
import { Waty, getWatyMessage } from '@/components/ui/Waty'
import { VoiceMeal, type DetectedFood } from '@/components/nutrition/VoiceMeal'
import {
  calcInflamScore, hasGluten, classifyInflam,
  inflamGaugePct, inflamAdvice, calcMicros,
} from '@/lib/nutrition-analysis'
import type { JournalEntry, WeightLog, Profile } from '@/types'

interface DayMacros { cal: number; prot: number; carb: number; fat: number }

// ─── Helpers date ──────────────────────────────────────────────────────────
function addDays(str: string, n: number): string {
  const d = new Date(str + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDateFR(str: string): string {
  const d = new Date(str + 'T12:00:00')
  return format(d, 'EEEE d MMMM yyyy', { locale: fr })
}



// ─── Modal détail nutriment ────────────────────────────────────────────────
interface NutrientEntry { food_name: string; value: number; unit: string }

function NutrientDetailModal({ title, color, entries, onClose }: {
  title: string; color: string; entries: NutrientEntry[]; onClose: () => void
}) {
  const total = entries.reduce((s, e) => s + e.value, 0)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-extrabold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">Aucun aliment contributeur détecté.</p>
          ) : entries.map((e, i) => {
            const pct = total > 0 ? Math.round((e.value / total) * 100) : 0
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{e.food_name}</p>
                  <div className="h-1.5 bg-zinc-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color }}>{round1(e.value)} {e.unit}</p>
                  <p className="text-[10px] text-zinc-400">{pct}%</p>
                </div>
              </div>
            )
          })}
          <p className="text-xs text-zinc-400 text-center pt-2 border-t border-zinc-100">
            Total : <span className="font-bold">{round1(total)} {entries[0]?.unit ?? ''}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Composant MacroCard cliquable ─────────────────────────────────────────
function MacroCard({ label, icon, value, unit, goal, color, onClick }: {
  label: string; icon: string; value: number; unit: string; goal: number; color: string
  onClick?: () => void
}) {
  const pct = Math.min(100, goal > 0 ? Math.round((value / goal) * 100) : 0)
  return (
    <button onClick={onClick} className="card text-left w-full hover:shadow-md transition-all active:scale-[0.98]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-black text-zinc-900">
        {value} <span className="text-sm font-semibold text-zinc-400">{unit}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full mt-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-zinc-400 mt-1">Objectif : {goal} {unit}</p>
    </button>
  )
}

// ─── Composant modal ajout aliment ────────────────────────────────────────
function AddFoodModal({ food, onConfirm, onClose }: {
  food: FoodItem
  onConfirm: (qty: number) => void
  onClose: () => void
}) {
  const [qty, setQty] = useState(100)
  const r = qty / 100
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-bold text-zinc-900 mb-1">➕ Ajouter</h3>
        <p className="text-sm text-nutri-dark font-semibold mb-4 truncate">{food.name}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { val: Math.round(food.cal * r), lbl: 'kcal', color: 'text-orange-500' },
            { val: round1(food.prot * r),    lbl: 'Prot.', color: 'text-blue-500' },
            { val: round1(food.carb * r),    lbl: 'Gluc.', color: 'text-yellow-500' },
            { val: round1(food.fat * r),     lbl: 'Lip.',  color: 'text-purple-500' },
          ].map(({ val, lbl, color }) => (
            <div key={lbl} className="text-center bg-zinc-50 rounded-xl p-2">
              <div className={`text-base font-black ${color}`}>{val}</div>
              <div className="text-xs text-zinc-400 uppercase">{lbl}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="number" min={1} max={5000} value={qty}
            onChange={e => setQty(Number(e.target.value))}
            className="input flex-1 text-center font-mono text-lg font-bold"
            autoFocus
          />
          <span className="text-sm text-zinc-400 font-semibold">grammes</span>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Annuler</button>
          <button onClick={() => onConfirm(qty)} className="flex-1 py-2.5 rounded-xl bg-nutri text-white text-sm font-bold hover:bg-nutri-dark">Ajouter</button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────
export default function JournalPage() {
  const supabase = createClient()

  const [currentDate, setCurrentDate] = useState(todayISO())
  const [entries, setEntries]         = useState<JournalEntry[]>([])
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [weights, setWeights]         = useState<WeightLog[]>([])
  const [recentFoods, setRecentFoods]   = useState<JournalEntry[]>([])
  const [weekCal, setWeekCal]         = useState<Record<string, number>>({})
  const [loading, setLoading]         = useState(true)

  // Recherche
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<FoodItem[]>([])
  const [searching, setSearching]   = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [showVoiceMeal, setShowVoiceMeal] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Poids
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [nutriModal, setNutriModal] = useState<{ title: string; color: string; entries: NutrientEntry[] } | null>(null)

  // Objectifs calculés depuis profil
  const goals = useCallback((): DayMacros => {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.birth_date) {
      return { cal: 2000, prot: 120, carb: 225, fat: 65 }
    }
    const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear()
    const bmr = profile.goal === 'femme'
      ? 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age - 161
      : 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age + 5
    const tdee = Math.round(bmr * 1.55)
    const cal = profile.calorie_target ?? tdee
    return {
      cal,
      prot: profile.prot_target ?? Math.round(profile.weight_kg * 1.6),
      carb: profile.carb_target ?? Math.round(cal * 0.40 / 4),
      fat:  profile.fat_target  ?? Math.round(cal * 0.30 / 9),
    }
  }, [profile])

  // Charge données initiales
  useEffect(() => { loadAll() }, [])

  // Recharge journal quand la date change
  useEffect(() => { loadDay(currentDate) }, [currentDate])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: wts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('weight_log').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(14),
    ])
    setProfile(prof ?? null)
    setWeights(wts ?? [])

    // Préparer weekCal (7 jours)
    const days = Array.from({ length: 7 }, (_, i) => addDays(todayISO(), -i))
    const { data: calRows } = await supabase.from('journal_entries')
      .select('date, cal').eq('user_id', user.id).in('date', days)
    const map: Record<string, number> = {}
    for (const r of calRows ?? []) map[r.date] = (map[r.date] ?? 0) + Number(r.cal)
    setWeekCal(map)

    // Charger les 8 aliments les plus récents (derniers 7 jours)
    const { data: recent } = await supabase.from('journal_entries')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    // Dédupliquer par food_name, garder le plus récent de chaque
    const seen = new Set<string>()
    const deduped: JournalEntry[] = []
    for (const r of recent ?? []) {
      if (!seen.has(r.food_name)) { seen.add(r.food_name); deduped.push(r) }
      if (deduped.length >= 8) break
    }
    setRecentFoods(deduped)

    await loadDay(currentDate)
    setLoading(false)
  }

  async function loadDay(date: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('journal_entries')
      .select('*').eq('user_id', user.id).eq('date', date).order('created_at')
    setEntries((data as JournalEntry[]) ?? [])
  }

  // Totaux du jour
  const totals: DayMacros = entries.reduce((t, e) => ({
    cal:  Math.round(t.cal  + Number(e.cal)),
    prot: round1(t.prot + Number(e.prot)),
    carb: round1(t.carb + Number(e.carb)),
    fat:  round1(t.fat  + Number(e.fat)),
  }), { cal: 0, prot: 0, carb: 0, fat: 0 })

  // Recherche aliments — base locale instantanée + API serveur en complément
  function handleSearch(q: string) {
    setQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 2) { setResults([]); setSearching(false); return }

    // Phase 1 : résultats locaux instantanés (CIQUAL, tout en FR)
    const local = searchFoods(q, 8)
    setResults(local)

    // Phase 2 : API serveur (USDA + OFF traduit FR) après 600ms
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-food?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        const remote: FoodItem[] = data.results ?? []
        // Fusion sans doublons
        const seen = new Set(local.map(f => String(f.name).toLowerCase().trim().slice(0, 25)))
        const merged = [
          ...local,
          ...remote.filter(f => !seen.has(String(f.name).toLowerCase().trim().slice(0, 25)))
        ]
        setResults(merged.slice(0, 15))
      } catch {
        // Garde les résultats locaux si l'API échoue
      }
      setSearching(false)
    }, 600)
  }

  async function confirmAdd(qty: number) {
    if (!selectedFood) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ratio = qty / 100
    const entry = {
      user_id: user.id, date: currentDate,
      food_id: selectedFood.id, food_name: selectedFood.name,
      food_cat: selectedFood.cat ?? 'produit',
      quantity: qty,
      cal:  Math.round(selectedFood.cal  * ratio),
      prot: round1(selectedFood.prot * ratio),
      carb: round1(selectedFood.carb * ratio),
      fat:  round1(selectedFood.fat  * ratio),
      image_url: selectedFood.image_url ?? null,
    }
    const { error } = await supabase.from('journal_entries').insert(entry)
    if (error) { showToast('Erreur ajout', 'err'); return }
    setSelectedFood(null)
    setQuery('')
    setResults([])
    await loadDay(currentDate)
    setWeekCal(prev => ({ ...prev, [currentDate]: (prev[currentDate] ?? 0) + entry.cal }))
    showToast(`✓ ${selectedFood.name} ajouté`, 'ok')
  }

  async function handleVoiceMealConfirm(foods: DetectedFood[]) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const entries = foods.map(f => ({
      user_id:   user.id,
      date:      currentDate,
      food_id:   null,
      food_name: f.name,
      food_cat:  f.cat ?? 'aliment',
      quantity:  f.quantity,
      cal:       Math.round(f.cal),
      prot:      round1(f.prot),
      carb:      round1(f.carb),
      fat:       round1(f.fat),
      image_url: null,
    }))
    const { error } = await supabase.from('journal_entries').insert(entries)
    if (error) { showToast('Erreur ajout', 'err'); return }
    setShowVoiceMeal(false)
    await loadDay(currentDate)
    const totalCal = entries.reduce((s, e) => s + e.cal, 0)
    setWeekCal(prev => ({ ...prev, [currentDate]: (prev[currentDate] ?? 0) + totalCal }))
    showToast(`✓ ${foods.length} aliment${foods.length > 1 ? 's' : ''} ajouté${foods.length > 1 ? 's' : ''}`, 'ok')
  }

  async function deleteEntry(id: string) {
    await supabase.from('journal_entries').delete().eq('id', id)
    await loadDay(currentDate)
    showToast('Aliment supprimé', 'err')
  }

  async function logWeight() {
    const val = parseFloat(weightInput)
    if (!val || val < 20 || val > 400) { showToast('Poids invalide', 'err'); return }
    setSavingWeight(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingWeight(false); return }
    await supabase.from('weight_log').upsert(
      { user_id: user.id, date: currentDate, weight_kg: val },
      { onConflict: 'date,user_id' }
    )
    const { data } = await supabase.from('weight_log')
      .select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(14)
    setWeights(data ?? [])
    setWeightInput('')
    setSavingWeight(false)
    showToast(`⚖️ ${val} kg enregistré`, 'ok')
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  const g = goals()
  const isToday = currentDate === todayISO()

  return (
    <div className="page">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg transition-all ${toast.type === 'ok' ? 'bg-nutri' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Modal ajout */}
      {/* Modal détail nutriment */}
      {nutriModal && (
        <NutrientDetailModal
          title={nutriModal.title}
          color={nutriModal.color}
          entries={nutriModal.entries}
          onClose={() => setNutriModal(null)}
        />
      )}

      {selectedFood && (
        <AddFoodModal food={selectedFood} onConfirm={confirmAdd} onClose={() => setSelectedFood(null)} />
      )}

      {/* Header + navigation date */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Journal alimentaire</h1>
          <p className="text-sm text-zinc-400 capitalize">{formatDateFR(currentDate)}</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-full px-2 py-1 shadow-sm">
          <button onClick={() => setCurrentDate(d => addDays(d, -1))} className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-500">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold min-w-[90px] text-center">
            {isToday ? "Aujourd'hui" : format(new Date(currentDate + 'T12:00'), 'd MMM', { locale: fr })}
          </span>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} disabled={isToday} className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-500 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 gap-3">
        <MacroCard label="Calories" icon="🔥" value={totals.cal}  unit="kcal" goal={g.cal}  color="bg-orange-400"
          onClick={() => setNutriModal({ title: '🔥 Calories par aliment', color: '#f97316',
            entries: entries.map(e => ({ food_name: e.food_name, value: Number(e.cal), unit: 'kcal' })) })} />
        <MacroCard label="Protéines" icon="💪" value={totals.prot} unit="g" goal={g.prot} color="bg-blue-400"
          onClick={() => setNutriModal({ title: '💪 Protéines par aliment', color: '#3b82f6',
            entries: entries.map(e => ({ food_name: e.food_name, value: Number(e.prot), unit: 'g' })).filter(e => e.value > 0) })} />
        <MacroCard label="Glucides"  icon="🌾" value={totals.carb} unit="g" goal={g.carb} color="bg-yellow-400"
          onClick={() => setNutriModal({ title: '🌾 Glucides par aliment', color: '#eab308',
            entries: entries.map(e => ({ food_name: e.food_name, value: Number(e.carb), unit: 'g' })).filter(e => e.value > 0) })} />
        <MacroCard label="Lipides"   icon="🥑" value={totals.fat}  unit="g" goal={g.fat}  color="bg-purple-400"
          onClick={() => setNutriModal({ title: '🥑 Lipides par aliment', color: '#a855f7',
            entries: entries.map(e => ({ food_name: e.food_name, value: Number(e.fat), unit: 'g' })).filter(e => e.value > 0) })} />
      </div>

      {/* Waty conseil nutrition */}
      {(() => {
        const { message, mode } = getWatyMessage({
          type: 'journal',
          calToday: totals.cal,
          calTarget: g.cal,
          protToday: totals.prot,
          protTarget: g.prot,
          isEmpty: entries.length === 0,
        })
        return <Waty mode={mode} message={message} size="sm" />
      })()}

      {/* Modal ajout vocal repas */}
      {showVoiceMeal && (
        <VoiceMeal
          onConfirm={handleVoiceMealConfirm}
          onCancel={() => setShowVoiceMeal(false)}
        />
      )}

      {/* Bouton ajout vocal + Recherche */}
      {!showVoiceMeal && (
        <button onClick={() => setShowVoiceMeal(true)}
          className="w-full flex items-center gap-3 bg-gradient-to-r from-nutri to-nutri-mid rounded-2xl px-4 py-3 text-left hover:opacity-90 transition-all active:scale-[0.98] shadow-sm">
          <div className="w-9 h-9 bg-white/25 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mic size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Ajouter un repas en vocal ou texte</p>
            <p className="text-xs text-white/70">"J'ai mangé un bol de riz avec du poulet..."</p>
          </div>
        </button>
      )}

      {/* ── Aliments récents — accès rapide ── */}
      {recentFoods.length > 0 && !query && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">⚡ Récents</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {recentFoods.map((food, i) => (
              <button
                key={i}
                onClick={() => setSelectedFood({
                  id: food.food_id ?? food.food_name,
                  name: food.food_name,
                  cal: Number(food.cal),
                  prot: Number(food.prot),
                  carb: Number(food.carb),
                  fat: Number(food.fat),
                  image_url: food.image_url ?? null,
                  cat: food.food_cat ?? '',
                })}
                className="flex-shrink-0 flex flex-col items-center gap-1 bg-white border border-zinc-100 rounded-2xl p-2.5 shadow-sm hover:border-nutri/40 hover:shadow-md transition-all active:scale-95 w-20"
              >
                <div className="w-10 h-10 rounded-xl bg-nutri-light flex items-center justify-center text-lg flex-shrink-0">
                  {food.image_url
                    ? <img src={food.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    : '🍴'}
                </div>
                <p className="text-[10px] font-semibold text-zinc-700 text-center leading-tight line-clamp-2 w-full">{food.food_name}</p>
                <p className="text-[9px] text-orange-400 font-bold">{Math.round(Number(food.cal))} kcal</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recherche */}
      <div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text" value={query} onChange={e => handleSearch(e.target.value)}
            placeholder="Rechercher un aliment (poulet, riz, pomme…)"
            className="input pl-9 pr-10"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown résultats */}
        {(results.length > 0 || searching) && query.length >= 2 && (
          <div className="mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-10 relative">
            {searching && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-400">
                <Loader2 size={13} className="animate-spin" />Recherche…
              </div>
            )}
            {results.map((food, i) => (
              <button key={i} onClick={() => setSelectedFood(food)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-nutri-light/50 text-left border-b border-zinc-100 last:border-0 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-nutri-light flex items-center justify-center flex-shrink-0 text-sm">
                  {food.image_url
                    ? <img src={food.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    : '🍴'}
                </div>
                <span className="flex-1 text-sm font-medium truncate">{food.name}</span>
                <span className="text-sm font-bold text-orange-500 flex-shrink-0">{food.cal} kcal</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Journal du jour */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-700">📝 Journal du jour</h2>
          <span className="text-xs text-zinc-400">{entries.length} aliment{entries.length > 1 ? 's' : ''}</span>
        </div>

        {entries.length === 0 ? (
          <div className="card text-center py-10 text-zinc-400">
            <p className="text-2xl mb-2">🍽️</p>
            <p className="text-sm">Aucun aliment enregistré.</p>
            <p className="text-xs mt-1">Recherchez un aliment ci-dessus.</p>
          </div>
        ) : (
          <div className="card divide-y divide-zinc-100 p-0">
            {entries.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50/50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-nutri-light flex items-center justify-center flex-shrink-0 text-base">
                  {e.image_url
                    ? <img src={e.image_url} alt="" className="w-full h-full object-cover rounded-xl" onError={ev => { (ev.target as HTMLImageElement).style.display = 'none' }} />
                    : '🍴'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{e.food_name}</p>
                  <p className="text-xs text-zinc-400">{e.quantity}g · P:{e.prot}g · G:{e.carb}g · L:{e.fat}g</p>
                </div>
                <span className="text-sm font-bold text-orange-500 flex-shrink-0">{e.cal} kcal</span>
                <button onClick={() => deleteEntry(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50/50">
              <span className="text-xs text-zinc-400 font-medium">{entries.length} aliment{entries.length > 1 ? 's' : ''}</span>
              <span className="text-sm font-bold text-zinc-900">Total : <span className="text-nutri-dark">{totals.cal} kcal</span></span>
            </div>
          </div>
        )}
      </div>

      {/* ── Inflammation & Gluten ── */}
      {entries.length > 0 && (() => {
        const s = calcInflamScore(entries)
        if (!s) return null
        const pct = inflamGaugePct(s.score, s.total)
        const adv = inflamAdvice(s)
        const glutenItems = entries.filter(e => hasGluten(e.food_name))
        return (
          <div className="card flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-zinc-700">🔥 Inflammation & gluten du jour</h3>

            {/* Jauge */}
            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Très inflammatoire</span><span>Anti-inflammatoire</span>
              </div>
              <div className="relative h-3 rounded-full overflow-visible" style={{ background: 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #fbbf24 50%, #86efac 72%, #22c55e 100%)' }}>
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-zinc-400 rounded-full shadow -translate-x-1/2 transition-all duration-500"
                  style={{ left: `${pct}%` }} />
              </div>
            </div>

            {/* Résumé — badges cliquables */}
            <div className="flex flex-wrap gap-2 text-xs">
              {s.veryInflam > 0 && (
                <button onClick={() => setNutriModal({ title: '🔴 Aliments très inflammatoires', color: '#ef4444',
                  entries: entries.filter(e => classifyInflam(e.food_name) === -2).map(e => ({ food_name: e.food_name, value: Number(e.cal), unit: 'kcal' })) })}
                  className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors">
                  🔴 {s.veryInflam} très inflam.
                </button>
              )}
              {s.inflam > 0 && (
                <button onClick={() => setNutriModal({ title: '🟠 Aliments inflammatoires', color: '#f97316',
                  entries: entries.filter(e => classifyInflam(e.food_name) === -1).map(e => ({ food_name: e.food_name, value: Number(e.cal), unit: 'kcal' })) })}
                  className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium hover:bg-orange-200 transition-colors">
                  🟠 {s.inflam} inflammatoire{s.inflam > 1 ? 's' : ''}
                </button>
              )}
              {s.anti > 0 && (
                <button onClick={() => setNutriModal({ title: '🟢 Aliments anti-inflammatoires', color: '#22c55e',
                  entries: entries.filter(e => classifyInflam(e.food_name) === 1).map(e => ({ food_name: e.food_name, value: Number(e.cal), unit: 'kcal' })) })}
                  className="px-2 py-0.5 rounded-full bg-nutri-light text-nutri-dark font-medium hover:bg-nutri/20 transition-colors">
                  🟢 {s.anti} anti-inflam.
                </button>
              )}
              {s.neutral > 0 && (
                <button onClick={() => setNutriModal({ title: '⚪ Aliments neutres', color: '#71717a',
                  entries: entries.filter(e => classifyInflam(e.food_name) === 0).map(e => ({ food_name: e.food_name, value: Number(e.cal), unit: 'kcal' })) })}
                  className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium hover:bg-zinc-200 transition-colors">
                  ⚪ {s.neutral} neutre{s.neutral > 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Conseil */}
            <div className={`rounded-xl p-3 border text-xs leading-relaxed ${adv.cls}`}>
              {adv.icon} {adv.text}
            </div>

            {/* Gluten */}
            {glutenItems.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1.5">🌾 Aliments contenant du gluten</p>
                <div className="flex flex-wrap gap-1.5">
                  {glutenItems.map(e => (
                    <span key={e.id} className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">{e.food_name}</span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-zinc-400 italic">Indicateur informatif — ne remplace pas un avis médical.</p>
          </div>
        )
      })()}

      {/* ── Micronutriments ── */}
      {entries.length > 0 && (() => {
        const micros = calcMicros(entries.map(e => ({ food_id: e.food_id ?? '', food_name: e.food_name, quantity: e.quantity })))
        const withData = micros.filter(m => m.hasData)
        if (withData.length === 0) return (
          <div className="card">
            <h3 className="text-sm font-semibold text-zinc-700 mb-2">🔬 Micronutriments du jour</h3>
            <p className="text-xs text-zinc-400">Données insuffisantes — ajoutez des aliments CIQUAL (viandes, poissons, légumes, œufs) pour visualiser vos apports.</p>
          </div>
        )
        return (
          <div className="card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-700">🔬 Micronutriments du jour</h3>
              <span className="text-[10px] text-zinc-400">% de l'apport journalier recommandé</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {micros.map(m => (
                <button key={m.name} onClick={() => {
                  if (!m.hasData) return
                  // Cherche les aliments contributeurs pour ce micro via leur nom
                  const contributors = entries
                    .filter(e => {
                      const id = String(e.food_id ?? '')
                      // On montre tous les aliments CIQUAL qui ont des données
                      return id.startsWith('cq') || e.food_name
                    })
                    .map(e => ({ food_name: e.food_name, value: Number(e.cal), unit: 'kcal' }))
                    .filter(e => e.value > 0)
                  setNutriModal({
                    title: `🔬 ${m.name} — aliments du jour`,
                    color: m.color,
                    entries: entries.map(e => ({ food_name: e.food_name, value: Number(e.cal), unit: 'kcal' })).filter(e => e.value > 0),
                  })
                }}
                  className={`flex items-center gap-2 text-left rounded-xl p-1.5 transition-colors ${m.hasData ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-default'}`}>
                  <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{m.name}</span>
                  {m.hasData ? (
                    <>
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(m.pct, 100)}%`, background: m.color }} />
                      </div>
                      <span className="text-xs font-bold w-10 text-right flex-shrink-0" style={{ color: m.color }}>
                        {m.pct > 999 ? '>999%' : `${m.pct}%`}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-zinc-300 italic flex-1">données insuffisantes</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Deux colonnes : poids + graphique semaine */}
      <div className="grid grid-cols-1 gap-4">

        {/* Poids */}
        <div className="card flex flex-col gap-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><Scale size={14} />Poids du jour</h3>
          <div className="flex gap-2">
            <input type="number" step="0.1" min="30" max="300" value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="ex: 72.5" className="input flex-1" />
            <button onClick={logWeight} disabled={savingWeight} className="btn-nutri px-4 py-2 whitespace-nowrap">
              {savingWeight ? <Loader2 size={14} className="animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {weights.slice(0, 5).map((w, i, arr) => {
              const prev = arr[i + 1]
              const diff = prev ? round1(w.weight_kg - prev.weight_kg) : null
              return (
                <div key={w.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 last:border-0">
                  <span className="text-zinc-400">{format(new Date(w.date + 'T12:00'), 'd/MM/yyyy')}</span>
                  <span className="font-bold text-blue-600">
                    {w.weight_kg} kg
                    {diff !== null && diff !== 0 && (
                      <span className={`ml-1.5 text-[10px] ${diff > 0 ? 'text-red-500' : 'text-nutri'}`}>
                        {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
            {weights.length === 0 && <p className="text-xs text-zinc-400">Aucune entrée encore.</p>}
          </div>
        </div>

        {/* Calories 7 jours — curseurs de progression */}
        <div className="card flex flex-col gap-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <BarChart3 size={14} />Calories — 7 derniers jours
          </h3>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 7 }, (_, i) => {
              const d        = addDays(todayISO(), -(6 - i))
              const val      = weekCal[d] ?? 0
              const target   = g.cal || 2000
              const pct      = Math.round((val / target) * 100)
              const isT      = d === currentDate
              const over     = val > target
              const dayLabel = format(new Date(d + 'T12:00'), 'EEE d', { locale: fr })
              const barColor = val === 0 ? '#e5e7eb'
                : over        ? '#f97316'
                : pct >= 80   ? '#22c55e'
                : pct >= 50   ? '#84cc16'
                :               '#d1d5db'
              return (
                <div key={d} className={`flex flex-col gap-1 ${isT ? 'opacity-100' : 'opacity-80'}`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-semibold capitalize ${isT ? 'text-zinc-900' : 'text-zinc-500'}`}>
                      {dayLabel}{isT ? " · Aujourd'hui" : ''}
                    </span>
                    <span className={`font-bold ${
                      val === 0 ? 'text-zinc-300'
                      : over    ? 'text-orange-500'
                      : pct >= 80 ? 'text-green-500'
                      : 'text-zinc-500'
                    }`}>
                      {val === 0 ? '—' : `${val} kcal`}
                      {val > 0 && <span className="text-zinc-400 font-normal"> / {target}</span>}
                    </span>
                  </div>
                  <div className="relative h-4 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                      style={{ width: val === 0 ? '0%' : over ? '100%' : `${pct}%`, backgroundColor: barColor }}
                    />
                    {over && (
                      <div className="absolute right-0 inset-y-0 flex items-center pr-2">
                        <span className="text-[9px] font-extrabold text-orange-600">+{pct - 100}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-zinc-400 pt-1 border-t border-zinc-50">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Objectif atteint</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>Dépassé</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-200 inline-block"/>Non noté</span>
          </div>
        </div>
    </div>
  )
}
