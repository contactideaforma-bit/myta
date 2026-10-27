'use client'

/**
 * /admin — espace Collabs (réservé aux e-mails ADMIN_EMAILS, vérifié côté serveur).
 *   - Partenaires : créer un compte Premium à durée limitée (mot de passe provisoire
 *     envoyé par e-mail), prolonger, renvoyer un mot de passe, révoquer.
 *   - Codes promo : générer un code rattaché à un partenaire (N jours Premium offerts),
 *     limite d'utilisations, date de fin, envoi au partenaire, activation.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MytaIcon } from '@/components/ui/MytaIcon'
import { MytaIllustration } from '@/components/ui/MytaIllustration'
import { AdminStats } from './AdminStats'

interface Code { code: string; partner_user_id: string | null; partner_name: string | null; days: number; max_uses: number | null; uses: number; redemptions: number; expires_at: string | null; active: boolean; note: string | null; created_at: string }
interface Activity { createdAt: string | null; lastSignIn: string | null; activated: boolean; lastDay: string | null; days7: number; days30: number; meals30: number; sessions30: number; sleeps30: number; recipes: number; games30: number; lastMeal: string | null }
interface Partner { id: string; email: string | null; full_name: string | null; subscription_status: string; access_until: string | null; partner_note: string | null; partner_since: string | null; active: boolean; codes: Code[]; activity?: Activity }

const DURATIONS = [30, 60, 90, 180, 365]
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const ago = (iso: string | null) => {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).getTime()) / 86_400_000)
  return d <= 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d} j`
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<'partners' | 'codes' | 'stats'>('partners')
  const [partners, setPartners] = useState<Partner[]>([])
  const [codes, setCodes] = useState<Code[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // formulaire partenaire
  const [pEmail, setPEmail] = useState(''); const [pName, setPName] = useState(''); const [pDays, setPDays] = useState(90)
  const [pCustom, setPCustom] = useState(''); const [pNote, setPNote] = useState(''); const [pBusy, setPBusy] = useState(false)
  const [created, setCreated] = useState<{ email: string; password: string | null; until: string; emailSent: boolean; emailError?: string | null } | null>(null)
  // formulaire code
  const [cPartner, setCPartner] = useState(''); const [cCode, setCCode] = useState(''); const [cDays, setCDays] = useState(30)
  const [cMax, setCMax] = useState(''); const [cExp, setCExp] = useState(''); const [cNote, setCNote] = useState(''); const [cNotify, setCNotify] = useState(true)
  const [cBusy, setCBusy] = useState(false)

  async function headers() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }
  }
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2600) }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/partners', { headers: await headers() })
    if (res.ok) { const d = await res.json(); setPartners(d.partners); setCodes(d.codes) }
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/me', { headers: await headers() })
      const d = res.ok ? await res.json() : { admin: false }
      setAllowed(!!d.admin)
      if (d.admin) load()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createPartner() {
    const days = pCustom ? Number(pCustom) : pDays
    if (!pEmail.trim() || !days) return
    setPBusy(true); setCreated(null)
    const res = await fetch('/api/admin/partners', { method: 'POST', headers: await headers(), body: JSON.stringify({ email: pEmail, name: pName, days, note: pNote }) })
    const d = await res.json()
    setPBusy(false)
    if (!res.ok) { showToast(d.error ?? 'Erreur'); return }
    setCreated({ email: pEmail.trim().toLowerCase(), password: d.password, until: d.until, emailSent: d.emailSent, emailError: d.emailError })
    setPEmail(''); setPName(''); setPNote(''); setPCustom('')
    load()
  }

  async function patchPartner(userId: string, action: string, days?: number) {
    const res = await fetch('/api/admin/partners', { method: 'PATCH', headers: await headers(), body: JSON.stringify({ userId, action, days }) })
    const d = await res.json()
    if (!res.ok) { showToast(d.error ?? 'Erreur'); return }
    if (action === 'resend') { showToast(d.emailSent ? 'Nouveau mot de passe envoyé' : `Mot de passe : ${d.password} (e-mail non envoyé${d.emailError ? ` : ${d.emailError}` : ''})`) }
    else if (action === 'extend') showToast(`Prolongé jusqu'au ${fmt(d.until)}`)
    else showToast('Accès révoqué')
    load()
  }

  async function createCode(partnerId?: string) {
    setCBusy(true)
    const res = await fetch('/api/admin/codes', { method: 'POST', headers: await headers(), body: JSON.stringify({
      partnerId: partnerId ?? (cPartner || null), code: partnerId ? '' : cCode, days: cDays, maxUses: cMax ? Number(cMax) : null,
      expiresAt: cExp || null, note: cNote, notify: cNotify,
    }) })
    const d = await res.json()
    setCBusy(false)
    if (!res.ok) { showToast(d.error ?? 'Erreur'); return }
    showToast(`Code ${d.code} créé${d.emailSent ? ' et envoyé' : cNotify ? ` — e-mail non envoyé${d.emailError ? ` : ${d.emailError}` : ''}` : ''}`)
    setCCode(''); setCNote(''); setCMax(''); setCExp('')
    load()
  }

  async function patchCode(code: string, action: 'toggle' | 'send') {
    const res = await fetch('/api/admin/codes', { method: 'PATCH', headers: await headers(), body: JSON.stringify({ code, action }) })
    const d = await res.json()
    if (!res.ok) { showToast(d.error ?? 'Erreur'); return }
    showToast(action === 'send' ? (d.emailSent ? 'Code envoyé au partenaire' : 'Envoi impossible') : (d.active ? 'Code activé' : 'Code désactivé'))
    load()
  }

  async function copy(text: string) { try { await navigator.clipboard.writeText(text); showToast('Copié') } catch { /* noop */ } }

  if (allowed === null) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-tta-mid/30 border-t-tta-mid rounded-full animate-spin" /></div>
  if (!allowed) return (
    <div className="page">
      <div className="card flex flex-col items-center gap-3 py-10 text-center">
        <MytaIcon name="lock" size={28} className="t-faint" />
        <p className="font-extrabold t-text">Espace réservé</p>
        <p className="text-sm t-muted">Cet espace est réservé au compte d'administration MYTA.</p>
        <button onClick={() => router.push('/dashboard')} className="text-sm font-bold text-tta-mid">Retour à l'accueil</button>
      </div>
    </div>
  )

  const activeCount = partners.filter(p => p.active).length
  const redemptions = codes.reduce((s, c) => s + (c.redemptions ?? 0), 0)

  return (
    <div className="page">
      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-zinc-900 shadow-lg max-w-[92vw] text-center">{toast}</div>}

      <div className="card-hero flex items-center gap-4 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(75,71,160,0.18), transparent)' }} />
        <MytaIllustration name="waty" size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold t-text tracking-tight">Collabs</h1>
          <p className="text-xs t-muted mt-0.5">{activeCount} partenaire{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''} · {codes.length} code{codes.length > 1 ? 's' : ''} · {redemptions} utilisation{redemptions > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex bg-raised rounded-full p-1 gap-1">
        {([['partners', 'Partenaires'], ['codes', 'Codes promo'], ['stats', 'Statistiques']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-full text-sm font-extrabold transition-all ${tab === k ? 'bg-white text-tta-mid shadow-sm' : 't-muted'}`}>{l}</button>
        ))}
      </div>

      {tab === 'partners' && (
        <>
          {/* ── Nouveau partenaire ── */}
          <div className="card flex flex-col gap-3">
            <p className="text-sm font-extrabold t-text">Nouveau partenaire</p>
            <input value={pEmail} onChange={e => setPEmail(e.target.value)} inputMode="email" placeholder="E-mail du partenaire" className="input" />
            <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Prénom / nom (facultatif)" className="input" />
            <div>
              <p className="text-xs font-bold t-muted mb-1.5">Durée de l'accès Premium</p>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => { setPDays(d); setPCustom('') }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${pDays === d && !pCustom ? 'bg-tta-mid text-white border-tta-mid' : 'border-zinc-200 t-muted'}`}>
                    {d} j
                  </button>
                ))}
                <input value={pCustom} onChange={e => setPCustom(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="autre…" className="input w-24 py-1.5 text-xs" />
              </div>
            </div>
            <input value={pNote} onChange={e => setPNote(e.target.value)} placeholder="Note interne (ex. Instagram @…, contrat, contrepartie)" className="input" />
            <button onClick={createPartner} disabled={pBusy || !pEmail.trim()} className="btn-primary justify-center disabled:opacity-50">
              {pBusy ? 'Création…' : 'Créer l\'accès et envoyer l\'e-mail'}
            </button>
            {created && (
              <div className="rounded-2xl bg-nutri-light border border-nutri/30 p-3 text-sm flex flex-col gap-1">
                <p className="font-extrabold text-nutri-dark">{created.password ? 'Compte créé' : 'Compte existant activé'} · Premium jusqu'au {fmt(created.until)}</p>
                <p className="t-text">{created.email}</p>
                {created.password && (
                  <button onClick={() => copy(created.password!)} className="self-start font-mono font-bold tracking-wider bg-white rounded-xl px-3 py-1.5 border border-nutri/30">{created.password} · copier</button>
                )}
                <p className="text-xs t-muted">{created.emailSent ? 'E-mail envoyé au partenaire.' : `E-mail non envoyé — transmets le mot de passe toi-même. ${created.emailError ? `Resend : ${created.emailError}` : ''}`}</p>
              </div>
            )}
          </div>

          {/* ── Liste ── */}
          {loading ? <p className="text-xs t-muted text-center">Chargement…</p> : partners.length === 0 ? (
            <div className="card text-center py-8 flex flex-col items-center gap-2"><MytaIllustration name="vide" size={56} /><p className="text-sm font-bold t-text">Aucun partenaire pour l'instant.</p></div>
          ) : partners.map(p => (
            <div key={p.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold t-text truncate">{p.full_name || p.email}</p>
                  <p className="text-xs t-muted truncate">{p.email}</p>
                  {p.partner_note && <p className="text-xs t-muted mt-0.5 italic truncate">{p.partner_note}</p>}
                </div>
                <span className={`text-[11px] font-extrabold rounded-full px-2.5 py-1 flex-shrink-0 ${p.active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  {p.active ? `jusqu'au ${fmt(p.access_until)}` : 'inactif'}
                </span>
              </div>
              {/* ── Activation + usage (comptages seulement) ── */}
              {p.activity && (
                <div className="rounded-2xl bg-raised p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className={`w-2 h-2 rounded-full ${p.activity.activated ? (p.activity.days7 > 0 ? 'bg-green-500' : 'bg-amber-400') : 'bg-red-400'}`} />
                    {p.activity.activated
                      ? <span className="t-text">Compte activé · dernière connexion {ago(p.activity.lastSignIn)}{p.activity.lastDay ? ` · app ouverte ${ago(p.activity.lastDay)}` : ''}</span>
                      : <span className="text-red-600">Jamais connecté — e-mail envoyé le {fmt(p.partner_since)}</span>}
                  </div>
                  {p.activity.activated && (
                    <>
                      <div className="flex items-center gap-3 text-[11px] t-muted">
                        <span><b className="t-text">{p.activity.days7}</b>/7 j actifs</span>
                        <span><b className="t-text">{p.activity.days30}</b>/30 j actifs</span>
                        {p.activity.lastMeal && <span>dernier repas {ago(p.activity.lastMeal)}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          ['Repas', p.activity.meals30, 'bg-green-50 text-green-700'],
                          ['Séances', p.activity.sessions30, 'bg-sport-light text-tta-mid'],
                          ['Nuits', p.activity.sleeps30, 'bg-violet-50 text-violet-700'],
                          ['Jeux', p.activity.games30, 'bg-orange-50 text-orange-700'],
                          ['Recettes', p.activity.recipes, 'bg-amber-50 text-amber-700'],
                        ].map(([l, n, cls]) => (
                          <span key={l as string} className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${n ? cls : 'bg-white t-faint'}`}>{l} {n as number}</span>
                        ))}
                        <span className="text-[10px] t-faint self-center">30 derniers jours</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {p.codes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.codes.map(c => (
                    <button key={c.code} onClick={() => copy(c.code)} className={`text-[11px] font-mono font-bold rounded-full px-2.5 py-1 border ${c.active ? 'bg-tta-light text-tta-mid border-tta-mid/30' : 'bg-zinc-100 text-zinc-400 border-transparent line-through'}`}>
                      {c.code} · {c.redemptions}{c.max_uses ? `/${c.max_uses}` : ''}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => patchPartner(p.id, 'extend', 30)} className="btn-ghost text-xs px-3 py-1.5 bg-raised">+30 j</button>
                <button onClick={() => patchPartner(p.id, 'extend', 90)} className="btn-ghost text-xs px-3 py-1.5 bg-raised">+90 j</button>
                <button onClick={() => createCode(p.id)} className="btn-ghost text-xs px-3 py-1.5 bg-raised">+ code {cDays} j</button>
                <button onClick={() => patchPartner(p.id, 'resend')} className="btn-ghost text-xs px-3 py-1.5 bg-raised">Renvoyer l'accès</button>
                {p.active && <button onClick={() => { if (confirm(`Révoquer l'accès de ${p.email} et désactiver ses codes ?`)) patchPartner(p.id, 'revoke') }} className="btn-ghost text-xs px-3 py-1.5 text-red-500">Révoquer</button>}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'codes' && (
        <>
          <div className="card flex flex-col gap-3">
            <p className="text-sm font-extrabold t-text">Nouveau code</p>
            <select value={cPartner} onChange={e => setCPartner(e.target.value)} className="input">
              <option value="">Sans partenaire (code MYTA)</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input value={cCode} onChange={e => setCCode(e.target.value.toUpperCase())} placeholder="Code (vide = généré)" className="input font-mono" />
              <select value={cDays} onChange={e => setCDays(Number(e.target.value))} className="input">
                {[7, 14, 30, 60, 90, 180, 365].map(d => <option key={d} value={d}>{d} jours offerts</option>)}
              </select>
              <input value={cMax} onChange={e => setCMax(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Max utilisations (vide = ∞)" className="input" />
              <input type="date" value={cExp} onChange={e => setCExp(e.target.value)} className="input" />
            </div>
            <input value={cNote} onChange={e => setCNote(e.target.value)} placeholder="Note (campagne, story, vidéo…)" className="input" />
            <label className="flex items-center gap-2 text-sm t-text">
              <input type="checkbox" checked={cNotify} onChange={e => setCNotify(e.target.checked)} className="w-4 h-4 accent-[#4B47A0]" />
              Envoyer le code au partenaire par e-mail
            </label>
            <button onClick={() => createCode()} disabled={cBusy} className="btn-primary justify-center disabled:opacity-50">{cBusy ? 'Création…' : 'Créer le code'}</button>
          </div>

          {loading ? <p className="text-xs t-muted text-center">Chargement…</p> : codes.length === 0 ? (
            <div className="card text-center py-8 flex flex-col items-center gap-2"><MytaIllustration name="vide" size={56} /><p className="text-sm font-bold t-text">Aucun code pour l'instant.</p></div>
          ) : codes.map(c => (
            <div key={c.code} className={`card flex flex-col gap-2 ${c.active ? '' : 'opacity-60'}`}>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => copy(c.code)} className="font-mono text-base font-extrabold tracking-wider text-tta-mid">{c.code}</button>
                <span className="text-[11px] font-extrabold bg-raised rounded-full px-2.5 py-1 t-muted">{c.days} j offerts</span>
              </div>
              <p className="text-xs t-muted">
                {c.partner_name ? `Partenaire : ${c.partner_name}` : 'Code MYTA'} · {c.redemptions} utilisation{c.redemptions > 1 ? 's' : ''}{c.max_uses ? ` / ${c.max_uses}` : ''}
                {c.expires_at ? ` · jusqu'au ${fmt(c.expires_at)}` : ''}{c.note ? ` · ${c.note}` : ''}
              </p>
              <div className="flex gap-1.5">
                {c.partner_user_id && <button onClick={() => patchCode(c.code, 'send')} className="btn-ghost text-xs px-3 py-1.5 bg-raised">Envoyer au partenaire</button>}
                <button onClick={() => patchCode(c.code, 'toggle')} className={`btn-ghost text-xs px-3 py-1.5 ${c.active ? 'text-red-500' : 'text-green-600'}`}>{c.active ? 'Désactiver' : 'Réactiver'}</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'stats' && <AdminStats headers={headers} />}
    </div>
  )
}
