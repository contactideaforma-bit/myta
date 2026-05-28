import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Clock, Users, Flame, Star } from 'lucide-react'

interface Props {
  searchParams: { id?: string }
}

const DIFF_COLOR: Record<string, string> = {
  'Facile': 'bg-green-100 text-green-700',
  'Moyen':  'bg-amber-100 text-amber-700',
  'Avancé': 'bg-red-100 text-red-700',
}

export async function generateMetadata({ searchParams }: Props) {
  const id = searchParams.id
  if (!id) return { title: 'Recette — MYTA' }
  const supabase = createClient()
  const { data } = await supabase
    .from('saved_recipes')
    .select('titre, description')
    .eq('recipe_id', id)
    .limit(1)
    .single()
  return {
    title: data ? `${data.titre} — MYTA` : 'Recette — MYTA',
    description: data?.description ?? 'Recette partagée depuis My Twin App',
  }
}

export default async function SharedRecipePage({ searchParams }: Props) {
  const id = searchParams.id
  if (!id) notFound()

  const supabase = createClient()

  // Cherche la recette dans les recettes sauvegardées (première occurrence)
  const { data: recipe } = await supabase
    .from('saved_recipes')
    .select('*')
    .eq('recipe_id', id)
    .limit(1)
    .single()

  if (!recipe) notFound()

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

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Photo hero */}
        <div className="relative rounded-2xl overflow-hidden h-56">
          {recipe.photo_url ? (
            <img src={recipe.photo_url} alt={recipe.titre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-100 to-zinc-100 flex items-center justify-center text-7xl">
              🍽️
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
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

        {/* Niveau badge */}
        {recipe.difficulte && (
          <div className="flex">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${DIFF_COLOR[recipe.difficulte] ?? 'bg-zinc-100 text-zinc-500'}`}>
              {recipe.difficulte}
            </span>
          </div>
        )}

        {/* Ingrédients */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-zinc-900 mb-3">🛒 Ingrédients</h2>
          <div className="flex flex-col gap-1.5">
            {(recipe.ingredients as string[]).map((ing: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-zinc-700">{ing}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Étapes */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-zinc-900 mb-3">👨‍🍳 Préparation</h2>
          <ol className="flex flex-col gap-3">
            {(recipe.etapes as string[]).map((etape: string, i: number) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-zinc-600 leading-relaxed flex-1">{etape}</p>
              </li>
            ))}
          </ol>
        </div>

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
