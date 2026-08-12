'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'
import {
  LayoutDashboard,
  BookOpen, ChefHat, Lightbulb,
  Dumbbell, Timer, History, User,
  LogOut, AlertTriangle, Menu, X,
  ChevronRight, Sun, Moon, MessageSquareWarning, Send, CheckCircle,
  HelpCircle, Users, Settings, ArrowLeft, Gamepad2, Eye,
  Bug, BarChart3, CreditCard, PenLine, Salad,
} from 'lucide-react'
import { ProfileSwitcher } from './ProfileSwitcher'
import { logActivityToday } from '@/lib/games'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ui/ThemeProvider'
import type { Module } from '@/types'

/**
 * Couleur de marque unique pour tout le chrome de l'app.
 * Règle : la barre ne change JAMAIS de couleur selon la page — c'est la même
 * identité partout, exactement comme sur mytwinapp.fr. Le repère de section est
 * porté par un liseré fin sous l'en-tête (ACCENT), pas par un repeinturlurage
 * complet, qui donnait l'impression de trois applis différentes.
 */
const BRAND_BAR = 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)'

/** Accent de section : la couleur ne décore pas, elle indique où l'on est. */
const ACCENT: Record<'dashboard' | 'nutrition' | 'sport', string> = {
  dashboard: '#7BCB8E',   // vert MYTA — vue d'ensemble
  nutrition: '#22C55E',   // vert nutrition
  sport:     '#A78BFA',   // violet sport
}

const NAV_NUTRI = [
  { href: '/nutrition/journal',    label: 'Journal',     icon: BookOpen,   desc: 'Suivi alimentaire du jour',  color: 'text-green-600',  bg: 'bg-green-50'  },
  { href: '/nutrition/recipes',    label: 'Recettes',    icon: ChefHat,    desc: 'Recettes IA en français',    color: 'text-green-500',  bg: 'bg-green-50'  },
  { href: '/nutrition/advice',     label: 'Conseils',    icon: Lightbulb,  desc: 'Nutrition & bien-être',      color: 'text-yellow-500', bg: 'bg-yellow-50' },
]

const NAV_SPORT = [
  { href: '/sport/session',  label: 'Séance',     icon: Dumbbell, desc: 'Logger un entraînement', color: 'text-purple-500', bg: 'bg-purple-50' },
  { href: '/sport/tabata',   label: 'Tabata',     icon: Timer,    desc: 'Timer HIIT configurable', color: 'text-red-500',    bg: 'bg-red-50'    },
  { href: '/sport/history',  label: 'Historique', icon: History,  desc: 'Mes séances passées',     color: 'text-blue-500',   bg: 'bg-blue-50'   },
]

function QuitModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={22} className="text-amber-500" />
          </div>
          <div>
            <p className="font-extrabold text-zinc-900">Séance en cours</p>
            <p className="text-xs text-zinc-400 mt-0.5">Voulez-vous vraiment quitter ?</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Si vous quittez maintenant, votre séance sera perdue et le chrono s'arrêtera.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border-2 border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
            Continuer
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl bg-red-400 text-white text-sm font-bold hover:bg-red-500">
            Quitter
          </button>
        </div>
      </div>
    </div>
  )
}

const REPORT_CATEGORIES = [
  { value: 'Bug technique',        Icon: Bug },
  { value: 'Erreur de données',    Icon: BarChart3 },
  { value: 'Problème de paiement', Icon: CreditCard },
  { value: 'Suggestion',           Icon: Lightbulb },
  { value: 'Autre',                Icon: PenLine },
]

export function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [sidebarModule, setSidebarModule] = useState<Module>('nutrition')
  const [hasUnread, setHasUnread]     = useState(false)

  // ── Plan & profil actif ──
  const [userPlan,      setUserPlan]      = useState<string | null>(null)
  const [viewingAsId,   setViewingAsId]   = useState<string | null>(null)
  const [viewingAsName, setViewingAsName] = useState<string | null>(null)

  // ── Modal signalement ──
  const [showReport, setShowReport]         = useState(false)
  const [reportCategory, setReportCategory] = useState('Bug technique')
  const [reportMessage, setReportMessage]   = useState('')
  const [reportSending, setReportSending]   = useState(false)
  const [reportSent, setReportSent]         = useState(false)
  const [reportError, setReportError]       = useState(false)

  async function sendReport() {
    if (!reportMessage.trim()) return
    setReportSending(true)
    setReportError(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          email:    session?.user?.email,
          category: reportCategory,
          message:  reportMessage.trim(),
        }),
      })
      if (!res.ok) {
        setReportError(true)
      } else {
        setReportSent(true)
        setTimeout(() => {
          setShowReport(false)
          setReportSent(false)
          setReportMessage('')
          setReportCategory('Bug technique')
        }, 2500)
      }
    } catch (err) {
      console.error(err)
      setReportError(true)
    }
    setReportSending(false)
  }

  useEffect(() => { setSidebarOpen(false) }, [pathname])
  useEffect(() => { if (sidebarOpen) setSidebarModule(activeModule) }, [sidebarOpen])
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  // Effacer le badge quand on visite /friends
  useEffect(() => {
    if (pathname === '/friends') setHasUnread(false)
  }, [pathname])

  // Charger le plan et le profil actif
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      const selfId = data.user.id

      // Mini-jeux Waty : compter le jour d'utilisation (1×/jour, guard localStorage)
      logActivityToday(selfId)

      // Lire le profil actif depuis localStorage
      const storedId   = localStorage.getItem('myta_viewing_as_id')
      const storedName = localStorage.getItem('myta_viewing_as_name')
      if (storedId && storedId !== selfId) {
        setViewingAsId(storedId)
        setViewingAsName(storedName)
      }

      // Charger le plan Supabase
      supabase
        .from('profiles')
        .select('plan')
        .eq('id', selfId)
        .single()
        .then(({ data: profile }) => {
          const plan = profile?.plan ?? null
          setUserPlan(plan)
          if (plan) localStorage.setItem('myta_plan', plan)
        })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Vérifier les messages non-lus au montage (fetch groupes depuis DB)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      try {
        // Récupérer les groupes depuis la DB (plus fiable que localStorage)
        const { data: memberRows } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', data.user.id)

        const groupIds = (memberRows ?? []).map((r: any) => r.group_id as string)
        if (!groupIds.length) return

        // Un groupe est "non lu" tant que ses messages n'ont pas été VUS
        // (marqueur de lecture par groupe, posé à l'ouverture du panneau messages)
        for (const groupId of groupIds) {
          const perGroupRead = parseInt(localStorage.getItem(`myta_group_last_read_${groupId}`) || '0')
          const cutoffMs = perGroupRead || (Date.now() - 7 * 24 * 3600 * 1000)
          const { count } = await supabase
            .from('group_messages')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .gt('created_at', new Date(cutoffMs).toISOString())
            .neq('user_id', data.user.id)
          if ((count ?? 0) > 0) { setHasUnread(true); break }
        }
      } catch {}
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isDashboard  = pathname === '/dashboard'
  const activeModule: Module = pathname.startsWith('/sport') ? 'sport' : 'nutrition'
  const navItems = activeModule === 'nutrition' ? NAV_NUTRI : NAV_SPORT
  const isNutri  = activeModule === 'nutrition'
  const sidebarNavItems = sidebarModule === 'nutrition' ? NAV_NUTRI : NAV_SPORT
  const sidebarIsNutri  = sidebarModule === 'nutrition'

  function handleNavClick(href: string) {
    if (pathname === '/sport/session' && href !== '/sport/session') {
      const active = typeof window !== 'undefined' ? (window as any).__sessionActive : false
      if (active === true) {
        setPendingHref(href); setShowModal(true); setSidebarOpen(false); return
      }
    }
    router.push(href)
  }

  function confirmQuit() {
    setShowModal(false)
    if (pendingHref) router.push(pendingHref)
  }

  async function signOut() {
    setSidebarOpen(false)
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <>
      {showModal && <QuitModal onConfirm={confirmQuit} onCancel={() => setShowModal(false)} />}

      {/* ── Modal Signalement ── */}
      {showReport && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowReport(false) }}>
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-tta-mid to-sport px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquareWarning size={18} className="text-white" />
                <p className="font-extrabold text-white">Signaler un problème</p>
              </div>
              <button onClick={() => setShowReport(false)}
                className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
                <X size={14} />
              </button>
            </div>

            {reportSent ? (
              <div className="flex flex-col items-center gap-3 py-8 px-5">
                <CheckCircle size={48} className="text-nutri-mid" />
                <p className="font-extrabold text-zinc-900 text-center">Merci pour ton retour !</p>
                <p className="text-sm text-zinc-400 text-center">On traite ton signalement dans les plus brefs délais.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 px-5 pb-5">
                {/* Message d'erreur */}
                {reportError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-600 font-medium">Une erreur s'est produite. Réessaie ou contacte-nous à contact@mytwinapp.fr</p>
                  </div>
                )}

                {/* Catégorie */}
                <div>
                  <p className="text-xs font-bold text-zinc-500 mb-2">Catégorie</p>
                  <div className="flex flex-wrap gap-2">
                    {REPORT_CATEGORIES.map(cat => (
                      <button key={cat.value}
                        onClick={() => setReportCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          reportCategory === cat.value
                            ? 'bg-tta-mid text-white border-tta-mid'
                            : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        } inline-flex items-center gap-1.5`}>
                        <cat.Icon size={12} /> {cat.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-xs font-bold text-zinc-500 mb-2">Décris le problème</p>
                  <textarea
                    value={reportMessage}
                    onChange={e => setReportMessage(e.target.value)}
                    placeholder="Ex: Quand j'ajoute un aliment, l'app se bloque..."
                    rows={4}
                    className="w-full border-2 border-zinc-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-tta-mid transition-colors"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">{reportMessage.length}/500 caractères</p>
                </div>

                {/* Bouton envoi */}
                <button onClick={sendReport}
                  disabled={!reportMessage.trim() || reportSending}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-bold text-sm transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                  {reportSending
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi…</>
                    : <><Send size={15} />Envoyer le signalement</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header coloré ── */}
      <header
        className="sticky top-0 z-50"
        style={{ background: BRAND_BAR }}
      >
        <div className="px-4 h-14 flex items-center justify-between">

          {/* Burger */}
          <button onClick={() => setSidebarOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 transition-colors text-white">
            <Menu size={20} />
          </button>

          {/* Logo */}
          <button onClick={() => router.push('/dashboard')} className="ml-2" aria-label="Tableau de bord">
            <Logo size="sm" tone="light" baseline={false} />
          </button>

          <div className="flex-1" />

          {/* Switch profil (couple/famille) ou rien */}
          <ProfileSwitcher plan={userPlan} />
        </div>

        {/* Liseré de section — remplace l'ancien changement de couleur de barre */}
        <div className="h-[3px] w-full" style={{
          background: ACCENT[isDashboard ? 'dashboard' : activeModule],
        }} />
      </header>

      {/* ── Banner "Vous consultez le profil de…" ── */}
      {viewingAsId && viewingAsName && (
        <div className="sticky top-14 z-40 flex items-center justify-between gap-2 px-4 py-2 text-xs font-bold text-white"
          style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b)' }}>
          <span className="flex items-center gap-1.5"><Eye size={13} /> Profil de {viewingAsName.split(' ')[0]}</span>
          <button
            onClick={() => {
              localStorage.removeItem('myta_viewing_as_id')
              localStorage.removeItem('myta_viewing_as_name')
              window.location.reload()
            }}
            className="flex items-center gap-1 underline underline-offset-2 hover:no-underline">
            <ArrowLeft size={11} />Retour à mon profil
          </button>
        </div>
      )}

      {/* ── Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        'fixed top-0 left-0 z-[56] h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Header sidebar coloré */}
        <div
          className={cn(
            'px-5 py-5 flex items-center justify-between',

          )}
          style={{ background: BRAND_BAR }}
        >
          <div className="flex items-center">
            {/* Pas de pastille blanche : le logo est lisible nativement sur la
                barre de marque. L'ancienne pastille existait pour rattraper un
                PNG violet illisible sur fond coloré. */}
            <Logo size="md" tone="light" />
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30">
            <X size={16} />
          </button>
        </div>

        {/* Switch module sidebar */}
        <div className="px-4 py-3 border-b border-zinc-100">
          <div className="flex bg-zinc-100 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setSidebarModule('nutrition')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                sidebarIsNutri ? 'bg-gradient-to-r from-nutri to-nutri-mid text-white shadow-sm' : 'text-zinc-400'
              )}>
              <Salad size={14} /> Nutrition
            </button>
            <button
              onClick={() => setSidebarModule('sport')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                !sidebarIsNutri ? 'bg-gradient-to-r from-tta-mid to-sport text-white shadow-sm' : 'text-zinc-400'
              )}>
              <Dumbbell size={14} /> Sport
            </button>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">

          {/* Dashboard */}
          <button onClick={() => handleNavClick('/dashboard')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all',
              pathname === '/dashboard'
                ? 'bg-tta-light text-tta-mid'
                : 'hover:bg-zinc-50 text-zinc-600'
            )}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
              pathname === '/dashboard' ? 'bg-tta-mid/20' : 'bg-zinc-100')}>
              <LayoutDashboard size={16} className={pathname === '/dashboard' ? 'text-tta-mid' : 'text-zinc-400'} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Dashboard</p>
              <p className="text-[10px] text-zinc-400">Vue d'ensemble</p>
            </div>
            {pathname === '/dashboard' && <ChevronRight size={14} className="text-tta-mid" />}
          </button>

          {/* Label module */}
          <div className="px-3 pt-3 pb-1">
            <p className={cn('text-[10px] font-extrabold uppercase tracking-widest',
              sidebarIsNutri ? 'text-nutri-mid' : 'text-sport')}>
              {sidebarIsNutri
                ? <><Salad size={13} /> Nutrition</>
                : <><Dumbbell size={13} /> Sport</>}
            </p>
          </div>

          {/* Items module */}
          {sidebarNavItems.map(({ href, label, icon: Icon, desc, color, bg }) => {
            const active = pathname === href
            return (
              <button key={href} onClick={() => handleNavClick(href)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all',
                  active
                    ? sidebarIsNutri ? 'bg-nutri-light' : 'bg-sport-light'
                    : 'hover:bg-zinc-50 text-zinc-600'
                )}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', active ? bg : 'bg-zinc-100')}>
                  <Icon size={16} className={active ? color : 'text-zinc-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold', active ? (sidebarIsNutri ? 'text-nutri-dark' : 'text-sport-dark') : 'text-zinc-700')}>
                    {label}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">{desc}</p>
                </div>
                {active && <ChevronRight size={14} className={sidebarIsNutri ? 'text-nutri-mid' : 'text-sport'} />}
              </button>
            )
          })}

          {/* Amis & Challenges */}
          <button onClick={() => handleNavClick('/friends')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all',
              pathname === '/friends' ? 'bg-tta-light' : 'hover:bg-zinc-50 text-zinc-600'
            )}>
            <div className="relative">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
                pathname === '/friends' ? 'bg-tta-mid/20' : 'bg-purple-50')}>
                <Users size={16} className={pathname === '/friends' ? 'text-tta-mid' : 'text-purple-400'} />
              </div>
              {hasUnread && pathname !== '/friends' && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-700">Amis & Challenges</p>
              <p className="text-[10px] text-zinc-400">Défis & Sauver Waty</p>
            </div>
            {pathname === '/friends' && <ChevronRight size={14} className="text-tta-mid" />}
          </button>

          {/* Mini-jeux Waty */}
          <button onClick={() => handleNavClick('/games')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all',
              pathname.startsWith('/games') ? 'bg-tta-light' : 'hover:bg-zinc-50 text-zinc-600'
            )}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
              pathname.startsWith('/games') ? 'bg-tta-mid/20' : 'bg-amber-50')}>
              <Gamepad2 size={16} className={pathname.startsWith('/games') ? 'text-tta-mid' : 'text-amber-500'} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-700">Mini-jeux Waty</p>
              <p className="text-[10px] text-zinc-400">À débloquer en utilisant l'app</p>
            </div>
            {pathname.startsWith('/games') && <ChevronRight size={14} className="text-tta-mid" />}
          </button>

          {/* Profil */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300">Profil</p>
          </div>
          {/* Bilan et Profil sont deux destinations distinctes : consulter ses
              chiffres et modifier ses informations sont deux intentions
              différentes, elles ne partagent plus la même entrée. */}
          <button onClick={() => handleNavClick('/bilan')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all',
              pathname === '/bilan' ? 'bg-tta-light' : 'hover:bg-zinc-50 text-zinc-600'
            )}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
              pathname === '/bilan' ? 'bg-tta-mid/20' : 'bg-zinc-100')}>
              <BarChart3 size={16} className={pathname === '/bilan' ? 'text-tta-mid' : 'text-zinc-400'} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-700">Bilan</p>
              <p className="text-[10px] text-zinc-400">Statistiques & calculateurs</p>
            </div>
          </button>

          <button onClick={() => handleNavClick('/profile')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all',
              pathname === '/profile' ? 'bg-tta-light' : 'hover:bg-zinc-50 text-zinc-600'
            )}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
              pathname === '/profile' ? 'bg-tta-mid/20' : 'bg-zinc-100')}>
              <User size={16} className={pathname === '/profile' ? 'text-tta-mid' : 'text-zinc-400'} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-700">Profil</p>
              <p className="text-[10px] text-zinc-400">Tes informations & objectifs</p>
            </div>
          </button>

          <button onClick={() => handleNavClick('/sleep')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all',
              pathname === '/sleep' ? 'bg-tta-light' : 'hover:bg-zinc-50 text-zinc-600'
            )}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
              pathname === '/sleep' ? 'bg-tta-mid/20' : 'bg-zinc-100')}>
              <Moon size={16} className={pathname === '/sleep' ? 'text-tta-mid' : 'text-zinc-400'} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-700">Sommeil</p>
              <p className="text-[10px] text-zinc-400">Suivi de tes nuits</p>
            </div>
          </button>
        </nav>

        {/* Footer compact */}
        <div className="px-4 py-3 border-t border-zinc-100 flex flex-col gap-2">

          {/* Ligne 1 mini : Guide · FAQ · Mon compte */}
          <div className="flex items-center justify-center gap-3 py-1">
            <button onClick={() => { router.push('/guide'); setSidebarOpen(false) }}
              className="flex items-center gap-1 text-zinc-400 hover:text-tta-mid transition-colors">
              <HelpCircle size={12} />
              <span className="text-[11px] font-semibold">Guide</span>
            </button>
            <span className="text-zinc-200 text-xs">·</span>
            <button onClick={() => { router.push('/faq'); setSidebarOpen(false) }}
              className={cn(
                'flex items-center gap-1 transition-colors',
                pathname === '/faq' ? 'text-tta-mid' : 'text-zinc-400 hover:text-tta-mid'
              )}>
              <HelpCircle size={12} />
              <span className="text-[11px] font-semibold">FAQ</span>
            </button>
            <span className="text-zinc-200 text-xs">·</span>
            <button onClick={() => { router.push('/account'); setSidebarOpen(false) }}
              className={cn(
                'flex items-center gap-1 transition-colors',
                pathname === '/account' ? 'text-tta-mid' : 'text-zinc-400 hover:text-tta-mid'
              )}>
              <Settings size={12} />
              <span className="text-[11px] font-semibold">Mon compte</span>
            </button>
          </div>

          {/* Ligne 2 : Mode sombre + Signaler + Déconnexion */}
          <div className="flex items-center gap-1">
            <button onClick={toggle}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl hover:bg-zinc-50 transition-all text-zinc-500">
              {theme === 'dark'
                ? <Sun size={14} className="text-amber-400" />
                : <Moon size={14} className="text-zinc-400" />}
              <span className="text-xs font-semibold text-zinc-500">{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
            </button>

            <div className="w-px h-5 bg-zinc-100" />

            <button onClick={() => { setShowReport(true); setSidebarOpen(false) }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl hover:bg-zinc-50 transition-all text-zinc-400 hover:text-amber-500">
              <MessageSquareWarning size={14} />
              <span className="text-xs font-semibold">Signaler</span>
            </button>

            <div className="w-px h-5 bg-zinc-100" />

            <button onClick={signOut}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl hover:bg-red-50 transition-all text-zinc-400 hover:text-red-500">
              <LogOut size={14} />
              <span className="text-xs font-semibold">Sortir</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
