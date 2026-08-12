'use client'

/**
 * GameShell — conteneur plein écran immersif pour les mini-jeux Waty.
 * Recouvre la Navbar (z-60), bloque le scroll du body, gère les safe-area iOS
 * et expose la hauteur réelle du viewport (dvh + fallback visualViewport).
 */

import { useEffect, useRef, useState } from 'react'

export function GameShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [h, setH] = useState<number | undefined>(undefined)

  useEffect(() => {
    const body = document.body
    const prevOverflow = body.style.overflow
    const prevOverscroll = body.style.overscrollBehavior
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'

    // iOS : 100dvh n'est pas fiable dans la WebView Capacitor → visualViewport.
    const sync = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight
      setH(vh)
    }
    sync()
    window.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('resize', sync)

    return () => {
      body.style.overflow = prevOverflow
      body.style.overscrollBehavior = prevOverscroll
      window.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('resize', sync)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[60] bg-black overflow-hidden touch-none select-none"
      style={{ height: h ? `${h}px` : '100dvh' }}
    >
      {children}
    </div>
  )
}

/** Padding safe-area, à appliquer sur les barres du haut / du bas. */
export const safeTop    = { paddingTop:    'max(env(safe-area-inset-top), 10px)' }
export const safeBottom = { paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }
