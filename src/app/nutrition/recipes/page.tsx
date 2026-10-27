'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PremiumGate } from '@/components/ui/PremiumGate'
import { Waty, WATY_MESSAGES } from '@/components/ui/Waty'
import { useRouter } from 'next/navigation'
import { RecipeNutritionGuide } from '@/components/ui/RecipeNutritionGuide'
import { MytaIllustration } from '@/components/ui/MytaIllustration'
import { SourceChips } from './SourceChips'
import { fromSavedRow, toSavedRow, SOURCE_LABELS, shareRecipePdf, recipeShareToken, type Recipe, type Ingredient, type Etape } from '@/lib/recipes'
import {
  ChevronLeft, Clock, Users, Flame,
  Loader2, ChefHat, Star,
  Bookmark, BookmarkCheck, Share2, Check, Search, X,
  Link2, ExternalLink, FileDown, Sparkles,
} from 'lucide-react'

const CATEGORIES = [
  { key: 'anti-inflammatoire', label: 'Anti-inflammatoire', desc: 'Oméga-3, antioxydants' },
  { key: 'sans-gluten',        label: 'Sans gluten',        desc: 'Riz, quinoa, sarrasin' },
  { key: 'faible-calories',    label: 'Faible calories',    desc: 'Moins de 400 kcal' },
  { key: 'rapide',             label: 'Rapide',             desc: 'Prêt en 20 min' },
  { key: 'cheat-meal',         label: 'Cheat meal',         desc: 'Burger, pizza, desserts' },
  { key: 'proteinee',          label: 'Protéinée',          desc: '+30g de protéines' },
  { key: 'vegetarien',         label: 'Végétarien',         desc: 'Sans viande ni poisson' },
  { key: 'monde',              label: 'Cuisine du monde',   desc: 'Maroc, Asie, Mexique...' },
]

const DIFF_COLOR: Record<string, string> = {
  'Facile': 'bg-nutri-light text-nutri-dark',
  'Moyen':  'bg-amber-100 text-amber-700',
  'Avancé': 'bg-red-100 text-red-700',
}

/** Photo libre de droits correspondant au plat (Pexels, via le serveur : la clé ne sort jamais). */
async function fetchPexelsPhoto(keyword: string): Promise<string | null> {
  try {
    const { data: { session } } = await createClient().auth.getSession()
    const res = await fetch(`/api/photos?keyword=${encodeURIComponent(keyword || 'dish')}`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    const j = await res.json()
    return j?.url ?? null
  } catch { return null }
}

const SOURCE_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Toutes' }, { key: 'import', label: 'Importées' }, { key: 'ia', label: 'Créées par Waty' },
]

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
        {recipe.photoUrl
          ? <img src={recipe.photoUrl} alt={recipe.titre} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-nutri-light to-zinc-100 flex items-center justify-center text-5xl"></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-2 right-2 flex gap-1">
          <button onClick={isSaved ? onUnsave : onSave}
            className={`w-7 h-7 rounded-full flex items-center justify-center shadow transition-all ${isSaved ? 'bg-nutri text-white' : 'bg-white/90 text-zinc-600 hover:bg-nutri hover:text-white'}`}>
            {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
          <button onClick={onShare}
            className="w-7 h-7 rounded-full bg-white/90 text-zinc-600 hover:bg-tta-mid hover:text-white flex items-center justify-center shadow transition-all">
            <Share2 size={13} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFF_COLOR[recipe.difficulte] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {recipe.difficulte}
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-bold text-zinc-900 line-clamp-2 leading-tight">{recipe.titre}</p>
        <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{recipe.description}</p>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
          <span className="flex items-center gap-0.5"><Clock size={10} />{recipe.temps}min</span>
          <span className="flex items-center gap-0.5"><Flame size={10} />{recipe.calories} kcal</span>
          <span className="flex items-center gap-0.5"><Users size={10} />{recipe.portions}p</span>
        </div>
      </div>
    </button>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────────
type View = 'categories' | 'generated' | 'saved'

export default function RecipesPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [view, setView]                   = useState<View>('categories')
  const [recipes, setRecipes]             = useState<Recipe[]>([])
  const [savedRecipes, setSavedRecipes]   = useState<Recipe[]>([])
  const [savedIds, setSavedIds]           = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading]             = useState(false)
  const [loadingSaved, setLoadingSaved]   = useState(false)
  const [detail, setDetail]               = useState<Recipe | null>(null)
  const [toast, setToast]                 = useState('')
  const [copied, setCopied]               = useState(false)

  // ── Recherche par mots-clés ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchCategory, setSearchCategory] = useState<string>('')
  // ── Catalogue personnel : filtres locaux ───────────────────────────────────
  const [catQuery, setCatQuery]           = useState('')
  const [catSource, setCatSource]         = useState('')
  const [pdfBusy, setPdfBusy]             = useState(false)

  useEffect(() => {
    loadSavedIds()
    // Recette reçue d'un ami avant la création du compte : on l'ajoute au catalogue à la première visite
    ;(async () => {
      let token = ''
      try { token = localStorage.getItem('myta_pending_recipe') ?? '' } catch { /* ignoré */ }
      if (!token) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: shared } = await supabase.rpc('get_shared_recipe', { p_token: token })
      if (shared) {
        const row: any = { ...(shared as any), user_id: user.id, recipe_id: `copy-${token}` }
        delete row.share_token; delete row.created_at
        const { error } = await supabase.from('saved_recipes').upsert(row, { onConflict: 'user_id,recipe_id' })
        if (!error) { showToast('La recette de ton ami est dans ton catalogue'); setView('saved'); loadSavedRecipes(); loadSavedIds() }
      }
      try { localStorage.removeItem('myta_pending_recipe') } catch { /* ignoré */ }
    })()
    // Retour depuis /nutrition/recipes/import → ouvrir directement « Mes recettes »
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'saved') {
      setView('saved'); loadSavedRecipes()
    }
  }, [])

  async function loadSavedIds() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('saved_recipes').select('recipe_id').eq('user_id', user.id)
    setSavedIds(new Set((data ?? []).map((r: any) => r.recipe_id)))
  }

  async function loadSavedRecipes() {
    setLoadingSaved(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingSaved(false); return }
    const { data } = await supabase.from('saved_recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setSavedRecipes((data ?? []).map(fromSavedRow))
    setLoadingSaved(false)
  }

  // ── Générer par catégorie ───────────────────────────────────────────────────
  async function loadCategory(key: string) {
    setActiveCategory(key)
    setSearchQuery('')
    setView('generated')
    setLoading(true)
    setRecipes([])
    try {
      const res = await fetch(`/api/generate-recipes?category=${key}`)
      const data = await res.json()
      const generated: Recipe[] = (data.recipes ?? []).map((r: Recipe) => ({ ...r, category: key }))
      setRecipes(generated)
      setLoading(false)
      const withPhotos = await Promise.all(
        generated.map(async r => ({ ...r, photoUrl: (await fetchPexelsPhoto(r.photo_keyword)) ?? undefined }))
      )
      setRecipes(withPhotos)
    } catch { setLoading(false) }
  }

  // ── Générer par mots-clés + catégorie ──────────────────────────────────────
  async function searchRecipes() {
    if (!searchQuery.trim() && !searchCategory) return
    setView('generated')
    setActiveCategory(searchCategory || null)
    setLoading(true)
    setRecipes([])
    try {
      const params = new URLSearchParams()
      if (searchCategory) params.set('category', searchCategory)
      if (searchQuery.trim()) params.set('keywords', searchQuery.trim())
      const res = await fetch(`/api/generate-recipes?${params.toString()}`)
      const data = await res.json()
      const generated: Recipe[] = (data.recipes ?? []).map((r: Recipe) => ({
        ...r, category: searchCategory || 'custom'
      }))
      setRecipes(generated)
      setLoading(false)
      const withPhotos = await Promise.all(
        generated.map(async r => ({ ...r, photoUrl: (await fetchPexelsPhoto(r.photo_keyword)) ?? undefined }))
      )
      setRecipes(withPhotos)
    } catch { setLoading(false) }
  }

  async function saveRecipe(recipe: Recipe, e: React.MouseEvent) {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('saved_recipes')
      .upsert(toSavedRow(user.id, recipe), { onConflict: 'user_id,recipe_id' })
    if (!error) { setSavedIds(prev => new Set([...prev, recipe.id])); showToast('Recette sauvegardée') }
  }

  async function unsaveRecipe(recipe: Recipe, e: React.MouseEvent) {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipe.id)
    setSavedIds(prev => { const n = new Set(prev); n.delete(recipe.id); return n })
    setSavedRecipes(prev => prev.filter(r => r.id !== recipe.id))
    showToast('Recette supprimée')
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function shareRecipe(recipe: Recipe, e: React.MouseEvent) {
    e.stopPropagation()
    if (!savedIds.has(recipe.id)) await saveRecipe(recipe, e)
    const token = await recipeShareToken(supabase, recipe)
    const url = token ? `${window.location.origin}/nutrition/recipes/share?t=${token}` : `${window.location.origin}/nutrition/recipes/share?id=${recipe.id}`
    if (navigator.share) {
      try { await navigator.share({ title: recipe.titre, text: recipe.description, url }) } catch { }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true); showToast('Lien copié !'); setTimeout(() => setCopied(false), 2000)
    }
  }

  /** « Partager en PDF » : fiche imprimable, feuille de partage native quand c'est possible. */
  async function exportPdf(recipe: Recipe) {
    setPdfBusy(true)
    try {
      const r = await shareRecipePdf(supabase, recipe)
      if (!r.ok) showToast(r.error ?? 'PDF indisponible')
      else setSavedIds(prev => new Set([...prev, recipe.id]))
    } finally { setPdfBusy(false) }
  }

  const catalogue = savedRecipes.filter(r => {
    if (catSource === 'import' && (!r.source_kind || r.source_kind === 'ia')) return false
    if (catSource === 'ia' && r.source_kind && r.source_kind !== 'ia') return false
    if (!catQuery.trim()) return true
    const q = catQuery.toLowerCase()
    const ings = (r.ingredients ?? []).map((i: any) => typeof i === 'string' ? i : i?.nom ?? '').join(' ').toLowerCase()
    return r.titre.toLowerCase().includes(q) || ings.includes(q) || (r.source_author ?? '').toLowerCase().includes(q)
  })
  const displayed = view === 'saved' ? catalogue : recipes

  // ── Vue détail ─────────────────────────────────────────────────────────────
  if (detail) return (
    <div className="page">
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-nutri shadow-lg">{toast}</div>}

      <button onClick={() => setDetail(null)} className="btn-ghost self-start -ml-1">
        <ChevronLeft size={16} />Retour
      </button>

      <div className="relative rounded-2xl overflow-hidden h-56">
        {detail.photoUrl
          ? <img src={detail.photoUrl} alt={detail.titre} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-nutri-light to-zinc-100 flex items-center justify-center text-7xl"></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-12">
          <h1 className="text-white font-black text-xl leading-tight">{detail.titre}</h1>
          <p className="text-white/80 text-sm mt-1">{detail.description}</p>
        </div>
        <div className="absolute top-3 right-3 flex gap-2">
          <button onClick={e => shareRecipe(detail, e)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg bg-white/90 text-zinc-700 hover:bg-tta-mid hover:text-white transition-colors">
            {copied ? <Check size={13} /> : <Share2 size={13} />}{copied ? 'Copié !' : 'Partager'}
          </button>
          <button onClick={savedIds.has(detail.id) ? e => unsaveRecipe(detail, e) : e => saveRecipe(detail, e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-colors ${savedIds.has(detail.id) ? 'bg-nutri text-white' : 'bg-white/90 text-zinc-700 hover:bg-nutri hover:text-white'}`}>
            {savedIds.has(detail.id) ? <><BookmarkCheck size={13} />Sauvegardée</> : <><Bookmark size={13} />Sauvegarder</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: <Clock size={14} />, val: detail.temps_prep ? `${detail.temps_prep}min prép` : `${detail.temps} min`, lbl: 'Préparation' },
          { icon: <Users size={14} />, val: `${detail.portions}`, lbl: 'Portions' },
          { icon: <Flame size={14} />, val: `${detail.calories} kcal`, lbl: 'Par portion' },
          { icon: <Star size={14} />,  val: detail.difficulte, lbl: 'Niveau' },
        ].map(({ icon, val, lbl }) => (
          <div key={lbl} className="kpi-card items-center text-center p-2">
            <div className="text-nutri-dark">{icon}</div>
            <p className="text-xs font-bold text-zinc-900 mt-0.5">{val}</p>
            <p className="text-[10px] text-zinc-400">{lbl}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={() => exportPdf(detail)} disabled={pdfBusy} className="btn-ghost flex-1 justify-center bg-raised disabled:opacity-50">
          {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}{pdfBusy ? 'Préparation du PDF…' : 'Partager en PDF'}
        </button>
        <button onClick={e => shareRecipe(detail, e)} className="btn-ghost flex-1 justify-center bg-raised"><Share2 size={14} />Envoyer à un ami</button>
      </div>

      {detail.completions && detail.completions.length > 0 && (
        <div className="card-sm border border-amber-100 bg-amber-50/60">
          <p className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1"><Sparkles size={11} />Complété par Waty</p>
          <ul className="flex flex-col gap-1 mt-1">
            {detail.completions.map((c, i) => <li key={i} className="text-xs text-amber-900 flex gap-2"><span className="text-amber-400">–</span><span>{c}</span></li>)}
          </ul>
        </div>
      )}

      {/* Crédit source (recette importée) */}
      {detail.source_kind && detail.source_kind !== 'ia' && (
        <div className="card-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 flex-shrink-0"><Link2 size={16} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Source · {SOURCE_LABELS[detail.source_kind] ?? detail.source_kind}</p>
            {detail.source_author && <p className="text-sm font-semibold text-zinc-900 truncate">{detail.source_author}</p>}
            {detail.source_url && (
              <a href={detail.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-tta-mid flex items-center gap-1">
                <ExternalLink size={11} />Voir la publication d'origine
              </a>
            )}
          </div>
        </div>
      )}

      {/* Guide nutritionnel : Score MYTA + macros + impact sur la journée + ajout au journal */}
      <RecipeNutritionGuide recipe={detail} score={detail.score ?? null} onToast={showToast} />

      {detail.ustensiles && detail.ustensiles.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-zinc-900 mb-2">Ustensiles</h2>
          <div className="flex flex-wrap gap-1.5">
            {detail.ustensiles.map((u, i) => <span key={i} className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">{u}</span>)}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-bold text-zinc-900 mb-3">Ingrédients</h2>
        <div className="flex flex-col gap-2">
          {detail.ingredients.map((ing, i) => {
            const isObj = typeof ing === 'object' && ing !== null
            return (
              <div key={i} className="flex items-start gap-3 py-1.5 border-b border-zinc-50 last:border-0">
                <span className="w-6 h-6 bg-nutri-light rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-nutri-dark">{i + 1}</span>
                <div className="flex-1">
                  {isObj ? (
                    <>
                      <span className="text-sm font-semibold text-zinc-900">{(ing as Ingredient).qte} </span>
                      <span className="text-sm text-zinc-700">{(ing as Ingredient).nom}</span>
                      {(ing as Ingredient).note && <span className="text-xs text-zinc-400 ml-1">({(ing as Ingredient).note})</span>}
                    </>
                  ) : <span className="text-sm text-zinc-700">{String(ing)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-bold text-zinc-900 mb-3">Préparation</h2>
        <div className="flex flex-col gap-4">
          {detail.etapes.map((etape, i) => {
            const isObj = typeof etape === 'object' && etape !== null
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span className="w-8 h-8 rounded-2xl bg-nutri text-white text-xs font-extrabold flex items-center justify-center">
                    {isObj ? (etape as Etape).num : i + 1}
                  </span>
                  {i < detail.etapes.length - 1 && <div className="w-px flex-1 bg-zinc-100 min-h-[16px]" />}
                </div>
                <div className="flex-1 pb-2">
                  {isObj ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-zinc-900">{(etape as Etape).titre}</p>
                        {(etape as Etape).duree && <span className="text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full flex-shrink-0">{(etape as Etape).duree}</span>}
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed">{(etape as Etape).detail}</p>
                      {(etape as Etape).astuce && (
                        <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
 <span className="font-semibold">Astuce :</span> {(etape as Etape).astuce}
                        </div>
                      )}
                    </>
                  ) : <p className="text-sm text-zinc-600 leading-relaxed">{String(etape)}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {detail.conseils_chef && (
        <div className="card bg-nutri-light border-nutri/20">
          <p className="text-xs font-extrabold text-nutri-dark mb-1">Conseil du chef</p>
          <p className="text-sm text-nutri-dark leading-relaxed">{detail.conseils_chef}</p>
        </div>
      )}

      {detail.accompagnements && detail.accompagnements.length > 0 && (
        <div className="card">
          <p className="text-xs font-extrabold text-zinc-500 mb-2">Accompagnements</p>
          <div className="flex flex-wrap gap-1.5">
            {detail.accompagnements.map((a, i) => <span key={i} className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">{a}</span>)}
          </div>
        </div>
      )}
    </div>
  )

  // ── Vue liste ──────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-nutri shadow-lg">{toast}</div>}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Recettes</h1>
        <p className="text-sm text-zinc-400">Importe, crée, garde : ton catalogue à toi</p>
      </div>

      {/* ── 1. Importer depuis Instagram / TikTok : le geste principal, mis en avant ── */}
      {view !== 'saved' && (
        <button onClick={() => router.push('/nutrition/recipes/import')}
          className="relative overflow-hidden rounded-3xl text-left p-4 pb-5 shadow-md active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(135deg, #4B47A0 0%, #6A66C7 55%, #22C55E 140%)' }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-14 -left-6 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0"><MytaIllustration name="recette" size={44} /></div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide text-white/80 bg-white/15 rounded-full px-2 py-0.5">Nouveau</span>
              <p className="text-white font-extrabold text-lg leading-tight mt-1">Une recette vue sur Instagram ou TikTok ?</p>
              <p className="text-white/85 text-[13px] leading-snug mt-1">Colle le lien, Waty en fait une fiche complète avec sa photo, ses étapes et son Score MYTA.</p>
            </div>
          </div>
          <div className="relative mt-3 flex items-center justify-between gap-3">
            <SourceChips light />
            <span className="inline-flex items-center gap-1.5 bg-white text-tta-mid text-sm font-extrabold px-4 py-2.5 rounded-full shadow-sm flex-shrink-0"><Link2 size={15} />Coller un lien</span>
          </div>
        </button>
      )}

      {/* Mon catalogue : accès plein format, sous le geste principal */}
      {view !== 'saved' && (
        <button onClick={() => { setView('saved'); setDetail(null); loadSavedRecipes() }}
          className="card flex items-center gap-3 text-left py-3 hover:border-nutri/40 transition-colors">
          <MytaIllustration name="livre" size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-900">Mon catalogue</p>
            <p className="text-[11px] text-zinc-400">{savedIds.size > 0 ? `${savedIds.size} recette${savedIds.size > 1 ? 's' : ''} · étapes, photos, PDF, partage` : 'Tes recettes enregistrées, étape par étape'}</p>
          </div>
          <span className="text-xs font-extrabold text-nutri-dark bg-nutri-light rounded-full px-2.5 py-1 flex-shrink-0">{savedIds.size > 0 ? savedIds.size : 'Ouvrir'}</span>
        </button>
      )}

      {view !== 'saved' && (
        <Waty mode="nutrition" size="sm" dismissible
          message="Tu as vu une recette qui te fait envie ? Copie son lien, colle-le ici : je te dis ce qu'elle vaut et je la range dans ton catalogue." />
      )}

      {/* ── 2. Créer une recette avec Waty (génération IA) ── */}
      {view !== 'saved' && (
        <div className="flex items-center gap-3 pt-1">
          <div className="h-px flex-1 bg-zinc-200" />
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-400">Ou demande une recette à Waty</p>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
      )}

      {view !== 'saved' && <PremiumGate label="Recettes IA — fonctionnalité Premium"><div className="flex flex-col gap-4">

      {/* ── Barre de recherche permanente ── */}
      {(
        <div className="card flex flex-col gap-3">
          {/* Barre search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (searchQuery.trim() || searchCategory) && searchRecipes()}
              placeholder="Ingrédients : saumon, patate douce, citron..."
              className="input pl-10 pr-8"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Catégories en pills */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button key={cat.key}
                onClick={() => setSearchCategory(prev => prev === cat.key ? '' : cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${searchCategory === cat.key ? 'bg-nutri text-white border-nutri' : 'border-zinc-200 text-zinc-600 hover:border-nutri/40'}`}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Bouton générer — visible si sélection active */}
          {(searchQuery.trim() || searchCategory) && (
            <button onClick={searchRecipes} className="btn-nutri justify-center py-2.5">
              <Search size={15} />
              Générer 4 recettes{searchQuery ? ` · "${searchQuery.trim()}"` : ''}{searchCategory ? ` · ${CATEGORIES.find(c=>c.key===searchCategory)?.label}` : ''}
            </button>
          )}
        </div>
      )}

      {/* Waty rappel sauvegarde */}
      {view === 'generated' && recipes.length > 0 && !loading && (
        <Waty
          mode="nutrition"
          message="N'oublie pas de sauvegarder les recettes qui te plaisent — elles seront perdues si tu changes de catégorie !"
          size="sm"
          dismissible={true}
        />
      )}

      {/* Catégories rapides si rien de sélectionné */}
      {!searchQuery && !searchCategory && (
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => loadCategory(cat.key)}
              className={`card text-left p-3 transition-all hover:shadow-sm hover:border-nutri/40 ${activeCategory === cat.key && view === 'generated' ? 'border-nutri bg-nutri-light/50' : ''}`}>
              <p className="text-sm font-semibold text-zinc-900">{cat.label}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{cat.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* État initial */}
      {view === 'categories' && !searchQuery && !searchCategory && (
        <div className="card text-center py-12 text-zinc-400">
          <ChefHat size={40} className="mx-auto mb-3 text-zinc-300" />
          <p className="text-sm font-medium">Choisis une envie ci-dessus</p>
          <p className="text-xs mt-1">Waty te propose 4 recettes adaptées à ton profil</p>
        </div>
      )}

      {/* Chargement génération */}
      {loading && (
        <div className="card text-center py-14">
          <Loader2 size={32} className="animate-spin text-nutri mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">Génération des recettes…</p>
          <p className="text-xs text-zinc-400 mt-1">Waty prépare 4 recettes pour toi</p>
        </div>
      )}

      </div></PremiumGate>}

      {/* ── Mon catalogue ── */}
      {view === 'saved' && (
        <>
          <button onClick={() => setView('categories')} className="btn-ghost self-start -ml-1">
            <ChevronLeft size={16} />Parcourir les catégories
          </button>
          <div className="card flex flex-col gap-2.5">
            <div>
              <p className="text-sm font-bold text-zinc-900">Mon catalogue</p>
              <p className="text-[11px] text-zinc-400">Tes recettes, étape par étape, avec photo, ingrédients et Score MYTA. Chaque fiche s'exporte en PDF ou s'envoie à un ami.</p>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input type="text" value={catQuery} onChange={e => setCatQuery(e.target.value)} placeholder="Chercher un plat, un ingrédient, un créateur…" className="input pl-10 pr-8" />
              {catQuery && <button onClick={() => setCatQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"><X size={14} /></button>}
            </div>
            <div className="flex gap-1.5">
              {SOURCE_FILTERS.map(f => (
                <button key={f.key} onClick={() => setCatSource(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${catSource === f.key ? 'bg-nutri text-white border-nutri' : 'border-zinc-200 text-zinc-600'}`}>{f.label}</button>
              ))}
              <button onClick={() => router.push('/nutrition/recipes/import')} className="ml-auto px-3 py-1.5 rounded-full text-xs font-bold bg-nutri-light text-nutri-dark"><Link2 size={12} className="inline mr-1 -mt-0.5" />Importer</button>
            </div>
          </div>
        </>
      )}

      {view === 'saved' && loadingSaved && (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-zinc-400" />
        </div>
      )}

      {/* Grille recettes */}
      {!loading && !loadingSaved && displayed.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {view === 'saved'
                ? `${displayed.length} recette${displayed.length > 1 ? 's' : ''} dans ton catalogue${catQuery || catSource ? ' (filtré)' : ''}`
                : `${displayed.length} recettes${searchQuery ? ` · "${searchQuery}"` : ''}`
              }
            </p>
            {view === 'generated' && (
              <button
                onClick={() => searchQuery ? searchRecipes() : activeCategory ? loadCategory(activeCategory) : null}
                className="btn-ghost text-xs gap-1.5">
 Régénérer
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {displayed.map(r => (
              <RecipeCard
                key={r.id} recipe={r}
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

      {view === 'saved' && !loadingSaved && displayed.length === 0 && (
        <div className="card text-center py-12 text-zinc-400">
          <BookmarkCheck size={36} className="mx-auto mb-3 text-zinc-300" />
          {savedRecipes.length > 0
            ? <p className="text-sm">Aucune recette ne correspond à ce filtre.</p>
            : <Waty mode="nutrition" message={WATY_MESSAGES.recipes_encourage} size="md" dismissible={false} />}
        </div>
      )}
    </div>
  )
}
