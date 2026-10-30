'use client'
/** Cloche Collabs : nouveaux abonnés, essais démarrés… (table admin_notifications). */
import { useEffect, useState } from 'react'
import { MytaIcon } from '@/components/ui/MytaIcon'

interface Item { id: string; type: string; title: string; body: string | null; meta: any; created_at: string; read_at: string | null }
const fmt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const TONE: Record<string, string> = { new_subscriber: 'bg-green-100 text-green-700', trial_started: 'bg-amber-100 text-amber-700', churn: 'bg-red-100 text-red-600', info: 'bg-raised t-muted' }

export function AdminBell({ headers }: { headers: () => Promise<Record<string, string>> }) {
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/notifications', { headers: await headers() })
    if (res.ok) { const d = await res.json(); setItems(d.items ?? []); setUnread(d.unread ?? 0) }
  }
  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id) }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) { await fetch('/api/admin/notifications', { method: 'PATCH', headers: await headers() }); setUnread(0) }
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="icon-btn relative" aria-label="Notifications">
        <MytaIcon name="bell" size={20} />
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(92vw,360px)] card p-2 shadow-xl max-h-[60vh] overflow-y-auto">
          <p className="text-[11px] font-bold t-muted uppercase tracking-wide px-2 py-1">Notifications</p>
          {items.length === 0 ? <p className="text-sm t-muted px-2 py-4 text-center">Rien pour l'instant. Le premier abonné apparaîtra ici.</p> : items.map(n => (
            <div key={n.id} className={`rounded-2xl px-3 py-2 ${n.read_at ? '' : 'bg-raised'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-extrabold rounded-full px-2 py-0.5 ${TONE[n.type] ?? TONE.info}`}>{n.type === 'new_subscriber' ? 'Abonné' : n.type === 'trial_started' ? 'Essai' : n.type}</span>
                <span className="text-[10px] t-faint">{fmt(n.created_at)}</span>
              </div>
              <p className="text-sm font-bold t-text mt-1">{n.title}</p>
              {n.body && <p className="text-xs t-muted leading-snug">{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
