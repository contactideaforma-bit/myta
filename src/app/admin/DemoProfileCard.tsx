'use client'
/**
 * Profil de démonstration (captures d'écran, bilan partageable) : Léa, 34 ans,
 * post-partum + allaitement, maladie inflammatoire ; 7 jours de données fictives.
 */
import { useState } from 'react'
import { MytaIllustration } from '@/components/ui/MytaIllustration'

export function DemoProfileCard({ headers, toast }: { headers: () => Promise<Record<string, string>>; toast: (m: string) => void }) {
  const [busy, setBusy] = useState<'' | 'create' | 'delete'>('')
  const [creds, setCreds] = useState<{ email: string; password: string; meals: number; nights: number; sessions: number } | null>(null)

  async function create() {
    setBusy('create')
    const res = await fetch('/api/admin/demo', { method: 'POST', headers: await headers() })
    const d = await res.json()
    setBusy('')
    if (!res.ok) { toast(d.error ?? 'Erreur'); return }
    setCreds(d)
  }
  async function remove() {
    if (!confirm('Supprimer le compte de démo et toutes ses données ?')) return
    setBusy('delete')
    const res = await fetch('/api/admin/demo', { method: 'DELETE', headers: await headers() })
    setBusy('')
    if (!res.ok) { toast('Suppression impossible'); return }
    setCreds(null); toast('Compte de démo supprimé')
  }
  async function copy(t: string) { try { await navigator.clipboard.writeText(t); toast('Copié') } catch { /* noop */ } }

  return (
    <div className="card flex flex-col gap-3 mt-2">
      <div className="flex items-center gap-3">
        <MytaIllustration name="waty" size={44} />
        <div>
          <p className="text-sm font-extrabold t-text">Profil de démo pour captures d'écran</p>
          <p className="text-[11px] t-muted">Léa, 34 ans, post-partum et allaitement, maladie inflammatoire chronique. 7 jours de repas, 2 séances, nuits trop courtes, pesées. Données fictives, remises à zéro à chaque création.</p>
        </div>
      </div>
      {creds ? (
        <div className="bg-raised rounded-2xl px-3 py-2.5 flex flex-col gap-1.5">
          <p className="text-[11px] font-bold t-muted uppercase tracking-wide">Connexion dans l'app</p>
          <button onClick={() => copy(creds.email)} className="text-sm font-bold t-text text-left">{creds.email}</button>
          <button onClick={() => copy(creds.password)} className="text-base font-mono font-extrabold tracking-wider text-tta-mid text-left">{creds.password}</button>
          <p className="text-[11px] t-faint">{creds.meals} aliments notés · {creds.nights} nuits · {creds.sessions} séances. Déconnecte-toi, connecte-toi avec ce compte, ouvre Bilan → Générer le bilan.</p>
        </div>
      ) : null}
      <div className="flex gap-2">
        <button onClick={create} disabled={busy !== ''} className="btn-primary flex-1 justify-center disabled:opacity-50">{busy === 'create' ? 'Création…' : creds ? 'Remettre à zéro' : 'Créer le profil de démo'}</button>
        <button onClick={remove} disabled={busy !== ''} className="btn-ghost text-red-500 px-3 disabled:opacity-50">{busy === 'delete' ? '…' : 'Supprimer'}</button>
      </div>
    </div>
  )
}
