'use client'

/**
 * Barre d'onglets du bas : Accueil · Journal · (+) · Sport · Sommeil.
 * Le « + » central ouvre une feuille d'actions rapides (repas, séance, nuit,
 * recette). Respecte env(safe-area-inset-bottom). Rendue par la Navbar, donc
 * présente sur tous les écrans de l'app connectée.
 */

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MytaIcon, type MytaIconName } from './MytaIcon'
import { MytaIllustration, type MytaIllustrationName } from './MytaIllustration'
import { getActiveProfile } from '@/lib/active-profile'

const TABS: { href: string; label: string; icon: MytaIconName; match: (p: string) => boolean }[] = [
  { href: '/dashboard',         label: 'Accueil', icon: 'home',    match: p => p === '/dashboard' },
  { href: '/nutrition/journal', label: 'Journal', icon: 'journal', match: p => p.startsWith('/nutrition') },
  { href: '/sport/session',     label: 'Sport',   icon: 'sport',   match: p => p.startsWith('/sport') },
  { href: '/sleep',             label: 'Sommeil', icon: 'sleep',   match: p => p.startsWith('/sleep') },
]

interface Action { href: string; title: string; sub: string; icon: MytaIconName; art: MytaIllustrationName }

const ACTIONS: Action[] = [
  { href: '/nutrition/journal',        title: 'Un repas',             sub: 'Photo · vocal · recherche',     icon: 'journal', art: 'repas'   },
  { href: '/sport/session',            title: 'Une séance',           sub: 'Vocal ou minuteur Tabata',      icon: 'sport',   art: 'seance'  },
  { href: '/sleep',                    title: 'Ma nuit',              sub: 'Coucher · réveil · qualité',    icon: 'sleep',   art: 'nuit'    },
  { href: '/nutrition/recipes/import', title: 'Importer une recette', sub: 'Lien Instagram, TikTok, photo', icon: 'recipe',  art: 'recette' },
]

export function TabBar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)
  const [isChild, setIsChild] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => { try { setIsChild(getActiveProfile().isChild) } catch { /* profil non chargé */ } }, [pathname])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  function go(href: string) {
    // Protection « séance en cours » posée par /sport/session
    if (pathname === '/sport/session' && (window as any).__sessionActive === true && !href.startsWith('/sport/session')) {
      if (!confirm('Une séance est en cours. Quitter quand même ?')) return
    }
    setOpen(false)
    router.push(href)
  }

  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* ── Feuille d'actions rapides ── */}
      {open && (
        <div className="fixed inset-0 z-[58]" aria-modal="true" role="dialog" aria-label="Ajouter">
          <button aria-label="Fermer" onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#15152A]/45 backdrop-blur-[2px] animate-myta-fadein" />
          <div className="absolute left-0 right-0 bottom-0 bg-[var(--card)] rounded-t-[32px] px-4 pt-3 shadow-[0_-20px_50px_rgba(21,21,42,0.25)] animate-myta-sheet"
            style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 12px)' }}>
            <div className="w-10 h-1.5 rounded-full bg-zinc-300/70 mx-auto mb-3" />
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-xl font-extrabold tracking-tight text-zinc-900">Ajouter</p>
              <p className="text-xs font-bold text-zinc-400 capitalize">{date} · {time}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ACTIONS.filter(a => !isChild || a.icon === 'journal').map(a => (
                <button key={a.href} onClick={() => go(a.href)}
                  className="bg-raised rounded-[22px] p-4 text-left flex flex-col gap-2 active:scale-[0.97] transition-transform">
                  <MytaIllustration name={a.art} size={44} />
                  <span>
                    <span className="block text-[15px] font-extrabold text-zinc-900 leading-tight">{a.title}</span>
                    <span className="block text-xs font-semibold text-zinc-500 mt-0.5">{a.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Barre ── */}
      <nav className="tabbar" aria-label="Navigation principale">
        <div className="h-14 grid grid-cols-5 items-center px-2">
          {TABS.slice(0, 2).map(t => <Tab key={t.href} t={t} active={t.match(pathname)} onClick={() => go(t.href)} />)}
          <div className="flex items-center justify-center">
            <button onClick={() => setOpen(v => !v)} aria-label={open ? 'Fermer le menu' : 'Ajouter'} aria-expanded={open}
              className={`w-[54px] h-[54px] -mt-7 rounded-full text-white flex items-center justify-center transition-all active:scale-95 ${
                open ? 'bg-[#15152A] shadow-[0_10px_24px_rgba(21,21,42,0.35)] rotate-45' : 'bg-gradient-to-br from-nutri to-nutri-mid shadow-[0_10px_24px_rgba(34,197,94,0.4)]'
              }`}>
              <MytaIcon name="plus" size={26} />
            </button>
          </div>
          {TABS.slice(2).map(t => <Tab key={t.href} t={t} active={t.match(pathname)} onClick={() => go(t.href)} />)}
        </div>
        <div className="tabbar-safe" />
      </nav>
    </>
  )
}

function Tab({ t, active, onClick }: { t: typeof TABS[number]; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-0.5 py-1 text-[10px] transition-colors ${active ? 'text-tta-mid font-extrabold' : 'text-zinc-400 font-bold'}`}>
      <span className={`transition-transform ${active ? 'scale-100' : 'scale-95'}`}>
        <MytaIcon name={t.icon} size={22} outline={!active} />
      </span>
      {t.label}
    </button>
  )
}
