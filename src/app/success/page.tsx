'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Waty } from '@/components/ui/Waty'

function SuccessContent() {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function activate() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // Récupérer le prénom
      const { data: profile } = await supabase
        .from('profiles').select('full_name, subscription_status').eq('id', user.id).single()

      setUserName(profile?.full_name?.split(' ')[0] ?? '')

      // Si le webhook n'a pas encore mis à jour le statut, on force trialing
      if (!['trialing', 'active'].includes(profile?.subscription_status ?? '')) {
        await supabase.from('profiles').upsert(
          { id: user.id, subscription_status: 'trialing' },
          { onConflict: 'id' }
        )
      }
      setLoading(false)
    }
    activate()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>
      <Loader2 size={32} className="animate-spin text-tta-mid" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">

        {/* Icône succès */}
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={44} className="text-green-500" />
        </div>

        {/* Titre */}
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">
            Bienvenue{userName ? `, ${userName}` : ''} ! 🎉
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Ton essai gratuit de 3 jours commence maintenant.
            Aucun débit pendant cette période.
          </p>
        </div>

        {/* Waty */}
        <Waty
          mode="nutrition"
          message="Super, tu fais partie de la famille MYTA ! Je suis Waty, ton coach digital personnel. Commence par remplir ton profil pour que je puisse personnaliser tes objectifs 🎯"
          size="lg"
          dismissible={false}
        />

        {/* Récap */}
        <div className="w-full bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex flex-col gap-3 text-left">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Ce qui t'attend</p>
          {[
            { icon: '🥗', label: 'Journal alimentaire avec IA' },
            { icon: '🏋️', label: 'Suivi sportif complet' },
            { icon: '😴', label: 'Analyse du sommeil' },
            { icon: '📊', label: 'Bilan santé hebdomadaire' },
            { icon: '🍽️', label: 'Recettes IA personnalisées' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 text-sm text-zinc-700">
              <span className="text-base">{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}
        >
          Configurer mon profil <ArrowRight size={16} />
        </button>

        <button onClick={() => router.push('/dashboard')}
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
          Aller au dashboard →
        </button>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
