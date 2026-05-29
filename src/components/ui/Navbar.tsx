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
  { href: '/nutrition/journal',    label: 'Journal',     icon: BookOpen,      desc: 'Suivi alimentaire du jour' },
  { href: '/nutrition/calculator', label: 'Calculateur', icon: Calculator,    desc: 'IMC, TDEE & macros' },
  { href: '/nutrition/recipes',    label: 'Recettes',    icon: ChefHat,       desc: 'Recettes IA en français' },
  { href: '/nutrition/advice',     label: 'Conseils',    icon: Lightbulb,     desc: 'Nutrition & bien-être' },
]

const NAV_SPORT = [
  { href: '/sport/session',  label: 'Séance',    icon: Dumbbell, desc: 'Logger un entraînement' },
  { href: '/sport/tabata',   label: 'Tabata',    icon: Timer,    desc: 'Timer HIIT configurable' },
  { href: '/sport/history',  label: 'Historique', icon: History,  desc: 'Mes séances passées' },
]

function QuitModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">Séance en cours</p>
            <p className="text-xs text-zinc-500 mt-0.5">Voulez-vous vraiment quitter ?</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Si vous quittez maintenant, votre séance sera perdue et le chrono s'arrêtera.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Continuer
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600">
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

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Ferme la sidebar au changement de route
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // Bloque le scroll quand sidebar ouverte
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const activeModule: Module = pathname.startsWith('/nutrition') ? 'nutrition' : 'sport'
  const navItems = activeModule === 'nutrition' ? NAV_NUTRI : NAV_SPORT

  function handleNavClick(href: string) {
    if (pathname === '/sport/session' && href !== '/sport/session') {
      const active = typeof window !== 'undefined' ? (window as any).__sessionActive : false
      if (active === true) {
        setPendingHref(href)
        setShowModal(true)
        setSidebarOpen(false)
        return
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

  const { theme, toggle } = useTheme()
  const isNutri = activeModule === 'nutrition'

  return (
    <>
      {showModal && <QuitModal onConfirm={confirmQuit} onCancel={() => setShowModal(false)} />}

      {/* ── Header fixe ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-200/80">
        <div className="px-4 h-14 flex items-center justify-between gap-3">

          {/* Burger */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors text-zinc-600"
            aria-label="Menu">
            <Menu size={20} />
          </button>

          {/* Logo centré */}
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <div className="w-7 h-7 bg-tta rounded-lg flex items-center justify-center">
              <Layers size={14} className="text-tta-accent" />
            </div>
            <span className="font-black text-sm tracking-tight">MYTA</span>
          </button>

          {/* Switch Sport / Nutrition */}
          <div className="flex items-center bg-zinc-100 rounded-xl p-0.5 text-xs font-semibold gap-0.5">
            <button
              onClick={() => router.push('/nutrition/journal')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg transition-all',
                isNutri ? 'bg-white text-nutri-dark shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              )}>
              🥦
            </button>
            <button
              onClick={() => router.push('/sport/session')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg transition-all',
                !isNutri ? 'bg-white text-tta-mid shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              )}>
              🏋️
            </button>
          </div>
        </div>
      </header>

      {/* ── Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar gauche ── */}
      <aside className={cn(
        'fixed top-0 left-0 z-[56] h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header sidebar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-tta rounded-xl flex items-center justify-center">
              <Layers size={16} className="text-tta-accent" />
            </div>
            <div>
              <p className="font-black text-sm text-zinc-900">MYTA</p>
              <p className="text-[10px] text-zinc-400">My Twin App</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>

        {/* Switch module dans sidebar */}
        <div className="px-4 py-3 border-b border-zinc-100">
          <div className="flex bg-zinc-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => { router.push('/nutrition/journal'); setSidebarOpen(false) }}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                isNutri ? 'bg-white text-nutri-dark shadow-sm' : 'text-zinc-400'
              )}>
              🥦 Nutrition
            </button>
            <button
              onClick={() => { router.push('/sport/session'); setSidebarOpen(false) }}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                !isNutri ? 'bg-white text-tta-mid shadow-sm' : 'text-zinc-400'
              )}>
              🏋️ Sport
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">

          {/* Dashboard */}
          <button
            onClick={() => handleNavClick('/dashboard')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
              pathname === '/dashboard'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-50'
            )}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', pathname === '/dashboard' ? 'bg-zinc-200' : 'bg-zinc-100')}>
              <LayoutDashboard size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Dashboard</p>
              <p className="text-[10px] text-zinc-400">Vue d'ensemble</p>
            </div>
            {pathname === '/dashboard' && <ChevronRight size={14} className="text-zinc-400" />}
          </button>

          {/* Séparateur module */}
          <div className="px-3 pt-3 pb-1">
            <p className={cn('text-[10px] font-bold uppercase tracking-widest', isNutri ? 'text-nutri-dark' : 'text-tta-mid')}>
              {isNutri ? '🥦 Nutrition' : '🏋️ Sport'}
            </p>
          </div>

          {/* Items du module */}
          {navItems.map(({ href, label, icon: Icon, desc }) => {
            const active = pathname === href
            return (
              <button key={href}
                onClick={() => handleNavClick(href)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                  active
                    ? isNutri ? 'bg-nutri-light text-nutri-dark' : 'bg-tta-light text-tta-mid'
                    : 'text-zinc-600 hover:bg-zinc-50'
                )}>
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  active
                    ? isNutri ? 'bg-nutri/20' : 'bg-tta-mid/20'
                    : 'bg-zinc-100'
                )}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{desc}</p>
                </div>
                {active && <ChevronRight size={14} className="flex-shrink-0" />}
              </button>
            )
          })}

          {/* Profil */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Mon compte</p>
          </div>
          <button
            onClick={() => handleNavClick('/profile')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
              pathname === '/profile' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'
            )}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', pathname === '/profile' ? 'bg-zinc-200' : 'bg-zinc-100')}>
              <User size={15} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Profil & Bilan</p>
              <p className="text-[10px] text-zinc-400">Objectifs & statistiques</p>
            </div>
          </button>
        </nav>

        {/* Footer sidebar — dark mode + déconnexion */}
        <div className="px-4 py-4 border-t border-zinc-100 flex flex-col gap-2">

          {/* Dark mode toggle */}
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-zinc-600 hover:bg-zinc-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
              {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </p>
              <p className="text-[10px] text-zinc-400">
                {theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              </p>
            </div>
            <div className={cn(
              'w-10 h-5 rounded-full relative transition-colors',
              theme === 'dark' ? 'bg-tta-mid' : 'bg-zinc-300'
            )}>
              <div className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                theme === 'dark' ? 'left-5' : 'left-0.5'
              )} />
            </div>
          </button>

          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
              <LogOut size={15} />
            </div>
            <p className="text-sm font-semibold">Déconnexion</p>
          </button>
        </div>
      </aside>
    </>
  )
}
