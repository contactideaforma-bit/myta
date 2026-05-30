'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Waty, WATY_MESSAGES } from '@/components/ui/Waty'
import {
  ChevronLeft, Clock, Users, Flame,
  Loader2, ChefHat, Star,
  Bookmark, BookmarkCheck, Share2, Copy, Check,
} from 'lucide-react'

interface Recipe {
  id: string
  titre: string
  description: string
  temps: number
  portions: number
  calories: number
  difficulte: 'Facile' | 'Moyen' | 'Avancé'
  ingredients: string[]
  etapes: string[]
  photo_keyword: string
  photoUrl?: string
  category?: string
}

const CATEGORIES = [
  { key: 'anti-inflammatoire', label: '🌿 Anti-inflammatoire', desc: 'Oméga-3, antioxydants' },
  { key: 'sans-gluten',        label: '🌾 Sans gluten',        desc: 'Riz, quinoa, sarrasin' },
  { key: 'faible-calories',    label: '🔥 Faible calories',    desc: 'Moins de 400 kcal' },
  { key: 'rapide',             label: '⚡ Rapide',             desc: 'Prêt en 20 min' },
  { key: 'cheat-meal',         label: '😈 Cheat meal',         desc: 'Burger, pizza, desserts' },
  { key: 'proteinee',          label: '💪 Protéinée',          desc: '+30g de protéines' },
  { key: 'vegetarien',         label: '🥗 Végétarien',         desc: 'Sans viande ni poisson' },
  { key: 'monde',              label: '🌍 Cuisine du monde',   desc: 'Maroc, Asie, Mexique...' },
]

const DIFF_COLOR: Record<string, string> = {
  'Facile': 'bg-nutri-light text-nutri-dark',
  'Moyen':  'bg-amber-100 text-amber-700',
  'Avancé': 'bg-red-100 text-red-700',
}

async function fetchPexelsPhoto(keyword: string): Promise<string | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY
    if (!apiKey) return null
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword + ' food')}&per_page=1&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    )
    const data = await res.json()
    return data.photos?.[0]?.src?.medium ?? null
  } catch { return null }
}

// ─── Carte recette ─────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onOpen, onSave, onUnsave, onShare, isSaved }: {
  recipe: Recipe
  onOpen: () => void
  onSave: (e: React.MouseEvent) => void
  onUnsave: (e: React.MouseEvent) => void
  onShare: (e: React.MouseEvent) => void
  isSaved: boolean
}) {
  return (
    <button onClick={onOpen}
      className="card p-0 overflow-hidden text-left group hover:shadow-md hover:border-nutri/30 transition-all">
      <div className="relative h-40 bg-zinc-100">
        {recipe.photoUrl ? (
          <img src={recipe.photoUrl} alt={recipe.titre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-nutri-light to-zinc-100">
            🍽️
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-zinc-700 flex items-center gap-1">
            <Clock size={9} />{recipe.temps}min
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-orange-600 flex items-center gap-1">
            <Flame size={9} />{recipe.calories} kcal
          </span>
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={onShare}
            className="w-7 h-7 rounded-full flex items-center justify-center shadow bg-white/90 text-zinc-400 hover:text-tta-mid transition-colors">
            <Share2 size={12} />
          </button>
          <button
            onClick={isSaved ? onUnsave : onSave}
            className={`w-7 h-7 rounded-full flex items-center justify-center shadow transition-colors ${
              isSaved ? 'bg-nutri text-white' : 'bg-white/90 text-zinc-400 hover:text-nutri'
            }`}>
            {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-sm text-zinc-900 leading-tight line-clamp-1">{recipe.titre}</h3>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${DIFF_COLOR[recipe.difficulte] ?? 'bg-zinc-100 text-zinc-500'}`}>
            {recipe.difficulte}
          </span>
        </div>
        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{recipe.description}</p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-400">
          <span className="flex items-center gap-0.5"><Users size={9} />{recipe.portions} portions</span>
        </div>
      </div>
    </button>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────
type View = 'categories' | 'generated' | 'saved'

export default function RecipesPage() {
  const supabase = createClient()

  const [view, setView]                   = useState<View>('categories')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [recipes, setRecipes]             = useState<Recipe[]>([])
  const [savedRecipes, setSavedRecipes]   = useState<Recipe[]>([])
  const [savedIds, setSavedIds]           = useState<Set<string>>(new Set())
  const [loading, setLoading]             = useState(false)
  const [loadingSaved, setLoadingSaved]   = useState(false)
  const [detail, setDetail]               = useState<Recipe | null>(null)
  const [toast, setToast]                 = useState('')
  const [copied, setCopied]               = useState(false)

  useEffect(() => { loadSavedIds() }, [])

  // Charge juste les IDs sauvegardés (léger)
  async function loadSavedIds() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('saved_recipes')
      .select('recipe_id')
      .eq('user_id', user.id)
    setSavedIds(new Set((data ?? []).map((r: any) => r.recipe_id)))
  }

  // Charge toutes les recettes sauvegardées (complet)
  async function loadSavedRecipes() {
    setLoadingSaved(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingSaved(false); return }
    const { data } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setSavedRecipes((data ?? []).map((r: any) => ({
      id: r.recipe_id,
      titre: r.titre,
      description: r.description,
      temps: r.temps,
      portions: r.portions,
      calories: r.calories,
      difficulte: r.difficulte,
      ingredients: r.ingredients,
      etapes: r.etapes,
      photo_keyword: '',
      photoUrl: r.photo_url ?? undefined,
      category: r.category,
    })))
    setLoadingSaved(false)
  }

  async function loadCategory(key: string) {
    setActiveCategory(key)
    setView('generated')
    setLoading(true)
    setRecipes([])
    try {
      const res = await fetch(`/api/generate-recipes?category=${key}`)
      const data = await res.json()
      const generated: Recipe[] = (data.recipes ?? []).map((r: Recipe) => ({
        ...r, category: key
      }))
      setRecipes(generated)
      setLoading(false)
      // Photos en arrière-plan
      const withPhotos = await Promise.all(
        generated.map(async r => ({
          ...r,
          photoUrl: (await fetchPexelsPhoto(r.photo_keyword)) ?? undefined,
        }))
      )
      setRecipes(withPhotos)
    } catch { setLoading(false) }
  }

  async function saveRecipe(recipe: Recipe, e: React.MouseEvent) {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('saved_recipes').upsert({
      user_id:     user.id,
      recipe_id:   recipe.id,
      titre:       recipe.titre,
      description: recipe.description,
      temps:       recipe.temps,
      portions:    recipe.portions,
      calories:    recipe.calories,
      difficulte:  recipe.difficulte,
      ingredients: recipe.ingredients,
      etapes:      recipe.etapes,
      photo_url:   recipe.photoUrl ?? null,
      category:    recipe.category ?? null,
    }, { onConflict: 'user_id,recipe_id' })
    if (!error) {
      setSavedIds(prev => new Set([...prev, recipe.id]))
      showToast('✓ Recette sauvegardée')
    }
  }

  async function unsaveRecipe(recipe: Recipe, e: React.MouseEvent) {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_recipes')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipe.id)
    setSavedIds(prev => { const n = new Set(prev); n.delete(recipe.id); return n })
    setSavedRecipes(prev => prev.filter(r => r.id !== recipe.id))
    showToast('Recette supprimée')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function shareRecipe(recipe: Recipe, e: React.MouseEvent) {
    e.stopPropagation()
    // Sauvegarde d'abord si pas encore fait (nécessaire pour la page publique)
    if (!savedIds.has(recipe.id)) {
      await saveRecipe(recipe, e)
    }
    const url = `${window.location.origin}/nutrition/recipes/share?id=${recipe.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.titre, text: recipe.description, url })
      } catch { /* annulé */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      showToast('🔗 Lien copié dans le presse-papier !')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function openSaved() {
    setView('saved')
    setDetail(null)
    loadSavedRecipes()
  }

  const displayed = view === 'saved' ? savedRecipes : recipes

  // ── Vue détail ──────────────────────────────────────────────────────────────
  if (detail) return (
    <div className="page">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-nutri shadow-lg">
          {toast}
        </div>
      )}

      <button onClick={() => setDetail(null)} className="btn-ghost self-start -ml-1">
        <ChevronLeft size={16} />Retour
      </button>

      <div className="relative rounded-2xl overflow-hidden h-56">
        {detail.photoUrl ? (
          <img src={detail.photoUrl} alt={detail.titre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-nutri-light to-zinc-100 flex items-center justify-center text-7xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-12">
          <h1 className="text-white font-black text-xl leading-tight">{detail.titre}</h1>
          <p className="text-white/80 text-sm mt-1">{detail.description}</p>
        </div>
        {/* Boutons sauvegarder + partager dans le détail */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={e => shareRecipe(detail, e)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg bg-white/90 text-zinc-700 hover:bg-tta-mid hover:text-white transition-colors">
            {copied ? <Check size={13} /> : <Share2 size={13} />}
            {copied ? 'Copié !' : 'Partager'}
          </button>
          <button
            onClick={savedIds.has(detail.id)
              ? e => unsaveRecipe(detail, e)
              : e => saveRecipe(detail, e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-colors ${
              savedIds.has(detail.id)
                ? 'bg-nutri text-white'
                : 'bg-white/90 text-zinc-700 hover:bg-nutri hover:text-white'
            }`}>
            {savedIds.has(detail.id)
              ? <><BookmarkCheck size={13} />Sauvegardée</>
              : <><Bookmark size={13} />Sauvegarder</>
            }
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: <Clock size={14} />, val: `${detail.temps} min`,     lbl: 'Temps' },
          { icon: <Users size={14} />, val: `${detail.portions}`,       lbl: 'Portions' },
          { icon: <Flame size={14} />, val: `${detail.calories} kcal`, lbl: 'Par portion' },
          { icon: <Star size={14} />,  val: detail.difficulte,          lbl: 'Niveau' },
        ].map(({ icon, val, lbl }) => (
          <div key={lbl} className="kpi-card items-center text-center p-2">
            <div className="text-nutri-dark">{icon}</div>
            <p className="text-xs font-bold text-zinc-900 mt-0.5">{val}</p>
            <p className="text-[10px] text-zinc-400">{lbl}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-sm font-bold text-zinc-900 mb-3">🛒 Ingrédients</h2>
        <div className="flex flex-col gap-1.5">
          {detail.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-nutri flex-shrink-0" />
              <span className="text-zinc-700">{ing}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-bold text-zinc-900 mb-3">👨‍🍳 Préparation</h2>
        <ol className="flex flex-col gap-3">
          {detail.etapes.map((etape, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-nutri text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-zinc-600 leading-relaxed flex-1">{etape}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )

  // ── Vue liste ───────────────────────────────────────────────────────────────
  return (
    <div className="page">

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-nutri shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Recettes</h1>
          <p className="text-sm text-zinc-400">Générées par IA · 100% en français</p>
        </div>
        <button onClick={openSaved}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
            view === 'saved' ? 'bg-nutri text-white border-nutri' : 'border-zinc-200 text-zinc-600 hover:border-nutri/40'
          }`}>
          <BookmarkCheck size={14} />
          Sauvegardées {savedIds.size > 0 && `(${savedIds.size})`}
        </button>
      </div>

      {/* Catégories */}
      {view !== 'saved' && (
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => loadCategory(cat.key)}
              className={`card text-left p-3 transition-all hover:shadow-sm hover:border-nutri/40 ${
                activeCategory === cat.key && view === 'generated' ? 'border-nutri bg-nutri-light/50' : ''
              }`}>
              <p className="text-sm font-semibold text-zinc-900">{cat.label}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{cat.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Retour catégories depuis sauvegardées */}
      {view === 'saved' && (
        <button onClick={() => setView('categories')} className="btn-ghost self-start -ml-1">
          <ChevronLeft size={16} />Parcourir les catégories
        </button>
      )}

      {/* État initial */}
      {view === 'categories' && (
        <div className="card text-center py-14 text-zinc-400">
          <ChefHat size={40} className="mx-auto mb-3 text-zinc-300" />
          <p className="text-sm font-medium">Choisis une catégorie</p>
          <p className="text-xs mt-1">Claude va générer 12 recettes personnalisées</p>
        </div>
      )}

      {/* Chargement */}
      {loading && (
        <div className="card text-center py-14">
          <Loader2 size={32} className="animate-spin text-nutri mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">Génération des recettes…</p>
          <p className="text-xs text-zinc-400 mt-1">Claude prépare 12 recettes pour toi</p>
        </div>
      )}

      {/* Chargement sauvegardées */}
      {view === 'saved' && loadingSaved && (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-zinc-400" />
        </div>
      )}

      {/* Grille */}
      {!loading && !loadingSaved && displayed.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {view === 'saved' ? `${displayed.length} recette${displayed.length > 1 ? 's' : ''} sauvegardée${displayed.length > 1 ? 's' : ''}` : `${displayed.length} recettes`}
            </p>
            {view === 'generated' && activeCategory && (
              <button onClick={() => loadCategory(activeCategory)} className="btn-ghost text-xs gap-1.5">
                🔄 Régénérer
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {displayed.map(r => (
              <RecipeCard
                key={r.id}
                recipe={r}
                onOpen={() => setDetail(r)}
                onSave={e => saveRecipe(r, e)}
                onUnsave={e => unsaveRecipe(r, e)}
                onShare={e => shareRecipe(r, e)}
                isSaved={savedIds.has(r.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Sauvegardées vides */}
      {view === 'saved' && !loadingSaved && displayed.length === 0 && (
        <div className="card text-center py-12 text-zinc-400">
          <BookmarkCheck size={36} className="mx-auto mb-3 text-zinc-300" />
        <Waty
          mode="nutrition"
          message={WATY_MESSAGES.recipes_encourage}
          size="md"
          dismissible={false}
        />
        </div>
      )}
    </div>
  )
}
