'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CreditCard, LogOut, Mail } from 'lucide-react'

export default function PaymentFailedPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function openPortal() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const res  = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Erreur : ' + (data.error ?? 'Impossible d\'ouvrir le portail'))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(160deg, #fff7ed 0%, #fef3c7 50%, #fff7ed 100%)' }}>

      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Logo */}
        <div className="flex justify-center">
          <img src="/logo_my_twin_app.png" alt="MYTA" className="h-10 object-contain" />
        </div>

        {/* Carte d'alerte */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-100">

          {/* Header orange */}
          <div className="px-6 py-6 text-center"
            style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
            <div className="text-4xl mb-2">⚠️</div>
            <h1 className="text-white font-extrabold text-xl">Paiement échoué</h1>
            <p className="text-white/85 text-sm mt-1">Ton accès MYTA est suspendu</p>
          </div>

          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm text-zinc-600 leading-relaxed text-center">
              Nous n'avons pas pu encaisser ton paiement.
              Mets à jour ta carte bancaire pour rétablir ton accès immédiatement.
            </p>

            {/* Info encadrée */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm text-orange-800">
              <p className="font-semibold mb-1">Ce que tu perds temporairement :</p>
              <ul className="text-xs text-orange-700 space-y-0.5 list-disc list-inside">
                <li>Journal alimentaire</li>
                <li>Suivi sport & Tabata</li>
                <li>Coach IA Waty</li>
                <li>Amis & Challenges</li>
              </ul>
            </div>

            {/* CTA principal */}
            <button
              onClick={openPortal}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold text-base shadow-md transition-all active:scale-[0.98] disabled:opacity-70"
              style={{ background: 'linear-gradient(90deg, #ea580c, #f97316)' }}>
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : <><CreditCard size={17} />Mettre à jour ma carte</>}
            </button>

            <p className="text-center text-xs text-zinc-400">
              Géré de manière sécurisée par Stripe 🔒
            </p>
          </div>
        </div>

        {/* Actions secondaires */}
        <div className="flex flex-col gap-2">
          <a href="mailto:contact@mytwinapp.fr"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-zinc-200 bg-white text-zinc-600 text-sm font-semibold hover:bg-zinc-50 transition-all">
            <Mail size={15} />
            Contacter le support
          </a>
          <button onClick={signOut}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-zinc-400 text-sm hover:text-zinc-600 transition-colors">
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
