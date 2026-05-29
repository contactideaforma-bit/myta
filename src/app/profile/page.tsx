'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Check, Loader2, User, Scale, Ruler, Calendar,
  Target, Flame, Dumbbell, LogOut, Layers,
} from 'lucide-react'

const SPORT_GOALS = [
  { value: 'perte de poids', label: 'Perte de poids' },
  { value: 'prise de masse', label: 'Prise de masse' },
  { value: 'endurance',      label: 'Endurance' },
  { value: 'forme generale', label: 'Forme générale' },
  { value: 'performance',    label: 'Performance' },
]

const ACTIVITY_LEVELS = [
  { value: 1.2,   label: 'Sédentaire' },
  { value: 1.375, label: 'Légèrement actif (1–3j/sem)' },
  { value: 1.55,  label: 'Modérément actif (3–5j/sem)' },
  { value: 1.725, label: 'Très actif (6–7j/sem)' },
  { value: 1.9,   label: 'Extrêmement actif' },
]

export default function ProfilePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [email,   setEmail]   = useState('')

  const [form, setForm] = useState({
    full_name:       '',
    weight_kg:       '',
    height_cm:       '',
    birth_date:      '',
    goal:            '',       // objectif sport
    calorie_target:  '',       // objectif calorique nutrition
    prot_target:     '',
    carb_target:     '',
    fat_target:      '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setEmail(user.email ?? '')
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setForm({
        full_name:      data.full_name      ?? '',
        weight_kg:      data.weight_kg      ? String(data.weight_kg)     : '',
        height_cm:      data.height_cm      ? String(data.height_cm)     : '',
        birth_date:     data.birth_date     ?? '',
        goal:           data.goal           ?? '',
        calorie_target: data.calorie_target ? String(data.calorie_target) : '',
        prot_target:    data.prot_target    ? String(data.prot_target)    : '',
        carb_target:    data.carb_target    ? String(data.carb_target)    : '',
        fat_target:     data.fat_target     ? String(data.fat_target)     : '',
      })
    }
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('profiles').upsert({
      id:             user.id,
      full_name:      form.full_name.trim()        || null,
      weight_kg:      parseFloat(form.weight_kg)   || null,
      height_cm:      parseInt(form.height_cm)     || null,
      birth_date:     form.birth_date              || null,
      goal:           form.goal                    || null,
      calorie_target: parseInt(form.calorie_target) || null,
      prot_target:    parseInt(form.prot_target)   || null,
      carb_target:    parseInt(form.carb_target)   || null,
      fat_target:     parseInt(form.fat_target)    || null,
    }, { onConflict: 'id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // Calcul TDEE estimé si données disponibles
  const tdeeEstimate = (() => {
    const w = parseFloat(form.weight_kg)
    const h = parseInt(form.height_cm)
    const bd = form.birth_date
    if (!w || !h || !bd) return null
    const age = new Date().getFullYear() - new Date(bd).getFullYear()
    const bmr = 10 * w + 6.25 * h - 5 * age + 5
    return Math.round(bmr * 1.55)
  })()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Mon profil</h1>
          <p className="text-sm text-zinc-400">{email}</p>
        </div>
        <button onClick={signOut} className="btn-ghost text-zinc-400 hover:text-red-500 text-xs gap-1.5">
          <LogOut size={14} />Déconnexion
        </button>
      </div>

      {/* Identité */}
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
            <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1"><Scale size={11} /> Poids (kg)</label>
            <input type="number" min="30" max="250" step="0.1" className="input" placeholder="ex: 68"
              value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1"><Ruler size={11} /> Taille (cm)</label>
            <input type="number" min="100" max="250" className="input" placeholder="ex: 168"
              value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1"><Calendar size={11} /> Date de naissance</label>
          <input type="date" className="input" value={form.birth_date}
            onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
        </div>
      </div>

      {/* Objectif Sport */}
      <div className="card flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
          <Dumbbell size={14} />Objectif sport
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

      {/* Objectifs Nutrition */}
      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
            <Flame size={14} />Objectifs nutrition
          </h2>
          {tdeeEstimate && (
            <span className="text-xs text-zinc-400">TDEE estimé : <span className="font-bold text-nutri-dark">{tdeeEstimate} kcal</span></span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-zinc-400 mb-1 block">Objectif calorique (kcal/jour)</label>
            <input type="number" min="1000" max="6000" className="input" placeholder={tdeeEstimate ? `Estimé : ${tdeeEstimate}` : 'ex: 2000'}
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
          <div className="flex items-end">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Laissez vide pour utiliser les valeurs calculées automatiquement.
            </p>
          </div>
        </div>
      </div>

      {/* Sauvegarde */}
      <button onClick={save} disabled={saving}
        className={`btn-primary justify-center py-3 transition-all ${saved ? 'bg-green-600 hover:bg-green-600' : ''}`}>
        {saving
          ? <><Loader2 size={16} className="animate-spin" />Sauvegarde…</>
          : saved
          ? <><Check size={16} />Profil sauvegardé !</>
          : <><Check size={16} />Sauvegarder</>
        }
      </button>

      {/* Info */}
      <div className="card bg-tta-light border-tta-mid/20">
        <div className="flex gap-2 items-start">
          <Layers size={14} className="text-tta-mid flex-shrink-0 mt-0.5" />
          <p className="text-xs text-tta-mid leading-relaxed">
            <span className="font-semibold">Profil partagé MYTA.</span> Ces données alimentent à la fois le module Nutrition (calcul des macros, TDEE) et le module Sport (calories brûlées par séance).
          </p>
        </div>
      </div>
    </div>
  )
}
