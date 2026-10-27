'use client'

/**
 * Guide nutritionnel d'une recette :
 *   1. Score MYTA (A→E, pour 100 g) — ou « estimation partielle » si confiance faible
 *   2. Macros par portion
 *   3. « Impact sur ta journée » : % de ton objectif calorique + reste à couvrir (lu depuis profiles + journal du jour)
 *   4. Détail pour 100 g (repliable)
 *
 * Règles MYTA : on situe, on ne prescrit pas ; pas de rouge ; pas de note pour un compte enfant.
 */

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Info, Loader2, PlusCircle, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/utils'
import { describeScore, SCORE_COLORS, type ScoreMyta } from '@/lib/score-myta'
import { addRecipeToJournal, type Recipe } from '@/lib/recipes'

interface Targets { cal: number; prot: number; carb: number; fat: number }

interface Props {
  recipe: Recipe
  score?: ScoreMyta | null
  /** Affiche le bouton « Ajouter au journal » (1 portion) */
  allowJournal?: boolean
  onToast?: (msg: string) => void
}

export function RecipeNutritionGuide({ recipe, score, allowJournal = true, onToast }: Props) {
  const supabase = createClient()
  const s = score ?? recipe.score ?? null

  const [targets, setTargets]   = useState<Targets | null>(null)
  const [today, setToday]       = useState<Targets | null>(null)
  const [isChild, setIsChild]   = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [adding, setAdding]     = useState(false)
  const [added, setAdded]       = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: p }, { data: rows }] = await Promise.all([
        supabase.from('profiles').select('calorie_target, prot_target, carb_target, fat_target, weight_kg, family_role').eq('id', user.id).single(),
        supabase.from('journal_entries').select('cal, prot, carb, fat').eq('user_id', user.id).eq('date', todayISO()),
      ])
      if (cancelled) return
      if (p) {
        setIsChild(p.family_role === 'child')
        const cal = Number(p.calorie_target) || 2000
        setTargets({
          cal,
          prot: Number(p.prot_target) || Math.round((Number(p.weight_kg) || 70) * 1.6),
          carb: Number(p.carb_target) || Math.round(cal * 0.45 / 4),
          fat:  Number(p.fat_target)  || Math.round(cal * 0.30 / 9),
        })
      }
      const t: Targets = { cal: 0, prot: 0, carb: 0, fat: 0 }
      for (const r of rows ?? []) { t.cal += Number(r.cal) || 0; t.prot += Number(r.prot) || 0; t.carb += Number(r.carb) || 0; t.fat += Number(r.fat) || 0 }
      setToday(t)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id])

  const cal  = recipe.calories ?? 0
  const prot = recipe.proteines ?? s?.perPortion.prot ?? 0
  const carb = recipe.glucides  ?? s?.perPortion.carb ?? 0
  const fat  = recipe.lipides   ?? s?.perPortion.fat  ?? 0

  async function handleAdd() {
    setAdding(true)
    const res = await addRecipeToJournal(supabase, { ...recipe, score: s }, 1)
    setAdding(false)
    if (res.ok) {
      setAdded(true)
      setToday(t => t ? { cal: t.cal + cal, prot: t.prot + prot, carb: t.carb + carb, fat: t.fat + fat } : t)
      onToast?.('Une portion ajoutée à ton journal')
    } else onToast?.("Erreur lors de l'ajout au journal")
  }

  const pctDay = targets ? Math.round(cal / targets.cal * 100) : null
  const restAfter = targets && today ? {
    cal:  Math.max(0, Math.round(targets.cal  - today.cal  - cal)),
    prot: Math.max(0, Math.round(targets.prot - today.prot - prot)),
    carb: Math.max(0, Math.round(targets.carb - today.carb - carb)),
    fat:  Math.max(0, Math.round(targets.fat  - today.fat  - fat)),
  } : null

  const phrases = s ? describeScore(s) : []

  return (
    <div className="flex flex-col gap-3">

      {/* ── Score MYTA ── */}
      <div className="card flex items-center gap-4">
        {s && s.grade && !isChild ? (
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black ring-4 flex-shrink-0 ${SCORE_COLORS[s.grade].bg} ${SCORE_COLORS[s.grade].text} ${SCORE_COLORS[s.grade].ring}`}>
            {s.grade}
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center flex-shrink-0">
            <Info size={22} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold text-nutri-dark uppercase tracking-wide">Score MYTA</p>
          {s ? (
            <>
              <p className="text-sm font-bold text-zinc-900 mt-0.5">
                {isChild ? 'Valeurs nutritionnelles' : s.grade ? `Note ${s.grade} pour 100 g` : 'Estimation partielle'}
              </p>
              <p className="text-xs text-zinc-500 leading-snug mt-0.5 first-letter:uppercase">{phrases.join(' · ')}</p>
              <p className="text-[10px] text-zinc-400 mt-1">
                {s.confidence === 'faible'
                  ? `${s.matchedPct} % des ingrédients reconnus — pas assez pour une note fiable`
                  : `Confiance ${s.confidence} · ${s.matchedPct} % des ingrédients reconnus (CIQUAL)`}
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-500 mt-0.5">Score non calculé pour cette recette (générée avant la mise à jour).</p>
          )}
        </div>
      </div>

      {/* ── Macros par portion ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'kcal',      val: `${Math.round(cal)}`, color: 'text-nutri-dark', bg: 'bg-nutri-light' },
          { label: 'Protéines', val: `${Math.round(prot)} g`, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Glucides',  val: `${Math.round(carb)} g`, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Lipides',   val: `${Math.round(fat)} g`,  color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map(m => (
          <div key={m.label} className={`${m.bg} rounded-2xl p-2 text-center`}>
            <p className={`text-base font-extrabold ${m.color}`}>{m.val}</p>
            <p className="text-[10px] text-zinc-400">{m.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-400 -mt-1 text-center">
        Par portion{s?.perPortion.poids ? ` (~${s.perPortion.poids} g)` : ''} · {recipe.portions} portion{recipe.portions > 1 ? 's' : ''} dans la recette
      </p>

      {/* ── Impact sur ta journée ── */}
      {!isChild && (
        <div className="card-nutri">
          <p className="text-xs font-extrabold text-nutri-dark mb-2">Impact sur ta journée</p>
          {targets && today ? (
            <>
              <div className="flex items-end justify-between mb-2">
                <p className="text-sm text-nutri-dark leading-snug">
                  Une portion = <span className="font-black text-lg">{pctDay} %</span> de tes calories du jour
                </p>
                <p className="text-[10px] text-nutri-dark/70 text-right">objectif {targets.cal} kcal<br />déjà {Math.round(today.cal)} kcal</p>
              </div>
              <div className="h-2.5 rounded-full bg-white/70 overflow-hidden flex">
                <div className="h-full bg-nutri-dark/40" style={{ width: `${Math.min(100, today.cal / targets.cal * 100)}%` }} />
                <div className="h-full bg-nutri" style={{ width: `${Math.min(100 - Math.min(100, today.cal / targets.cal * 100), cal / targets.cal * 100)}%` }} />
              </div>
              {restAfter && (
                <p className="text-xs text-nutri-dark mt-2 leading-snug">
                  {restAfter.cal > 0
                    ? <>Après ce repas, il te restera <b>{restAfter.cal} kcal</b>, dont <b>{restAfter.prot} g</b> de protéines à couvrir aujourd'hui.</>
                    : <>Avec ce repas, ton objectif calorique du jour est atteint — parfait pour finir la journée en douceur.</>}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-nutri-dark/70"><Loader2 size={14} className="animate-spin" />Calcul avec tes objectifs…</div>
          )}
          {allowJournal && (
            <button onClick={handleAdd} disabled={adding || added}
              className={`mt-3 w-full justify-center btn-nutri py-2.5 ${added ? 'opacity-70' : ''}`}>
              {adding ? <Loader2 size={15} className="animate-spin" /> : added ? <Check size={15} /> : <PlusCircle size={15} />}
              {added ? 'Ajoutée au journal' : 'Ajouter 1 portion au journal'}
            </button>
          )}
        </div>
      )}

      {/* ── Détail 100 g ── */}
      {s && (
        <div className="card p-4">
          <button onClick={() => setShowDetail(v => !v)} className="w-full flex items-center justify-between text-xs font-bold text-zinc-700">
            Valeurs pour 100 g {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showDetail && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {[
                ['Énergie', `${s.per100g.kcal} kcal`], ['Protéines', `${s.per100g.prot} g`],
                ['Glucides', `${s.per100g.carb} g`], ['dont sucres', `${s.per100g.sugars} g`],
                ['Lipides', `${s.per100g.fat} g`], ['dont saturés', `${s.per100g.satFat} g`],
                ['Fibres', `${s.per100g.fiber} g`], ['Sel', `${s.per100g.salt} g`],
                ['Fruits, légumes, légumineuses', `${s.per100g.fvl} %`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-500">{k}</span><span className="font-semibold text-zinc-800">{v}</span>
                </div>
              ))}
              {s.unmatched.length > 0 && (
                <p className="col-span-2 text-[10px] text-zinc-400 mt-2">Estimés par l'IA : {s.unmatched.join(', ')}</p>
              )}
              <p className="col-span-2 text-[10px] text-zinc-400 mt-1">
                Indice MYTA calculé à partir des ingrédients (poids crus) — sans lien avec le Nutri-Score officiel, à visée informative et non médicale.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
