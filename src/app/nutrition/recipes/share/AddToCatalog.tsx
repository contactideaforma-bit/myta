'use client'
/**
 * Bouton « Ajouter à mon catalogue » sur la page de partage.
 * Connecté → copie la recette dans saved_recipes du visiteur (nouvel id, provenance conservée).
 * Non connecté → envoie vers la création de compte, puis revient sur la page.
 */
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookmarkPlus, Check, Loader2, FileDown } from 'lucide-react'

export function AddToCatalog({ token, recipe }: { token: string; recipe: any }) {
  const supabase = createClient()
  const [state, setState] = useState<'loading' | 'anon' | 'ready' | 'busy' | 'done' | 'own'>('loading')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setState('anon'); return }
      const { data } = await supabase.from('saved_recipes').select('recipe_id').eq('user_id', user.id).or(`share_token.eq.${token},recipe_id.eq.copy-${token}`).limit(1)
      setState(data && data.length ? 'own' : 'ready')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function add() {
    setState('busy')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setState('anon'); return }
    const row = { ...recipe, user_id: user.id, recipe_id: `copy-${token}`, share_token: undefined, created_at: undefined }
    delete row.share_token; delete row.created_at
    const { error } = await supabase.from('saved_recipes').upsert(row, { onConflict: 'user_id,recipe_id' })
    setState(error ? 'ready' : 'done')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <a href={`/api/recipes/pdf?t=${token}`} target="_blank" rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-800">
          <FileDown size={15} />Fiche PDF
        </a>
        {state === 'anon' && (
          <a href="/auth" onClick={() => { try { localStorage.setItem('myta_pending_recipe', token) } catch { /* ignoré */ } }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold">
            <BookmarkPlus size={15} />Ajouter à mon catalogue
          </a>
        )}
        {(state === 'ready' || state === 'busy') && (
          <button onClick={add} disabled={state === 'busy'} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-60">
            {state === 'busy' ? <Loader2 size={15} className="animate-spin" /> : <BookmarkPlus size={15} />}Ajouter à mon catalogue
          </button>
        )}
        {(state === 'done' || state === 'own') && (
          <a href="/nutrition/recipes?view=saved" className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-100 text-green-800 text-sm font-bold">
            <Check size={15} />{state === 'done' ? 'Ajoutée · voir mon catalogue' : 'Déjà dans mon catalogue'}
          </a>
        )}
        {state === 'loading' && <div className="flex-1 h-11 rounded-xl bg-zinc-100 animate-pulse" />}
      </div>
      {state === 'anon' && <p className="text-[11px] text-zinc-400 text-center">Crée ton compte MYTA (gratuit) : la recette sera ajoutée à ton catalogue dès ta première connexion.</p>}
    </div>
  )
}
