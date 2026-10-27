import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Clock, Users, Flame, Star, ExternalLink } from 'lucide-react'
import { SOURCE_LABELS, type SourceKind } from '@/lib/recipes'
import { AddToCatalog } from './AddToCatalog'

const GRADE_BG: Record<string, string> = {
  A: 'bg-green-500 text-white', B: 'bg-green-600 text-white', C: 'bg-amber-300 text-amber-900',
  D: 'bg-orange-300 text-orange-900', E: 'bg-zinc-400 text-white',
}

function ingLabel(ing: any): string {
  if (typeof ing === 'string') return ing
  if (ing && typeof ing === 'object') return [ing.qte, ing.nom, ing.note ? `(${ing.note})` : ''].filter(Boolean).join(' ')
  return String(ing ?? '')
}
interface Props {
  searchParams: { id?: string; t?: string }
}

/** Recette partagée : par jeton public (t) — lisible par tout le monde — ou par id (propriétaire connecté). */
async function loadShared(searchParams: Props['searchParams']) {
  const supabase = createClient()
  const token = (searchParams.t ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 32)
  if (token) {
    const { data } = await supabase.rpc('get_shared_recipe', { p_token: token })
    return data ? { recipe: data as any, token } : null
  }
  if (searchParams.id) {
    const { data } = await supabase.from('saved_recipes').select('*').eq('recipe_id', searchParams.id).limit(1).maybeSingle()
    return data ? { recipe: data as any, token: (data as any).share_token as string | null } : null
  }
  return null
}

export async function generateMetadata({ searchParams }: Props) {
  const found = await loadShared(searchParams)
  const data = found?.recipe
  return {
    title: data ? `${data.titre} — MYTA` : 'Recette — MYTA',
    description: data?.description ?? 'Recette partagée depuis My Twin App',
    openGraph: data?.photo_url ? { images: [{ url: data.photo_url }] } : undefined,
  }
}

export default async function SharedRecipePage({ searchParams }: Props) {
  const found = await loadShared(searchParams)
  if (!found) notFound()
  const { recipe, token } = found

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header MYTA */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-tta rounded-lg flex items-center justify-center">
            <span className="text-tta-accent text-xs font-black">M</span>
          </div>
          <span className="font-bold text-sm text-zinc-900">My Twin App</span>
        </div>
        <a href="/auth"
          className="text-xs font-medium text-nutri-dark bg-nutri-light px-3 py-1.5 rounded-full hover:bg-nutri hover:text-white transition-colors">
          Rejoindre MYTA
        </a>
      </div>

      <div className="page">

        {/* Photo hero */}
        <div className="relative rounded-2xl overflow-hidden h-56">
          {recipe.photo_url ? (
            <img src={recipe.photo_url} alt={recipe.titre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-100 to-zinc-100 flex items-center justify-center text-7xl">

            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-white font-black text-xl leading-tight">{recipe.titre}</h1>
            {recipe.description && (
              <p className="text-white/80 text-sm mt-1">{recipe.description}</p>
            )}
          </div>
        </div>

        {/* Crédit source (import Instagram / TikTok / web) */}
        {recipe.source_kind && recipe.source_kind !== 'ia' && (
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-xs text-zinc-600">
            <span className="font-bold text-zinc-400 uppercase text-[10px]">Source · {SOURCE_LABELS[recipe.source_kind as SourceKind] ?? recipe.source_kind}</span>
            {recipe.source_author && <p className="font-semibold text-zinc-900">{recipe.source_author}</p>}
            {recipe.source_url && (
              <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 mt-0.5">
                <ExternalLink size={11} />Voir la publication d'origine
              </a>
            )}
            <p className="text-[10px] text-zinc-400 mt-1">Étapes reformulées par MYTA · recette importée par un membre.</p>
          </div>
        )}

        {token && <AddToCatalog token={token} recipe={recipe} />}

        {/* Score MYTA + macros */}
        {(recipe.score_grade || recipe.proteines) && (
          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4">
            {recipe.score_grade && (
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 ${GRADE_BG[recipe.score_grade] ?? 'bg-zinc-200'}`}>
                {recipe.score_grade}
              </div>
            )}
            <div className="flex-1">
              <p className="text-[10px] font-bold text-green-700 uppercase">Score MYTA{recipe.score_grade ? ' · pour 100 g' : ''}</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Par portion : <b>{recipe.calories} kcal</b>
                {recipe.proteines != null && <> · {Math.round(recipe.proteines)} g prot.</>}
                {recipe.glucides != null && <> · {Math.round(recipe.glucides)} g gluc.</>}
                {recipe.lipides != null && <> · {Math.round(recipe.lipides)} g lip.</>}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1">Indice MYTA, sans lien avec le Nutri-Score officiel.</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Clock size={14} />,  val: `${recipe.temps} min`,     lbl: 'Temps' },
            { icon: <Users size={14} />,  val: `${recipe.portions}`,       lbl: 'Portions' },
            { icon: <Flame size={14} />,  val: `${recipe.calories} kcal`, lbl: 'Par portion' },
            { icon: <Star size={14} />,   val: recipe.difficulte,          lbl: 'Niveau' },
          ].map(({ icon, val, lbl }) => (
            <div key={lbl} className="bg-white border border-zinc-200 rounded-xl p-2 flex flex-col items-center text-center">
              <div className="text-green-600">{icon}</div>
              <p className="text-xs font-bold text-zinc-900 mt-0.5">{val}</p>
              <p className="text-[10px] text-zinc-400">{lbl}</p>
            </div>
          ))}
        </div>

        {Array.isArray(recipe.ustensiles) && recipe.ustensiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.ustensiles.map((u: string, i: number) => <span key={i} className="text-xs bg-white border border-zinc-200 text-zinc-600 px-2.5 py-1 rounded-full">{u}</span>)}
          </div>
        )}

        {/* Ingrédients */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-zinc-900 mb-3">Ingrédients</h2>
          <div className="flex flex-col gap-1.5">
            {(recipe.ingredients as any[]).map((ing: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-zinc-700">{ingLabel(ing)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Étapes */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-zinc-900 mb-3">Préparation, étape par étape</h2>
          <ol className="flex flex-col gap-4">
            {(recipe.etapes as any[]).map((etape: any, i: number) => {
              const obj = etape && typeof etape === 'object'
              return (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-7 h-7 rounded-xl bg-green-500 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    {obj && etape.titre && (
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-bold text-zinc-900">{etape.titre}</p>
                        {etape.duree && <span className="text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full flex-shrink-0">{etape.duree}</span>}
                      </div>
                    )}
                    <p className="text-sm text-zinc-600 leading-relaxed">{obj ? etape.detail : String(etape)}</p>
                    {obj && etape.astuce && <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5"><span className="font-semibold">Astuce :</span> {etape.astuce}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {recipe.conseils_chef && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs font-extrabold text-green-800 mb-1">Le conseil de Waty</p>
            <p className="text-sm text-green-900 leading-relaxed">{recipe.conseils_chef}</p>
          </div>
        )}

        {Array.isArray(recipe.accompagnements) && recipe.accompagnements.length > 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl p-4">
            <p className="text-xs font-extrabold text-zinc-500 mb-2">Accompagnements</p>
            <div className="flex flex-wrap gap-1.5">{recipe.accompagnements.map((a: string, i: number) => <span key={i} className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">{a}</span>)}</div>
          </div>
        )}

        {Array.isArray(recipe.completions) && recipe.completions.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4">
            <p className="text-[10px] font-bold text-amber-700 uppercase">Complété par Waty</p>
            <p className="text-[11px] text-amber-800/80 mt-0.5 mb-1.5">La publication d'origine ne précisait pas tout ; ces éléments ont été estimés.</p>
            <ul className="flex flex-col gap-1">{recipe.completions.map((c: string, i: number) => <li key={i} className="text-xs text-amber-900">– {c}</li>)}</ul>
          </div>
        )}

        {/* CTA rejoindre */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-zinc-900 mb-1">Tu veux plus de recettes comme celle-ci ?</p>
          <p className="text-xs text-zinc-500 mb-3">Rejoins MYTA — nutrition & sport en une seule app</p>
          <a href="/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors">
            Créer mon compte gratuitement
          </a>
        </div>

      </div>
    </div>
  )
}
