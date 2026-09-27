'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, BellOff, Check, Loader2, UtensilsCrossed, Droplets, Dumbbell,
  Moon, Flame, Scale, BarChart3, RotateCcw, Send, Smartphone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isIosApp } from '@/lib/app-platform'
import {
  WATER_INTERVALS, WEEKDAYS, waterTargetL, waterTimes,
  type ReminderPrefs, type Weekday, type HHMM,
} from '@/lib/reminders'

/**
 * Réglages des rappels push (page Mon compte).
 * Le service worker dédié /push-sw.js est enregistré avec le scope "/push/" :
 * il ne met rien en cache et ne contrôle aucune page (cf. public/sw.js).
 */

const SW_URL   = '/push-sw.js'
const SW_SCOPE = '/push/'

type DeviceState = 'loading' | 'unsupported' | 'ios-app' | 'off' | 'on' | 'denied'

const GOAL_LABEL: Record<string, string> = {
  'perte de poids': 'perte de poids',
  'prise de masse': 'prise de masse',
  endurance:        'endurance',
  'forme generale': 'forme générale',
  performance:      'performance',
}

export function NotificationSettings() {
  const [supabase] = useState(() => createClient())

  const [device, setDevice]     = useState<DeviceState>('loading')
  const [prefs, setPrefs]       = useState<ReminderPrefs | null>(null)
  const [defaults, setDefaults] = useState<ReminderPrefs | null>(null)
  const [goal, setGoal]         = useState<string | null>(null)
  const [weight, setWeight]     = useState<number | null>(null)
  const [condition, setCondition] = useState<string | null>(null)
  const [dirty, setDirty]       = useState(false)
  const [busy, setBusy]         = useState<null | 'enable' | 'disable' | 'save' | 'test'>(null)
  const [msg, setMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const timezone = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
    : 'Europe/Paris'

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`
    return h
  }, [supabase])

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  // ── Chargement : état de l'appareil + réglages enregistrés ──────────────
  const load = useCallback(async () => {
    // État de l'appareil
    if (isIosApp()) {
      setDevice('ios-app')
    } else if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setDevice('unsupported')
    } else if (Notification.permission === 'denied') {
      setDevice('denied')
    } else {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE)
      const sub = await reg?.pushManager.getSubscription()
      setDevice(sub && Notification.permission === 'granted' ? 'on' : 'off')
    }

    // Réglages
    try {
      const res = await fetch('/api/notifications', { headers: await authHeaders() })
      if (res.ok) {
        const j = await res.json()
        setPrefs(j.prefs)
        setDefaults(j.defaults)
        setGoal(j.profile?.goal ?? null)
        setWeight(j.profile?.weight_kg ?? null)
        setCondition(j.profile?.condition ?? null)
        setDirty(false)
      }
    } catch { /* réseau : on affiche au moins l'état appareil */ }
  }, [authHeaders])

  useEffect(() => { load() }, [load])

  // ── Activer sur cet appareil ─────────────────────────────────────────────
  async function enable() {
    setBusy('enable')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setDevice(perm === 'denied' ? 'denied' : 'off')
        setBusy(null)
        return
      }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('Clé VAPID manquante')

      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
      await waitActive(reg)
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      })

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'subscribe', subscription: sub.toJSON(), timezone }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur')
      setDevice('on')
      await load()
      flash('ok', 'Rappels activés sur cet appareil.')
    } catch (err: any) {
      console.error('[rappels]', err)
      flash('err', "Impossible d'activer les rappels sur cet appareil.")
    }
    setBusy(null)
  }

  // ── Désactiver sur cet appareil ──────────────────────────────────────────
  async function disable() {
    setBusy('disable')
    try {
      await fetch('/api/notifications', {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action: 'unsubscribe' }),
      })
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE)
      const sub = await reg?.pushManager.getSubscription()
      await sub?.unsubscribe()
      setDevice('off')
    } catch (err) { console.error(err) }
    setBusy(null)
  }

  // ── Enregistrer les réglages ─────────────────────────────────────────────
  async function save() {
    if (!prefs) return
    setBusy('save')
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'save-prefs', prefs, timezone }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setPrefs(j.prefs)
      setDirty(false)
      flash('ok', 'Rappels enregistrés.')
    } catch {
      flash('err', "L'enregistrement a échoué, réessaie.")
    }
    setBusy(null)
  }

  async function test() {
    setBusy('test')
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action: 'test' }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (res.status === 410) setDevice('off')
        throw new Error(j.error)
      }
      flash('ok', 'Notification de test envoyée.')
    } catch (err: any) {
      flash('err', err?.message || "Le test n'a pas pu être envoyé.")
    }
    setBusy(null)
  }

  // ── Mise à jour locale des réglages ──────────────────────────────────────
  function update<K extends keyof ReminderPrefs>(key: K, value: ReminderPrefs[K]) {
    setPrefs(p => (p ? { ...p, [key]: value } : p))
    setDirty(true)
  }
  function resetToGoal() {
    if (!defaults) return
    setPrefs(defaults)
    setDirty(true)
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-tta-mid" />
        <h2 className="text-sm font-bold text-zinc-900">Rappels & notifications</h2>
      </div>

      <DeviceBlock state={device} busy={busy} onEnable={enable} onDisable={disable} onTest={test} />

      {prefs && device !== 'ios-app' && device !== 'unsupported' && (
        <>
          <Toggle
            label="Recevoir mes rappels"
            hint="Coupe tous les rappels d'un coup, sans perdre tes réglages."
            checked={prefs.enabled}
            onChange={v => update('enabled', v)}
          />

          <div className={`flex flex-col gap-3 transition-opacity ${prefs.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            {/* Repas */}
            <Row icon={<UtensilsCrossed size={15} />} color="text-nutri-mid" bg="bg-nutri-light"
              title="Noter mes repas" hint="Pas de rappel si le repas est déjà noté."
              on={prefs.meals.on} onToggle={v => update('meals', { ...prefs.meals, on: v })}>
              <div className="grid grid-cols-3 gap-2">
                <MealTime label="Petit-déj" value={prefs.meals.breakfast}
                  onChange={v => update('meals', { ...prefs.meals, breakfast: v })} />
                <MealTime label="Déjeuner" value={prefs.meals.lunch}
                  onChange={v => update('meals', { ...prefs.meals, lunch: v })} />
                <MealTime label="Dîner" value={prefs.meals.dinner}
                  onChange={v => update('meals', { ...prefs.meals, dinner: v })} />
              </div>
            </Row>

            {/* Eau */}
            <Row icon={<Droplets size={15} />} color="text-sky-600" bg="bg-sky-50"
              title="Boire de l'eau"
              hint={`Objectif indicatif : ${waterTargetL({ weight_kg: weight, condition }).toFixed(1).replace('.', ',')} L/jour${weight ? ' (selon ton poids)' : ''}.`}
              on={prefs.water.on} onToggle={v => update('water', { ...prefs.water, on: v })}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                <span>De</span>
                <TimeInput value={prefs.water.start} onChange={v => update('water', { ...prefs.water, start: v })} />
                <span>à</span>
                <TimeInput value={prefs.water.end} onChange={v => update('water', { ...prefs.water, end: v })} />
                <span>toutes les</span>
                <select
                  value={prefs.water.everyMin}
                  onChange={e => update('water', { ...prefs.water, everyMin: Number(e.target.value) })}
                  className="border-2 border-zinc-200 rounded-xl px-2 py-1 text-xs bg-white">
                  {WATER_INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-zinc-400">
                {waterTimes(prefs.water).length} rappel{waterTimes(prefs.water).length > 1 ? 's' : ''} par jour.
              </p>
            </Row>

            {/* Sport */}
            <Row icon={<Dumbbell size={15} />} color="text-sport-mid" bg="bg-sport-light"
              title="Séance de sport" hint="Pas de rappel si ta séance du jour est déjà enregistrée."
              on={prefs.sport.on} onToggle={v => update('sport', { ...prefs.sport, on: v })}>
              <div className="flex flex-wrap items-center gap-2">
                <TimeInput value={prefs.sport.time} onChange={v => update('sport', { ...prefs.sport, time: v })} />
                <Days value={prefs.sport.days} onChange={d => update('sport', { ...prefs.sport, days: d })} />
              </div>
            </Row>

            {/* Sommeil */}
            <Row icon={<Moon size={15} />} color="text-indigo-600" bg="bg-indigo-50"
              title="Préparer le coucher" hint="Un rappel doux pour ralentir avant de dormir."
              on={prefs.sleep.on} onToggle={v => update('sleep', { ...prefs.sleep, on: v })}>
              <TimeInput value={prefs.sleep.time} onChange={v => update('sleep', { ...prefs.sleep, time: v })} />
            </Row>

            {/* Série */}
            <Row icon={<Flame size={15} />} color="text-orange-500" bg="bg-orange-50"
              title="Protéger ma série" hint="Seulement si rien n'a été noté dans la journée."
              on={prefs.streak.on} onToggle={v => update('streak', { ...prefs.streak, on: v })}>
              <TimeInput value={prefs.streak.time} onChange={v => update('streak', { ...prefs.streak, time: v })} />
            </Row>

            {/* Pesée */}
            <Row icon={<Scale size={15} />} color="text-zinc-600" bg="bg-zinc-100"
              title="Pesée" hint="Facultatif. Une fois par semaine suffit pour suivre la tendance."
              on={prefs.weigh.on} onToggle={v => update('weigh', { ...prefs.weigh, on: v })}>
              <div className="flex flex-wrap items-center gap-2">
                <TimeInput value={prefs.weigh.time} onChange={v => update('weigh', { ...prefs.weigh, time: v })} />
                <Days value={prefs.weigh.days} onChange={d => update('weigh', { ...prefs.weigh, days: d })} />
              </div>
            </Row>

            {/* Bilan */}
            <Row icon={<BarChart3 size={15} />} color="text-tta-mid" bg="bg-tta-light"
              title="Bilan de la semaine" hint="Le dimanche à 10 h."
              on={prefs.weekly.on} onToggle={v => update('weekly', { on: v })} />
          </div>

          {defaults && (
            <button onClick={resetToGoal}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-tta-mid">
              <RotateCcw size={12} />
              Réglages conseillés {goal && GOAL_LABEL[goal] ? `pour ton objectif « ${GOAL_LABEL[goal]} »` : 'pour ton profil'}
            </button>
          )}

          <button onClick={save} disabled={!dirty || busy === 'save'}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
            {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {dirty ? 'Enregistrer mes rappels' : 'Rappels enregistrés'}
          </button>
        </>
      )}

      {msg && (
        <p className={`text-xs text-center font-medium ${msg.type === 'ok' ? 'text-nutri-mid' : 'text-red-500'}`}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function DeviceBlock({ state, busy, onEnable, onDisable, onTest }: {
  state: DeviceState
  busy: string | null
  onEnable: () => void
  onDisable: () => void
  onTest: () => void
}) {
  if (state === 'loading') {
    return <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-zinc-300" /></div>
  }
  if (state === 'ios-app') {
    return (
      <div className="border border-zinc-900 rounded-2xl p-3 text-xs text-zinc-600 flex gap-2">
        <Smartphone size={14} className="flex-shrink-0 mt-0.5 text-zinc-500" />
        Les rappels ne sont pas encore disponibles dans l'app iPhone. Ils fonctionnent sur Android et sur mytwinapp.fr.
      </div>
    )
  }
  if (state === 'unsupported') {
    return (
      <div className="border border-zinc-900 rounded-2xl p-3 text-xs text-zinc-600">
        Ce navigateur ne permet pas les notifications. Sur iPhone, ajoute d'abord mytwinapp.fr à ton écran d'accueil.
      </div>
    )
  }
  if (state === 'denied') {
    return (
      <div className="border border-zinc-900 rounded-2xl p-3 text-xs text-zinc-600">
        Les notifications sont bloquées pour MYTA. Autorise-les dans les réglages de ton téléphone
        (Paramètres → Applications → MYTA → Notifications), puis reviens ici.
      </div>
    )
  }
  if (state === 'on') {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-nutri-mid flex items-center gap-1.5">
          <Check size={13} />Actifs sur cet appareil
        </span>
        <div className="flex gap-1.5">
          <button onClick={onTest} disabled={!!busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-medium">
            {busy === 'test' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}Tester
          </button>
          <button onClick={onDisable} disabled={!!busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-500 text-xs font-medium hover:bg-red-50 hover:text-red-500 transition-colors">
            {busy === 'disable' ? <Loader2 size={12} className="animate-spin" /> : <BellOff size={12} />}Couper
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500">
        Waty t'envoie des rappels aux heures que tu choisis, adaptés à ton objectif.
      </p>
      <button onClick={onEnable} disabled={!!busy}
        className="flex items-center justify-center gap-2 py-2.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.98]"
        style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
        {busy === 'enable' ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
        Activer les rappels sur ce téléphone
      </button>
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-zinc-800">{label}</span>
        {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#4B47A0]' : 'bg-zinc-200'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

function Row({ icon, color, bg, title, hint, on, onToggle, children }: {
  icon: React.ReactNode; color: string; bg: string; title: string; hint?: string
  on: boolean; onToggle: (v: boolean) => void; children?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-100 p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${color}`}>{icon}</span>
        <span className="flex-1 flex flex-col">
          <span className="text-sm font-semibold text-zinc-800">{title}</span>
          {hint && <span className="text-[11px] text-zinc-400 leading-snug">{hint}</span>}
        </span>
        <Switch checked={on} onChange={onToggle} />
      </div>
      {on && children && <div className="flex flex-col gap-1.5 pl-11">{children}</div>}
    </div>
  )
}

function TimeInput({ value, onChange }: { value: HHMM; onChange: (v: HHMM) => void }) {
  return (
    <input type="time" step={900} value={value}
      onChange={e => e.target.value && onChange(e.target.value.slice(0, 5))}
      className="border-2 border-zinc-200 rounded-xl px-2 py-1 text-xs bg-white text-zinc-800 focus:outline-none focus:border-tta-mid" />
  )
}

function MealTime({ label, value, onChange }: {
  label: string; value: HHMM | null; onChange: (v: HHMM | null) => void
}) {
  const active = value !== null
  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => onChange(active ? null : '12:00')}
        className={`text-[11px] font-semibold text-left ${active ? 'text-zinc-700' : 'text-zinc-300 line-through'}`}>
        {label}
      </button>
      {active
        ? <TimeInput value={value!} onChange={onChange} />
        : <span className="text-[11px] text-zinc-300 py-1">aucun</span>}
    </div>
  )
}

function Days({ value, onChange }: { value: Weekday[]; onChange: (d: Weekday[]) => void }) {
  return (
    <div className="flex gap-1">
      {WEEKDAYS.map(d => {
        const on = value.includes(d.value)
        return (
          <button key={d.value} type="button" title={d.label}
            onClick={() => onChange(on ? value.filter(v => v !== d.value) : [...value, d.value].sort() as Weekday[])}
            className={`w-7 h-7 rounded-full text-[11px] font-bold transition-colors ${on ? 'bg-[#4B47A0] text-white' : 'bg-zinc-100 text-zinc-400'}`}>
            {d.short}
          </button>
        )
      })}
    </div>
  )
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/** Attend que le service worker soit actif (nécessaire avant pushManager.subscribe) */
function waitActive(reg: ServiceWorkerRegistration): Promise<void> {
  if (reg.active) return Promise.resolve()
  const sw = reg.installing || reg.waiting
  if (!sw) return Promise.resolve()
  return new Promise(resolve => {
    sw.addEventListener('statechange', () => { if (sw.state === 'activated') resolve() })
    setTimeout(resolve, 5000)
  })
}

/** Clé VAPID base64url → Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
