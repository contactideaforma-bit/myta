'use client'
/**
 * Onglet « Réseaux » : description de vidéo prête à coller (Instagram, TikTok, LinkedIn),
 * rédigée par Waty à partir d'une phrase, cohérente avec les vraies fonctions de l'app.
 */
import { useEffect, useState } from 'react'
import { MytaIcon } from '@/components/ui/MytaIcon'
import { MytaIllustration } from '@/components/ui/MytaIllustration'

interface Result { primary: string; short: string; hooks: string[]; hashtags: string[] }
interface Past { id: string; video: string; platform: string; goal: string | null; result: Result; created_at: string }

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram' }, { key: 'tiktok', label: 'TikTok' }, { key: 'both', label: 'Les deux' }, { key: 'linkedin', label: 'LinkedIn' },
]
const GOALS = [
  { key: 'feature', label: 'Montrer une fonction' }, { key: 'discovery', label: 'Faire découvrir MYTA' }, { key: 'tip', label: 'Conseil bien-être' },
  { key: 'behind', label: 'Coulisses' }, { key: 'promo', label: 'Inscription / offre' },
]
const EXAMPLES = [
  'Je montre comment importer une recette depuis un lien TikTok et obtenir la fiche avec le Score MYTA',
  'Je note mon petit-déjeuner à la voix et Waty calcule tout',
  'Démo du mini-jeu Le Grand Tri avec le défi du jour',
  'Le bilan de la semaine généré par Waty',
]
const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function AdminSocial({ headers, toast }: { headers: () => Promise<Record<string, string>>; toast: (m: string) => void }) {
  const [video, setVideo] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [goal, setGoal] = useState('feature')
  const [emojis, setEmojis] = useState(false)
  const [extra, setExtra] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [edited, setEdited] = useState('')
  const [history, setHistory] = useState<Past[]>([])

  async function load() {
    const res = await fetch('/api/admin/social', { headers: await headers() })
    if (res.ok) setHistory((await res.json()).history ?? [])
  }
  useEffect(() => { load() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    if (!video.trim()) return
    setBusy(true)
    const res = await fetch('/api/admin/social', { method: 'POST', headers: await headers(), body: JSON.stringify({ video, platform, goal, emojis, extra }) })
    const d = await res.json()
    setBusy(false)
    if (!res.ok) { toast(d.error ?? 'Erreur'); return }
    setResult(d); setEdited(d.primary)
    load()
  }
  async function copy(t: string) { try { await navigator.clipboard.writeText(t); toast('Copié, colle-le dans ta publication') } catch { toast('Copie impossible') } }

  return (
    <>
      <div className="card flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <MytaIllustration name="micro" size={44} />
          <div>
            <p className="text-sm font-extrabold t-text">Description de vidéo</p>
            <p className="text-[11px] t-muted">Dis ce que montre ta vidéo, Waty écrit le texte à coller, fidèle à ce que fait vraiment l'app.</p>
          </div>
        </div>
        <textarea value={video} onChange={e => setVideo(e.target.value)} rows={3} placeholder="Ex. : je montre la fonction recettes de MYTA, j'importe une recette TikTok et j'obtiens la fiche" className="input resize-none" />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map(x => <button key={x} onClick={() => setVideo(x)} className="text-[11px] font-semibold bg-raised rounded-full px-2.5 py-1 t-muted text-left">{x}</button>)}
        </div>
        <div>
          <p className="text-[11px] font-bold t-muted uppercase tracking-wide mb-1.5">Plateforme</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map(p => <button key={p.key} onClick={() => setPlatform(p.key)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${platform === p.key ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 t-text'}`}>{p.label}</button>)}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold t-muted uppercase tracking-wide mb-1.5">Objectif</p>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map(g => <button key={g.key} onClick={() => setGoal(g.key)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${goal === g.key ? 'bg-nutri text-white border-nutri' : 'border-zinc-200 t-text'}`}>{g.label}</button>)}
          </div>
        </div>
        <input value={extra} onChange={e => setExtra(e.target.value)} placeholder="Consigne en plus (facultatif) : mentionner l'essai gratuit, parler aux mamans…" className="input" />
        <label className="flex items-center gap-2 text-sm t-text"><input type="checkbox" checked={emojis} onChange={e => setEmojis(e.target.checked)} className="w-4 h-4 accent-[#4B47A0]" />Autoriser quelques emojis</label>
        <button onClick={generate} disabled={busy || !video.trim()} className="btn-primary justify-center disabled:opacity-50 gap-2">
          <MytaIcon name="sparkle" size={16} />{busy ? 'Waty écrit…' : result ? 'Regénérer' : 'Générer la description'}
        </button>
      </div>

      {result && (
        <>
          <div className="card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold t-text">Texte prêt à coller</p>
              <span className="text-[11px] t-faint">{edited.length} caractères</span>
            </div>
            <textarea value={edited} onChange={e => setEdited(e.target.value)} rows={10} className="input leading-relaxed text-sm" />
            <button onClick={() => copy(edited)} className="btn-primary justify-center gap-2"><MytaIcon name="share" size={16} />Copier le texte</button>
          </div>

          {result.short && (
            <div className="card flex flex-col gap-2">
              <p className="text-sm font-extrabold t-text">Version courte</p>
              <p className="text-sm t-text whitespace-pre-wrap leading-relaxed bg-raised rounded-2xl px-3 py-2">{result.short}</p>
              <button onClick={() => copy(result.short)} className="btn-ghost justify-center bg-raised text-sm">Copier la version courte</button>
            </div>
          )}

          <div className="card flex flex-col gap-2">
            <p className="text-sm font-extrabold t-text">Autres accroches</p>
            {result.hooks.map((h, i) => (
              <button key={i} onClick={() => setEdited(prev => { const lines = prev.split('\n'); lines[0] = h; return lines.join('\n') })} className="text-left text-sm t-text bg-raised rounded-2xl px-3 py-2">{h}</button>
            ))}
            <p className="text-[11px] t-faint">Appuie sur une accroche pour remplacer la première ligne du texte.</p>
          </div>

          <div className="card flex flex-col gap-2">
            <p className="text-sm font-extrabold t-text">Hashtags</p>
            <div className="flex flex-wrap gap-1.5">{result.hashtags.map(h => <span key={h} className="text-xs font-bold bg-raised rounded-full px-2.5 py-1 text-tta-mid">{h}</span>)}</div>
            <button onClick={() => copy(result.hashtags.join(' '))} className="btn-ghost justify-center bg-raised text-sm">Copier les hashtags seuls</button>
          </div>
        </>
      )}

      <p className="text-sm font-extrabold t-text px-1 pt-1">Dernières descriptions</p>
      {history.length === 0 ? (
        <div className="card text-center py-8 flex flex-col items-center gap-2"><MytaIllustration name="vide" size={56} /><p className="text-sm font-bold t-text">Rien pour l'instant.</p></div>
      ) : history.map(h => (
        <button key={h.id} onClick={() => { setResult(h.result); setEdited(h.result.primary); setVideo(h.video); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="card text-left flex flex-col gap-1 py-3">
          <p className="text-sm font-bold t-text leading-snug line-clamp-2">{h.video}</p>
          <p className="text-[11px] t-muted">{fmt(h.created_at)} · {PLATFORMS.find(p => p.key === h.platform)?.label ?? h.platform}{h.goal ? ` · ${GOALS.find(g => g.key === h.goal)?.label ?? h.goal}` : ''}</p>
        </button>
      ))}
    </>
  )
}
