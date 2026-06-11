'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { isPremium } from '@/lib/plan-utils'

interface Props {
  children:    React.ReactNode
  /** 'lock' = visible mais grisé + cadenas  |  'hide' = complètement caché */
  mode?:       'lock' | 'hide'
  /** Label affiché sur le cadenas (défaut: "Fonctionnalité Premium") */
  label?:      string
}

/**
 * Enveloppe une feature Premium.
 * - Pour les utilisateurs Premium : rendu normal.
 * - Pour les utilisateurs Essentiel :
 *   - mode "hide"  → rien n'est affiché
 *   - mode "lock"  → contenu grisé avec overlay cadenas + bouton upgrade
 *
 * Le plan est lu depuis localStorage (myta_plan), mis à jour par la Navbar au chargement.
 * La restriction réelle est toujours validée côté serveur (API, ai-guard).
 */
export function PremiumGate({ children, mode = 'lock', label = 'Fonctionnalité Premium' }: Props) {
  const router = useRouter()
  const [isUserPremium, setIsUserPremium] = useState<boolean | null>(null)

  useEffect(() => {
    const plan = localStorage.getItem('myta_plan')
    setIsUserPremium(isPremium(plan))
  }, [])

  // Pas encore chargé → on laisse passer (évite le flash)
  if (isUserPremium === null) return <>{children}</>

  // Utilisateur Premium → rendu normal
  if (isUserPremium) return <>{children}</>

  // Utilisateur Essentiel
  if (mode === 'hide') return null

  // mode === 'lock' — overlay cadenas
  return (
    <div className="relative select-none">
      {/* Contenu grisé */}
      <div className="opacity-40 pointer-events-none blur-[1px]" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 px-4">
        <div className="flex flex-col items-center gap-2 bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg border border-zinc-100 max-w-xs w-full text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
            <Lock size={20} className="text-white" />
          </div>
          <p className="text-sm font-extrabold text-zinc-900">{label}</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Disponible avec l'abonnement <span className="font-bold text-[#4B47A0]">Premium</span>.
          </p>
          <button
            onClick={() => router.push('/pricing?change=true')}
            className="w-full py-2.5 rounded-2xl text-white text-xs font-bold mt-1"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}
          >
            Passer Premium →
          </button>
        </div>
      </div>
    </div>
  )
}
