/**
 * Types + helpers partagés entre /nutrition/recipes, /nutrition/recipes/import et la page de partage.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { todayISO } from './utils'
import type { Per100g, ScoreMyta } from './score-myta'

export interface Ingredient {
  qte: string
  nom: string
  note?: string
  /** Renseignés par l'import IA — permettent de recalculer le Score MYTA localement */
  grammes?: number
  per100g?: Partial<Per100g> | null
}
export interface Etape { num: number; titre: string; detail: string; duree?: string; astuce?: string }

export type SourceKind = 'ia' | 'instagram' | 'tiktok' | 'web' | 'capture' | 'photo' | 'texte'

export interface Recipe {
  id: string
  titre: string
  description: string
  temps: number
  temps_prep?: number
  temps_cuisson?: number
  portions: number
  calories: number
  proteines?: number
  glucides?: number
  lipides?: number
  difficulte: 'Facile' | 'Moyen' | 'Avancé'
  ustensiles?: string[]
  ingredients: Ingredient[] | string[]
  etapes: Etape[] | string[]
  conseils_chef?: string
  accompagnements?: string[]
  photo_keyword: string
  photoUrl?: string
  /** Informations complétées par Waty quand la source était incomplète (visibles, corrigeables) */
  completions?: string[]
  /** Identifiant de partage public (saved_recipes.share_token) */
  share_token?: string | null
  category?: string
  // Provenance (import)
  source_kind?: SourceKind | null
  source_url?: string | null
  source_author?: string | null
  // Score MYTA (stocké)
  score?: ScoreMyta | null
}

export const SOURCE_LABELS: Record<SourceKind, string> = {
  ia: 'Générée par Waty',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  web: 'Site web',
  capture: "Capture d'écran",
  photo: 'Photo',
  texte: 'Texte collé',
}

/** Ligne saved_recipes → Recipe */
export function fromSavedRow(r: any): Recipe {
  return {
    id: r.recipe_id, titre: r.titre, description: r.description ?? '',
    temps: r.temps ?? 0, temps_prep: r.temps_prep ?? undefined, temps_cuisson: r.temps_cuisson ?? undefined,
    portions: r.portions ?? 1, calories: r.calories ?? 0,
    proteines: r.proteines ?? undefined, glucides: r.glucides ?? undefined, lipides: r.lipides ?? undefined,
    difficulte: r.difficulte ?? 'Facile',
    ustensiles: Array.isArray(r.ustensiles) ? r.ustensiles : undefined,
    ingredients: r.ingredients ?? [], etapes: r.etapes ?? [],
    conseils_chef: r.conseils_chef ?? undefined,
    accompagnements: Array.isArray(r.accompagnements) ? r.accompagnements : undefined,
    photo_keyword: '', photoUrl: r.photo_url ?? undefined, category: r.category ?? undefined,
    source_kind: r.source_kind ?? 'ia', source_url: r.source_url ?? null, source_author: r.source_author ?? null,
    score: r.score_detail ?? null,
    completions: Array.isArray(r.completions) ? r.completions : undefined,
    share_token: r.share_token ?? null,
  }
}

/** Recipe (+ score) → ligne saved_recipes (upsert). Persiste ENFIN les macros (bug historique). */
export function toSavedRow(userId: string, recipe: Recipe, score?: ScoreMyta | null) {
  const s = score ?? recipe.score ?? null
  return {
    user_id: userId, recipe_id: recipe.id, titre: recipe.titre,
    description: recipe.description, temps: recipe.temps, portions: recipe.portions,
    temps_prep: recipe.temps_prep ?? null, temps_cuisson: recipe.temps_cuisson ?? null,
    calories: recipe.calories, difficulte: recipe.difficulte,
    proteines: recipe.proteines ?? null, glucides: recipe.glucides ?? null, lipides: recipe.lipides ?? null,
    sucres: s?.perPortion.sugars ?? null, satures: s?.perPortion.satFat ?? null,
    fibres: s?.perPortion.fiber ?? null, sel_g: s?.perPortion.salt ?? null,
    poids_portion_g: s?.perPortion.poids ?? null,
    score_grade: s?.grade ?? null, score_points: s?.points ?? null, score_confidence: s?.confidence ?? null,
    score_detail: s ?? null,
    ingredients: recipe.ingredients, etapes: recipe.etapes,
    ustensiles: recipe.ustensiles ?? null, conseils_chef: recipe.conseils_chef ?? null,
    accompagnements: recipe.accompagnements ?? null,
    photo_url: recipe.photoUrl ?? null, category: recipe.category ?? null,
    source_kind: recipe.source_kind ?? 'ia', source_url: recipe.source_url ?? null,
    source_author: recipe.source_author ?? null,
    source_captured_at: recipe.source_kind && recipe.source_kind !== 'ia' ? new Date().toISOString() : null,
    completions: recipe.completions ?? null,
  }
}

/** Ajoute `nbPortions` portion(s) de la recette au journal du jour. */
export async function addRecipeToJournal(
  supabase: SupabaseClient, recipe: Recipe, nbPortions = 1,
): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non connecté' }
  const k = Math.max(0.25, nbPortions)
  const r1 = (n: number) => Math.round(n * 10) / 10
  const poids = recipe.score?.perPortion.poids
  const { error } = await supabase.from('journal_entries').insert({
    user_id:   user.id,
    date:      todayISO(),
    food_id:   `recipe-${recipe.id}`,
    food_name: recipe.titre,
    food_cat:  'plat',
    quantity:  poids ? Math.round(poids * k) : Math.round(100 * k),
    cal:       Math.round((recipe.calories ?? 0) * k),
    prot:      r1((recipe.proteines ?? 0) * k),
    carb:      r1((recipe.glucides ?? 0) * k),
    fat:       r1((recipe.lipides ?? 0) * k),
    image_url: recipe.photoUrl ?? null,
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Jeton public de partage de la recette (elle doit être dans le catalogue de l'utilisateur). */
export async function recipeShareToken(supabase: SupabaseClient, recipe: Recipe): Promise<string | null> {
  if (recipe.share_token) return recipe.share_token
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('saved_recipes').select('share_token').eq('user_id', user.id).eq('recipe_id', recipe.id).maybeSingle()
  return data?.share_token ?? null
}

/**
 * « Partager en PDF » : génère la fiche (serveur) puis ouvre la feuille de partage
 * (iOS/Android/Chrome) ; à défaut, télécharge le fichier.
 */
export async function shareRecipePdf(supabase: SupabaseClient, recipe: Recipe, score?: ScoreMyta | null): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non connecté' }
  // La fiche PDF se base sur la version enregistrée : on sauvegarde d'abord (silencieux si déjà fait)
  const { error: upErr } = await supabase.from('saved_recipes').upsert(toSavedRow(user.id, recipe, score), { onConflict: 'user_id,recipe_id' })
  if (upErr) return { ok: false, error: upErr.message }
  const token = await recipeShareToken(supabase, recipe)
  if (!token) return { ok: false, error: 'Jeton de partage introuvable' }
  const res = await fetch(`/api/recipes/pdf?t=${token}`)
  if (!res.ok) return { ok: false, error: 'PDF indisponible pour le moment' }
  const blob = await res.blob()
  const name = `myta-${recipe.titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'recette'}.pdf`
  const file = new File([blob], name, { type: 'application/pdf' })
  const nav: any = typeof navigator !== 'undefined' ? navigator : null
  if (nav?.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: recipe.titre, text: `Recette MYTA : ${recipe.titre}` }) } catch { /* partage annulé */ }
    return { ok: true }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
  return { ok: true }
}
