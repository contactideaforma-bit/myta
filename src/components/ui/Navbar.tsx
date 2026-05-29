'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Layers, LayoutDashboard,
  BookOpen, Calculator, ChefHat, Lightbulb,
  Dumbbell, Timer, History, User,
  LogOut, AlertTriangle, Menu, X,
  ChevronRight, Sun, Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ui/ThemeProvider'
import type { Module } from '@/types'

const NAV_NUTRI = [
  { href: '/nutrition/journal',    label: 'Journal',     icon: BookOpen,   desc: 'Suivi alimentaire du jour',  color: 'text-pink-500',   bg: 'bg-pink-50'   },
  { href: '/nutrition/calculator', label: 'Calculateur', icon: Calculator, desc: 'IMC, TDEE & macros',         color: 'text-orange-500', bg: 'bg-orange-50' },
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

export function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => { setSidebarOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const activeModule: Module = pathname.startsWith('/nutrition') ? 'nutrition' : 'sport'
  const navItems = activeModule === 'nutrition' ? NAV_NUTRI : NAV_SPORT
  const isNutri  = activeModule === 'nutrition'

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

      {/* ── Header coloré ── */}
      <header className={cn(
        'sticky top-0 z-50 border-b',
        isNutri
          ? 'bg-gradient-to-r from-pink-400 to-rose-400 border-pink-300'
          : 'bg-gradient-to-r from-tta-mid to-sport border-sport'
      )}>
        <div className="px-4 h-14 flex items-center justify-between">

          {/* Burger */}
          <button onClick={() => setSidebarOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 transition-colors text-white">
            <Menu size={20} />
          </button>

          {/* Logo centré */}
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <div className="w-8 h-8 bg-white/25 rounded-xl flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">MYTA</span>
          </button>

          {/* Switch module — pills colorées */}
          <div className="flex items-center bg-white/20 rounded-2xl p-0.5 gap-0.5">
            <button
              onClick={() => router.push('/nutrition/journal')}
              className={cn(
                'w-9 h-8 rounded-xl flex items-center justify-center text-base transition-all',
                isNutri ? 'bg-white shadow-sm' : 'hover:bg-white/20'
              )}>
              🥗
            </button>
            <button
              onClick={() => router.push('/sport/session')}
              className={cn(
                'w-9 h-8 rounded-xl flex items-center justify-center text-base transition-all',
                !isNutri ? 'bg-white shadow-sm' : 'hover:bg-white/20'
              )}>
              🏋️
            </button>
          </div>
        </div>
      </header>

      {/* ── Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar fun ── */}
      <aside className={cn(
        'fixed top-0 left-0 z-[56] h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Header sidebar coloré */}
        <div className={cn(
          'px-5 py-5 flex items-center justify-between',
          isNutri
            ? 'bg-gradient-to-r from-pink-400 to-rose-400'
            : 'bg-gradient-to-r from-tta-mid to-sport'
        )}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/25 rounded-xl flex items-center justify-center">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-white">MYTA</p>
              <p className="text-[10px] text-white/70">My Twin App</p>
            </div>
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
              onClick={() => { router.push('/nutrition/journal'); setSidebarOpen(false) }}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                isNutri ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-sm' : 'text-zinc-400'
              )}>
              🥗 Nutrition
            </button>
            <button
              onClick={() => { router.push('/sport/session'); setSidebarOpen(false) }}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                !isNutri ? 'bg-gradient-to-r from-tta-mid to-sport text-white shadow-sm' : 'text-zinc-400'
              )}>
              🏋️ Sport
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
              isNutri ? 'text-pink-400' : 'text-sport')}>
              {isNutri ? '🥗 Nutrition' : '🏋️ Sport'}
            </p>
          </div>

          {/* Items module */}
          {navItems.map(({ href, label, icon: Icon, desc, color, bg }) => {
            const active = pathname === href
            return (
              <button key={href} onClick={() => handleNavClick(href)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all',
                  active
                    ? isNutri ? 'bg-nutri-light' : 'bg-sport-light'
                    : 'hover:bg-zinc-50 text-zinc-600'
                )}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', active ? bg : 'bg-zinc-100')}>
                  <Icon size={16} className={active ? color : 'text-zinc-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold', active ? (isNutri ? 'text-nutri-dark' : 'text-sport-dark') : 'text-zinc-700')}>
                    {label}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">{desc}</p>
                </div>
                {active && <ChevronRight size={14} className={isNutri ? 'text-nutri-mid' : 'text-sport'} />}
              </button>
            )
          })}

          {/* Profil */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300">Mon compte</p>
          </div>
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
              <p className="text-sm font-bold text-zinc-700">Profil & Bilan</p>
              <p className="text-[10px] text-zinc-400">Objectifs & statistiques</p>
            </div>
          </button>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-zinc-100 flex flex-col gap-2">
          {/* Dark mode toggle */}
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left hover:bg-zinc-50 transition-all">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
              {theme === 'dark'
                ? <Sun size={15} className="text-amber-400" />
                : <Moon size={15} className="text-zinc-500" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-700">
                {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </p>
            </div>
            <div className={cn('w-10 h-5 rounded-full relative transition-colors', theme === 'dark' ? 'bg-tta-mid' : 'bg-zinc-300')}>
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', theme === 'dark' ? 'left-5' : 'left-0.5')} />
            </div>
          </button>

          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left hover:bg-red-50 hover:text-red-500 transition-all text-zinc-500">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
              <LogOut size={15} />
            </div>
            <p className="text-sm font-bold">Déconnexion</p>
          </button>
        </div>
      </aside>
    </>
  )
}
