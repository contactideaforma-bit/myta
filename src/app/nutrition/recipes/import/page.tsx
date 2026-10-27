'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Waty } from '@/components/ui/Waty'
import { RecipeNutritionGuide } from '@/components/ui/RecipeNutritionGuide'
import { scoreRecipe, type ScoreMyta } from '@/lib/score-myta'
import { toSavedRow, SOURCE_LABELS, type Recipe, type Ingredient, type Etape, type SourceKind } from '@/lib/recipes'
import {
  ChevronLeft, Link2, ClipboardPaste, Camera, Image as ImageIcon, FileText, X,
  Loader2, Sparkles, Minus, Plus, Trash2, Bookmark, ExternalLink, Clock, Users, Star,
} from 'lucide-react'

interface ImportResult {
  recipe: Recipe & { ingredients: Ingredient[]; etapes: Etape[] }
  score: ScoreMyta
  source: { kind: SourceKind; url?: string; author?: string; title?: string; thumbnail?: string }
  remaining: number | null
}

const DIFFS: Recipe['difficulte'][] = ['Facile', 'Moyen', 'Avancé']

export default function ImportRecipePage() {
  const supabase = createClient()
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)

  // ── Saisie ──
  const [url, setUrl]           = useState('')
  const [text, setText]         = useState('')
  const [showText, setShowText] = useState(false)
  const [image, setImage]       = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [needsMore, setNeedsMore] = useState(false)
  const [toast, setToast]       = useState('')

  // ── Résultat éditable ──
  const [result, setResult]     = useState<ImportResult | null>(null)
  const [recipe, setRecipe]     = useState<(Recipe & { ingredients: Ingredient[]; etapes: Etape[] }) | null>(null)
  const [saving, setSaving]     = useState(false)

  const kindHint = /instagram\.com/i.test(url) ? 'Instagram' : /tiktok\.com/i.test(url) ? 'TikTok' : url ? 'ce lien' : ''

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function pasteFromClipboard() {
    try {
      const t = (await navigator.clipboard.readText()).trim()
      if (/^https?:\/\//i.test(t)) setUrl(t)
      else if (t) { setText(t); setShowText(true) }
    } catch { showToast('Colle le lien à la main (accès presse-papier refusé)') }
  }

  function pickImage(f: File | null) {
    setImage(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function analyze() {
    if (!url && !text.trim() && !image) return
    setLoading(true); setError(''); setNeedsMore(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData()
      fd.append('kind', image ? 'capture' : url ? 'link' : 'text')
      if (url)         fd.append('url', url.trim())
      if (text.trim()) fd.append('text', text.trim())
      if (image)       fd.append('image', image)
      const res  = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erreur pendant l\'analyse')
        if (data.needsMore) { setNeedsMore(true); setShowText(true) }
        if (data.upgradeUrl && (data.code === 'MONTHLY_QUOTA_EXCEEDED' || data.code === 'FEATURE_NOT_INCLUDED')) {
          setError(`${data.error} ${data.hint ?? ''}`)
        }
        return
      }
      const r: ImportResult = data
      setResult(r)
      setRecipe({ ...r.recipe })
      // Photo d'illustration (Pexels, côté serveur) — jamais la photo du créateur
      fetch(`/api/photos?keyword=${encodeURIComponent(r.recipe.photo_keyword || r.recipe.titre)}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      }).then(x => x.json()).then(p => { if (p?.url) setRecipe(prev => prev ? { ...prev, photoUrl: p.url } : prev) }).catch(() => {})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Erreur réseau, réessaie.')
    } finally { setLoading(false) }
  }

  // ── Recalcul local du score quand l'utilisateur corrige quantités / portions ──
  const liveScore = useMemo<ScoreMyta | null>(() => {
    if (!recipe) return null
    const ings = recipe.ingredients.filter(i => i.grammes && i.grammes > 0)
    if (ings.length === 0) return result?.score ?? null
    return scoreRecipe(ings.map(i => ({ nom: i.nom, grammes: i.grammes!, per100g: i.per100g ?? null })), recipe.portions)
  }, [recipe, result])

  const recipeWithMacros = useMemo(() => {
    if (!recipe) return null
    if (!liveScore) return recipe
    return {
      ...recipe,
      calories:  liveScore.perPortion.kcal,
      proteines: liveScore.perPortion.prot,
      glucides:  liveScore.perPortion.carb,
      lipides:   liveScore.perPortion.fat,
      temps:     (recipe.temps_prep ?? 0) + (recipe.temps_cuisson ?? 0),
    }
  }, [recipe, liveScore])

  function updIng(i: number, patch: Partial<Ingredient>) {
    setRecipe(r => r ? { ...r, ingredients: r.ingredients.map((ing, j) => j === i ? { ...ing, ...patch } : ing) } : r)
  }
  function delIng(i: number) {
    setRecipe(r => r ? { ...r, ingredients: r.ingredients.filter((_, j) => j !== i) } : r)
  }
  function updStep(i: number, patch: Partial<Etape>) {
    setRecipe(r => r ? { ...r, etapes: r.etapes.map((e, j) => j === i ? { ...e, ...patch } : e) } : r)
  }

  async function save() {
    if (!recipeWithMacros) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('saved_recipes')
      .upsert(toSavedRow(user.id, recipeWithMacros, liveScore), { onConflict: 'user_id,recipe_id' })
    setSaving(false)
    if (error) { showToast('Erreur de sauvegarde'); console.error(error); return }
    showToast('✓ Recette enregistrée')
    setTimeout(() => router.push('/nutrition/recipes?view=saved'), 600)
  }

  // ═══════════════ Vue prévisualisation / édition ═══════════════
  if (recipe && recipeWithMacros && result) {
    const src = result.source
    return (
      <div className="page">
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-nutri shadow-lg">{toast}</div>}

        <div className="flex items-center justify-between">
          <button onClick={() => { setResult(null); setRecipe(null) }} className="btn-ghost -ml-1"><ChevronLeft size={16} />Modifier la source</button>
          {result.remaining !== null && <span className="text-[10px] text-zinc-400">{result.remaining} import{result.remaining > 1 ? 's' : ''} restant{result.remaining > 1 ? 's' : ''} ce mois</span>}
        </div>

        <Waty mode="nutrition" size="sm" dismissible
          message="Voici ce que j'ai compris de la recette 👩‍🍳 Vérifie les quantités — c'est elles qui font le score — puis enregistre." />

        {/* Photo + titre */}
        <div className="relative rounded-2xl overflow-hidden h-44 bg-zinc-100">
          {recipe.photoUrl
            ? <img src={recipe.photoUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-nutri-light to-zinc-100 flex items-center justify-center text-6xl">🍽️</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <input value={recipe.titre} onChange={e => setRecipe({ ...recipe, titre: e.target.value })}
              className="w-full bg-transparent text-white font-black text-lg leading-tight outline-none border-b border-white/30 focus:border-white" />
          </div>
        </div>

        {/* Crédit source */}
        <div className="card-sm flex items-center gap-3">
          {src.thumbnail && <img src={src.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Source · {SOURCE_LABELS[src.kind] ?? src.kind}</p>
            <input value={recipe.source_author ?? ''} onChange={e => setRecipe({ ...recipe, source_author: e.target.value })}
              placeholder="Auteur / créateur (facultatif)" className="w-full text-sm font-semibold text-zinc-900 bg-transparent outline-none placeholder:font-normal placeholder:text-zinc-300" />
            {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-tta-mid flex items-center gap-1 truncate"><ExternalLink size={11} />Voir la publication d'origine</a>}
          </div>
        </div>

        <textarea value={recipe.description} onChange={e => setRecipe({ ...recipe, description: e.target.value })}
          rows={2} className="input text-sm" placeholder="Description" />

        {/* Temps / portions / niveau */}
        <div className="grid grid-cols-3 gap-2">
          <div className="kpi-card items-center text-center p-2">
            <Clock size={14} className="text-nutri-dark" />
            <div className="flex items-center gap-1 text-xs font-bold text-zinc-900">
              <input type="number" min={0} value={recipe.temps_prep ?? 0} onChange={e => setRecipe({ ...recipe, temps_prep: Number(e.target.value) })} className="w-9 text-center bg-transparent outline-none border-b border-zinc-200" />
              + <input type="number" min={0} value={recipe.temps_cuisson ?? 0} onChange={e => setRecipe({ ...recipe, temps_cuisson: Number(e.target.value) })} className="w-9 text-center bg-transparent outline-none border-b border-zinc-200" />
            </div>
            <p className="text-[10px] text-zinc-400">prép + cuisson (min)</p>
          </div>
          <div className="kpi-card items-center text-center p-2">
            <Users size={14} className="text-nutri-dark" />
            <div className="flex items-center gap-2">
              <button onClick={() => setRecipe({ ...recipe, portions: Math.max(1, recipe.portions - 1) })} className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Minus size={12} /></button>
              <span className="text-sm font-bold text-zinc-900">{recipe.portions}</span>
              <button onClick={() => setRecipe({ ...recipe, portions: recipe.portions + 1 })} className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><Plus size={12} /></button>
            </div>
            <p className="text-[10px] text-zinc-400">Portions</p>
          </div>
          <div className="kpi-card items-center text-center p-2">
            <Star size={14} className="text-nutri-dark" />
            <select value={recipe.difficulte} onChange={e => setRecipe({ ...recipe, difficulte: e.target.value as Recipe['difficulte'] })}
              className="text-xs font-bold text-zinc-900 bg-transparent outline-none">
              {DIFFS.map(d => <option key={d}>{d}</option>)}
            </select>
            <p className="text-[10px] text-zinc-400">Niveau</p>
          </div>
        </div>

        {/* Guide nutritionnel (recalculé en direct) */}
        <RecipeNutritionGuide recipe={recipeWithMacros} score={liveScore} allowJournal={false} />

        {/* Ingrédients éditables */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-900">🛒 Ingrédients</h2>
            <span className="text-[10px] text-zinc-400">quantité · nom · poids (g)</span>
          </div>
          <div className="flex flex-col gap-2">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input value={ing.qte} onChange={e => updIng(i, { qte: e.target.value })} className="input px-2 py-1.5 w-20 text-xs" placeholder="qté" />
                <input value={ing.nom} onChange={e => updIng(i, { nom: e.target.value })} className="input px-2 py-1.5 flex-1 text-xs" placeholder="ingrédient" />
                <input type="number" min={0} value={ing.grammes ?? ''} onChange={e => updIng(i, { grammes: Number(e.target.value) })} className="input px-2 py-1.5 w-16 text-xs" placeholder="g" />
                <button onClick={() => delIng(i)} className="text-zinc-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setRecipe({ ...recipe, ingredients: [...recipe.ingredients, { qte: '', nom: '', grammes: 0, per100g: null }] })}
              className="btn-ghost text-xs self-start -ml-2"><Plus size={13} />Ajouter un ingrédient</button>
          </div>
        </div>

        {/* Étapes éditables */}
        <div className="card">
          <h2 className="text-sm font-bold text-zinc-900 mb-3">👨‍🍳 Préparation</h2>
          <div className="flex flex-col gap-3">
            {recipe.etapes.map((et, i) => (
              <div key={i} className="flex gap-2">
                <span className="w-7 h-7 rounded-xl bg-nutri text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-1">{i + 1}</span>
                <div className="flex-1 flex flex-col gap-1">
                  <input value={et.titre} onChange={e => updStep(i, { titre: e.target.value })} className="text-sm font-bold text-zinc-900 bg-transparent outline-none border-b border-zinc-100 focus:border-nutri" />
                  <textarea value={et.detail} onChange={e => updStep(i, { detail: e.target.value })} rows={2} className="text-sm text-zinc-600 bg-transparent outline-none resize-none leading-relaxed" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving || !recipe.titre.trim() || recipe.ingredients.length === 0} className="btn-nutri justify-center py-3 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Bookmark size={16} />}
          Enregistrer dans mes recettes
        </button>
        <p className="text-[10px] text-zinc-400 text-center px-4">
          Les étapes sont reformulées par Waty et la publication d'origine reste créditée. Tu es responsable du contenu que tu importes.
        </p>
      </div>
    )
  }

  // ═══════════════ Vue saisie ═══════════════
  return (
    <div className="page">
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-nutri shadow-lg">{toast}</div>}

      <button onClick={() => router.push('/nutrition/recipes')} className="btn-ghost self-start -ml-1"><ChevronLeft size={16} />Recettes</button>

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Importer une recette</h1>
        <p className="text-sm text-zinc-400">Colle un lien Instagram ou TikTok, une capture d'écran ou une photo : Waty en fait une fiche avec son guide nutritionnel.</p>
      </div>

      {/* Lien */}
      <div className="card flex flex-col gap-3">
        <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5"><Link2 size={14} className="text-nutri-dark" />Lien de la recette</label>
        <div className="relative">
          <input value={url} onChange={e => setUrl(e.target.value)} inputMode="url" placeholder="https://www.instagram.com/reel/… ou tiktok.com/…"
            className="input pr-9 text-sm" />
          {url && <button onClick={() => setUrl('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"><X size={14} /></button>}
        </div>
        <button onClick={pasteFromClipboard} className="btn-ghost text-xs self-start -ml-2"><ClipboardPaste size={14} />Coller depuis le presse-papier</button>
        <p className="text-[10px] text-zinc-400 leading-snug">
          On lit la légende publique du post. Si la recette n'est que dans la vidéo, ajoute une capture d'écran du texte affiché.
        </p>
      </div>

      {/* Capture / photo */}
      <div className={`card flex flex-col gap-3 ${needsMore ? 'border-nutri ring-2 ring-nutri/20' : ''}`}>
        <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5"><Camera size={14} className="text-nutri-dark" />Capture d'écran ou photo de la recette</label>
        {preview ? (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={preview} alt="" className="w-full max-h-64 object-contain bg-zinc-50" />
            <button onClick={() => pickImage(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center"><X size={14} /></button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click() } }}
              className="flex flex-col items-center gap-1 py-4 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-500 hover:border-nutri/50 text-xs font-medium">
              <ImageIcon size={20} />Galerie / capture
            </button>
            <button onClick={() => { if (fileRef.current) { fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click() } }}
              className="flex flex-col items-center gap-1 py-4 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-500 hover:border-nutri/50 text-xs font-medium">
              <Camera size={20} />Photo d'un livre / fiche
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickImage(e.target.files?.[0] ?? null)} />
      </div>

      {/* Texte */}
      <div className="card flex flex-col gap-2">
        <button onClick={() => setShowText(v => !v)} className="text-xs font-bold text-zinc-700 flex items-center gap-1.5 text-left">
          <FileText size={14} className="text-nutri-dark" />Coller le texte de la recette {showText ? '' : '(facultatif)'}
        </button>
        {showText && (
          <textarea value={text} onChange={e => setText(e.target.value)} rows={6} className="input text-sm"
            placeholder={"Ingrédients :\n- 200 g de …\n\nPréparation :\n1. …"} />
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-snug">{error}</div>
      )}

      <button onClick={analyze} disabled={loading || (!url && !text.trim() && !image)} className="btn-nutri justify-center py-3 disabled:opacity-50">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? 'Waty analyse la recette…' : `Analyser ${kindHint ? `la recette ${kindHint}` : 'la recette'}`}
      </button>

      {!url && !image && !text && (
        <Waty mode="nutrition" size="sm" dismissible={false}
          message="Tu as vu une recette qui te fait envie sur Instagram ou TikTok ? Partage-la moi, je te dis ce qu'elle vaut pour ta journée 🍳" />
      )}
    </div>
  )
}
