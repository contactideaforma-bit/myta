'use client'
/**
 * Onglet « Campagnes » : relance e-mail des adhérents, texte généré par Waty
 * à partir d'une idée ou d'un mot-clé, aperçu, envoi par segment.
 */
import { useEffect, useRef, useState } from 'react'
import { MytaIcon } from '@/components/ui/MytaIcon'
import { MytaIllustration } from '@/components/ui/MytaIllustration'
import { SEGMENTS, type Segment } from '@/lib/campaign-segments'

interface Draft { subject: string; preheader: string; paragraphs: string; cta: string; ctaPath: string }
interface Past { id: string; segment: string; idea: string | null; subject: string; recipients: number; sent: number; failed: number; created_at: string }

const EXAMPLES = [
  "N'oublie pas que le sport c'est important pour la santé",
  'Waty t\'attend, reviens noter ton premier repas',
  'Nouveau : importe tes recettes Instagram ou TikTok',
  'Le sommeil, c\'est la moitié du résultat',
]
const PATHS = [['/dashboard', 'Accueil'], ['/nutrition/journal', 'Journal'], ['/sport', 'Sport'], ['/sleep', 'Sommeil'], ['/nutrition/recipes', 'Recettes'], ['/games', 'Mini-jeux'], ['/pricing', 'Offres Premium'], ['/account', 'Mon compte']]
const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function AdminCampaigns({ headers, toast }: { headers: () => Promise<Record<string, string>>; toast: (m: string) => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [history, setHistory] = useState<Past[]>([])
  const [segment, setSegment] = useState<Segment>('dormant')
  const [idea, setIdea] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<'' | 'gen' | 'send'>('')
  const [preview, setPreview] = useState('')
  const [confirm, setConfirm] = useState(false)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    const res = await fetch('/api/admin/campaigns', { headers: await headers() })
    if (res.ok) { const d = await res.json(); setCounts(d.counts ?? {}); setHistory(d.history ?? []) }
  }
  useEffect(() => { load() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // aperçu HTML (rendu serveur, identique au mail reçu), rafraîchi après édition
  useEffect(() => {
    if (!draft) { setPreview(''); return }
    if (previewTimer.current) clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(async () => {
      const res = await fetch('/api/admin/campaigns/preview', { method: 'POST', headers: await headers(), body: JSON.stringify(payload(draft)) })
      if (res.ok) setPreview(await res.text())
    }, 350)
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current) }
  }, [draft])   // eslint-disable-line react-hooks/exhaustive-deps

  function payload(d: Draft) {
    return { subject: d.subject, preheader: d.preheader, body: { paragraphs: d.paragraphs.split(/\n{2,}/).map(s => s.trim()).filter(Boolean), cta: d.cta, ctaPath: d.ctaPath } }
  }

  async function generate() {
    if (!idea.trim()) return
    setBusy('gen'); setConfirm(false)
    const res = await fetch('/api/admin/campaigns/generate', { method: 'POST', headers: await headers(), body: JSON.stringify({ idea, segment }) })
    const d = await res.json()
    setBusy('')
    if (!res.ok) { toast(d.error ?? 'Erreur'); return }
    setDraft({ subject: d.subject, preheader: d.preheader ?? '', paragraphs: d.body.paragraphs.join('\n\n'), cta: d.body.cta, ctaPath: d.body.ctaPath })
  }

  async function send() {
    if (!draft) return
    setBusy('send')
    const res = await fetch('/api/admin/campaigns', { method: 'POST', headers: await headers(), body: JSON.stringify({ ...payload(draft), segment, idea }) })
    const d = await res.json()
    setBusy(''); setConfirm(false)
    if (!res.ok) { toast(d.error ?? 'Erreur'); return }
    toast(d.failed ? `${d.sent} envoyés, ${d.failed} en échec${d.error ? ` : ${d.error}` : ''}` : `Campagne envoyée à ${d.sent} adhérent${d.sent > 1 ? 's' : ''}`)
    setDraft(null); setIdea('')
    load()
  }

  const n = counts[segment] ?? 0
  const seg = SEGMENTS.find(s => s.key === segment)!

  return (
    <>
      {/* ── 1. Cible ── */}
      <div className="card flex flex-col gap-2">
        <p className="text-sm font-extrabold t-text">1 · À qui ?</p>
        <div className="flex flex-col gap-1.5">
          {SEGMENTS.map(s => (
            <button key={s.key} onClick={() => setSegment(s.key)} className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left transition-all ${segment === s.key ? 'bg-tta-mid text-white' : 'bg-raised t-text'}`}>
              <span><span className="text-sm font-bold">{s.label}</span><span className={`block text-[11px] ${segment === s.key ? 'text-white/70' : 't-muted'}`}>{s.hint}</span></span>
              <span className={`text-sm font-extrabold tabular-nums ${segment === s.key ? '' : 'text-tta-mid'}`}>{counts[s.key] ?? '…'}</span>
            </button>
          ))}
        </div>
        {!!counts.optout && <p className="text-[11px] t-faint">{counts.optout} adhérent{counts.optout > 1 ? 's' : ''} désinscrit{counts.optout > 1 ? 's' : ''} des e-mails (jamais ciblés).</p>}
      </div>

      {/* ── 2. Idée ── */}
      <div className="card flex flex-col gap-2">
        <p className="text-sm font-extrabold t-text">2 · L'idée du message</p>
        <p className="text-xs t-muted">Une phrase ou un mot-clé suffit : Waty le transforme en e-mail accrocheur, que tu peux retoucher ensuite.</p>
        <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={3} placeholder="Ex. : n'oublie pas que le sport c'est important pour la santé" className="input resize-none" />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map(x => <button key={x} onClick={() => setIdea(x)} className="text-[11px] font-semibold bg-raised rounded-full px-2.5 py-1 t-muted text-left">{x}</button>)}
        </div>
        <button onClick={generate} disabled={busy !== '' || !idea.trim()} className="btn-primary justify-center disabled:opacity-50 gap-2">
          <MytaIcon name="sparkle" size={16} />{busy === 'gen' ? 'Waty écrit…' : draft ? 'Regénérer avec Waty' : 'Générer avec Waty'}
        </button>
      </div>

      {/* ── 3. Texte + aperçu ── */}
      {draft && (
        <>
          <div className="card flex flex-col gap-2">
            <p className="text-sm font-extrabold t-text">3 · Relis et ajuste</p>
            <label className="text-[11px] font-bold t-muted uppercase tracking-wide">Objet</label>
            <input value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} className="input font-bold" />
            <label className="text-[11px] font-bold t-muted uppercase tracking-wide">Aperçu dans la boîte mail (préheader)</label>
            <input value={draft.preheader} onChange={e => setDraft({ ...draft, preheader: e.target.value })} className="input" />
            <label className="text-[11px] font-bold t-muted uppercase tracking-wide">Texte (une ligne vide = nouveau paragraphe, **gras**)</label>
            <textarea value={draft.paragraphs} onChange={e => setDraft({ ...draft, paragraphs: e.target.value })} rows={9} className="input leading-relaxed" />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[11px] font-bold t-muted uppercase tracking-wide">Bouton</label><input value={draft.cta} onChange={e => setDraft({ ...draft, cta: e.target.value })} className="input" /></div>
              <div><label className="text-[11px] font-bold t-muted uppercase tracking-wide">Ouvre</label>
                <select value={draft.ctaPath} onChange={e => setDraft({ ...draft, ctaPath: e.target.value })} className="input">{PATHS.map(([p, l]) => <option key={p} value={p}>{l}</option>)}</select></div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <p className="text-[11px] font-bold t-muted uppercase tracking-wide px-4 pt-3">Aperçu du mail reçu</p>
            {preview ? <iframe title="Aperçu" srcDoc={preview} sandbox="" className="w-full h-[460px] border-0 bg-transparent" /> : <p className="text-xs t-muted px-4 py-6">Rendu en cours…</p>}
          </div>

          {/* ── 4. Envoi ── */}
          <div className="card flex flex-col gap-2">
            {!confirm ? (
              <button onClick={() => setConfirm(true)} disabled={!draft.subject.trim() || !draft.paragraphs.trim() || n === 0} className="btn-primary justify-center disabled:opacity-50 gap-2">
                <MytaIcon name="share" size={16} />Envoyer à {n} adhérent{n > 1 ? 's' : ''} · {seg.label}
              </button>
            ) : (
              <>
                <p className="text-sm t-text text-center">Envoyer <strong>« {draft.subject} »</strong> à <strong>{n} adhérent{n > 1 ? 's' : ''}</strong> ({seg.label.toLowerCase()}) ? Cette action est immédiate.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirm(false)} className="btn-ghost flex-1 justify-center bg-raised">Annuler</button>
                  <button onClick={send} disabled={busy === 'send'} className="btn-primary flex-1 justify-center disabled:opacity-50">{busy === 'send' ? 'Envoi…' : 'Oui, envoyer'}</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Historique ── */}
      <p className="text-sm font-extrabold t-text px-1 pt-1">Campagnes envoyées</p>
      {history.length === 0 ? (
        <div className="card text-center py-8 flex flex-col items-center gap-2"><MytaIllustration name="vide" size={56} /><p className="text-sm font-bold t-text">Aucune campagne pour l'instant.</p></div>
      ) : history.map(h => (
        <div key={h.id} className="card flex flex-col gap-1 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold t-text leading-snug">{h.subject}</p>
            <span className={`text-[11px] font-extrabold rounded-full px-2.5 py-1 shrink-0 ${h.failed ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>{h.sent}/{h.recipients}</span>
          </div>
          <p className="text-[11px] t-muted">{fmt(h.created_at)} · {SEGMENTS.find(s => s.key === h.segment)?.label ?? h.segment}{h.idea ? ` · « ${h.idea.slice(0, 60)}${h.idea.length > 60 ? '…' : ''} »` : ''}</p>
        </div>
      ))}
    </>
  )
}
