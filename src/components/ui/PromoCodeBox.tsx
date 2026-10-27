'use client'

/** « J'ai un code » — utilise un code promo (jours de Premium offerts). */
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MytaIcon } from '@/components/ui/MytaIcon'

export function PromoCodeBox({ initialCode = '', onSuccess }: { initialCode?: string; onSuccess?: () => void }) {
  const supabase = createClient()
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg]   = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { if (initialCode) setCode(initialCode) }, [initialCode])

  async function redeem() {
    if (!code.trim()) return
    setBusy(true); setMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ code }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg({ ok: false, text: d.error ?? 'Code refusé.' }); return }
      const until = d.until ? new Date(d.until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      setMsg({ ok: true, text: `${d.days} jours de Premium ajoutés${until ? ` · accès jusqu'au ${until}` : ''}.` })
      try { localStorage.setItem('myta_plan', 'premium') } catch { /* noop */ }
      onSuccess?.()
    } catch { setMsg({ ok: false, text: 'Erreur réseau, réessaie.' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && redeem()}
          placeholder="Ton code" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
          className="input flex-1 font-mono font-bold tracking-wider uppercase" />
        <button onClick={redeem} disabled={busy || !code.trim()} className="btn-nutri px-4 disabled:opacity-50">
          {busy ? '…' : <><MytaIcon name="check" size={14} />Valider</>}
        </button>
      </div>
      {msg && <p className={`text-xs font-semibold ${msg.ok ? 'text-green-700' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  )
}
