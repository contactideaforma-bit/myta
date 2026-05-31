'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function NotificationSettings() {
  const [supported, setSupported]   = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [saving, setSaving]         = useState(false)
  const [status, setStatus]         = useState<'idle'|'success'|'error'>('idle')

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
    setSupported(ok)
    if (ok) setPermission(Notification.permission)
  }, [])

  async function enableNotifications() {
    setSaving(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') { setSaving(false); return }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { console.error('VAPID key manquante'); setSaving(false); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaving(false); return }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, subscription: sub.toJSON(), action: 'subscribe' }),
      })

      if (res.ok) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
        new Notification('MYTA activé ! 🎉', {
          body: 'Tu recevras des rappels pour ton journal, tes séances et ton bilan hebdomadaire.',
          icon: '/icon-192.png',
        })
      }
    } catch (err) {
      console.error(err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
    setSaving(false)
  }

  async function disableNotifications() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, action: 'unsubscribe' }),
        })
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        await sub?.unsubscribe()
      }
      setPermission('default')
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  if (!supported) return null

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bell size={15} className="text-tta-mid" />
        <h3 className="text-sm font-bold text-zinc-900">Rappels & notifications</h3>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs text-zinc-500">
        <p className="flex items-center gap-1">🥗 Journal (midi)</p>
        <p className="flex items-center gap-1">🥗 Journal (19h)</p>
        <p className="flex items-center gap-1">⚖️ Pesée (8h)</p>
        <p className="flex items-center gap-1">📊 Bilan (dimanche)</p>
      </div>

      {permission === 'granted' ? (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-nutri-mid flex items-center gap-1.5">
            <Check size={13} />Notifications actives
          </span>
          <button onClick={disableNotifications} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-500 text-xs font-medium hover:bg-red-50 hover:text-red-500 transition-colors">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <BellOff size={12} />}
            Désactiver
          </button>
        </div>
      ) : permission === 'denied' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          ⚠️ Notifications bloquées dans les paramètres du navigateur.
        </div>
      ) : (
        <>
          <button onClick={enableNotifications} disabled={saving}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
            {saving ? <Loader2 size={14} className="animate-spin" />
              : status === 'success' ? <><Check size={14} />Activé !</>
              : <><Bell size={14} />Activer les notifications</>}
          </button>
          {status === 'error' && (
            <p className="text-xs text-red-500 text-center">Erreur — réessaie depuis un navigateur compatible.</p>
          )}
        </>
      )}
    </div>
  )
}

// Convertit la clé VAPID base64 en Uint8Array pour le navigateur
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
