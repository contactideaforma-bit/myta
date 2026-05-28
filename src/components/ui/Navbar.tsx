'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Layers, LayoutDashboard,
  BookOpen, Calculator, ChefHat, Lightbulb,
  Dumbbell, Timer, History, User,
  LogOut, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { Module } from '@/types'

const NAV_NUTRI = [
  { href: '/nutrition/journal',     label: 'Journal',     icon: BookOpen },
  { href: '/nutrition/calculator',  label: 'Calculateur', icon: Calculator },
  { href: '/nutrition/recipes',     label: 'Recettes',    icon: ChefHat },
  { href: '/nutrition/advice',      label: 'Conseils',    icon: Lightbulb },
]

const NAV_SPORT = [
  { href: '/sport/session',  label: 'Séance',      icon: Dumbbell },
  { href: '/sport/tabata',   label: 'Tabata',       icon: Timer },
  { href: '/sport/history',  label: 'Historique',   icon: History },
]

function QuitModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
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
            Continuer la séance
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
  const [showModal, setShowModal]     = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Détecte le module actif
  const activeModule: Module = pathname.startsWith('/nutrition') ? 'nutrition' : 'sport'
  const navItems = activeModule === 'nutrition' ? NAV_NUTRI : NAV_SPORT

  function handleNavClick(href: string) {
    if (pathname === '/sport/session' && href !== '/sport/session') {
      const active = typeof window !== 'undefined' ? (window as any).__sessionActive : false
      if (active === true) {
        setPendingHref(href)
        setShowModal(true)
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
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-zinc-200/80">
      {showModal && <QuitModal onConfirm={confirmQuit} onCancel={() => setShowModal(false)} />}

      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo + module switcher */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-tta rounded-lg flex items-center justify-center">
              <Layers size={14} className="text-tta-accent" />
            </div>
            <span className="font-bold text-sm tracking-tight">MYTA</span>
          </button>

          {/* Module switcher pill */}
          <div className="flex items-center bg-zinc-100 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => router.push('/nutrition/journal')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                activeModule === 'nutrition'
                  ? 'bg-white text-nutri shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              🥦 Nutrition
            </button>
            <button
              onClick={() => router.push('/sport/session')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                activeModule === 'sport'
                  ? 'bg-white text-tta-mid shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              )}
            >
              🏋️ Sport
            </button>
          </div>
        </div>

        {/* Navigation du module actif */}
        <nav className="flex items-center gap-0.5 flex-1 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              pathname === '/dashboard'
                ? 'bg-zinc-100 text-zinc-900 font-medium'
                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <LayoutDashboard size={14} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          {navItems.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              onClick={() => handleNavClick(href)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                pathname === href
                  ? 'bg-zinc-100 text-zinc-900 font-medium'
                  : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50'
              )}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}

          <button
            onClick={() => router.push('/profile')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              pathname === '/profile'
                ? 'bg-zinc-100 text-zinc-900 font-medium'
                : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <User size={14} />
            <span className="hidden sm:inline">Profil</span>
          </button>
        </nav>

        {/* Déconnexion */}
        <button onClick={signOut} className="btn-ghost text-zinc-400 hover:text-zinc-700 px-2">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
