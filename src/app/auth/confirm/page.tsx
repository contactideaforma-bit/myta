'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hasActiveAccess } from '@/lib/access'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ConfirmPage() {
  const [status,   setStatus]   = useState<'loading' | 'success'>('loading')
  const [userName, setUserName] = useState('')
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    // Écoute les changements d'auth (Supabase injecte les tokens via le hash de l'URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const name = session?.user?.user_metadata?.full_name?.split(' ')[0] ?? ''
        setUserName(name)
        setStatus('success')
      }
    })

    // Fallback : session déjà active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const name = session.user.user_metadata?.full_name?.split(' ')[0] ?? ''
        setUserName(name)
        setStatus('success')
      } else {
        // Sécurité : afficher la page après 4s même sans session (lien expiré, etc.)
        timeout = setTimeout(() => setStatus('success'), 4000)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleContinue() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, trial_ends_at, onboarding_step')
      .eq('id', session.user.id)
      .single()

    // Nouveau compte (tuto pas terminé) → tuto d'introduction, même en essai gratuit
    if (profile?.onboarding_step && profile.onboarding_step !== 'done') {
      router.push('/onboarding')
      return
    }

    const hasAccess = hasActiveAccess(profile?.subscription_status, profile?.trial_ends_at)
    router.push(hasAccess ? '/dashboard' : '/onboarding')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12 page-gradient"
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <img
          src="/logo_my_twin_app.png"
          alt="My Twin App"
          className="w-52 object-contain drop-shadow-sm"
        />

        {status === 'loading' ? (
          /* État chargement */
          <div className="bg-white rounded-3xl p-10 shadow-lg border border-zinc-100 w-full flex flex-col items-center gap-4">
            <Loader2 size={36} className="animate-spin text-[#4B47A0]" />
            <p className="text-zinc-500 text-sm">Confirmation de ton compte…</p>
          </div>
        ) : (
          /* État succès */
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-zinc-100 w-full flex flex-col items-center gap-6 text-center">

            {/* Icône succès */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}
            >
              <CheckCircle size={40} className="text-white" />
            </div>

            {/* Titre + sous-titre */}
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                {userName ? `Bienvenue ${userName} ! 🎉` : 'Email confirmé ! 🎉'}
              </h1>
              <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                Ton compte MYTA est activé.<br />
                Ton coach digital personnel t'attend.
              </p>
            </div>

            {/* Aperçu des fonctionnalités */}
            <div className="w-full bg-zinc-50 rounded-2xl p-4 flex flex-col gap-2.5 text-left border border-zinc-100">
              {[
                { e: '🥗', l: 'Journal alimentaire intelligent' },
                { e: '🏋️', l: 'Suivi sport & Timer Tabata' },
                { e: '😴', l: 'Analyse de ton sommeil' },
                { e: '🤖', l: 'Coach IA Waty personnalisé' },
              ].map(f => (
                <div key={f.l} className="flex items-center gap-2.5 text-sm text-zinc-700">
                  <span className="text-base">{f.e}</span>
                  <span className="font-medium">{f.l}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleContinue}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}
            >
              Découvrir l'app <ArrowRight size={16} />
            </button>

          </div>
        )}

        <p className="text-xs text-zinc-400 text-center">
          Un problème ?{' '}
          <a
            href="mailto:contact@mytwinapp.fr"
            className="underline hover:text-zinc-600 transition-colors"
          >
            Contacte-nous
          </a>
        </p>

      </div>
    </div>
  )
}
