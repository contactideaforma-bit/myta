'use client'

import { useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'

export default function CancelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">

        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center">
          <XCircle size={44} className="text-zinc-400" />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">Paiement annulé</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Pas de souci, aucun montant n'a été débité.
            Tu peux réessayer quand tu veux.
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm text-left">
          <p className="text-sm font-bold text-zinc-700 mb-2">Des questions ?</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Si tu as rencontré un problème lors du paiement ou si tu as des questions sur l'abonnement,
            contacte-nous à{' '}
            <a href="mailto:contact@mytwinapp.fr" className="text-tta-mid hover:underline">
              contact@mytwinapp.fr
            </a>
          </p>
        </div>

        <button
          onClick={() => router.push('/pricing')}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}
        >
          <RefreshCw size={15} /> Réessayer
        </button>

        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft size={14} /> Retour à l'app
        </button>
      </div>
    </div>
  )
}
