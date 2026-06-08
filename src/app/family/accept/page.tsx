'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function AcceptContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''
  const supabase     = createClient()

  const [status, setStatus] = useState<'loading' | 'needs_auth' | 'accepting' | 'ok' | 'error'>('loading')
  const [errMsg, setErrMsg]  = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setErrMsg('Lien invalide ou expiré.'); return }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setStatus('needs_auth')
      else          accept(session.access_token)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function accept(accessToken: string) {
    setStatus('accepting')
    try {
      const res = await fetch('/api/family/accept', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ token }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('ok')
        setTimeout(() => router.push('/dashboard'), 2500)
      } else {
        setStatus('error')
        setErrMsg(data.error ?? 'Erreur lors de l\'acceptation.')
      }
    } catch {
      setStatus('error')
      setErrMsg('Erreur réseau — réessaie.')
    }
  }

  // ─── Pas connecté → rediriger vers auth avec retour ───────────────────────
  if (status === 'needs_auth') {
    return (
      <div className="text-center flex flex-col items-center gap-4 py-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4B47A0, #2BA8B0)' }}>
          <Users size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-extrabold text-zinc-900">Invitation MYTA</h1>
        <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
          Connecte-toi ou crée un compte MYTA pour rejoindre la famille.
        </p>
        <button
          onClick={() => router.push(`/auth?redirect=/family/accept?token=${token}`)}
          className="px-6 py-3 rounded-2xl text-white text-sm font-bold"
          style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
          Se connecter / Créer un compte
        </button>
      </div>
    )
  }

  if (status === 'loading' || status === 'accepting') {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 size={32} className="animate-spin text-[#4B47A0]" />
        <p className="text-sm text-zinc-400">
          {status === 'accepting' ? 'Liaison du compte en cours…' : 'Vérification…'}
        </p>
      </div>
    )
  }

  if (status === 'ok') {
    return (
      <div className="text-center flex flex-col items-center gap-4 py-10">
        <CheckCircle size={52} className="text-green-500" />
        <h1 className="text-xl font-extrabold text-zinc-900">Bienvenue dans la famille ! 🎉</h1>
        <p className="text-sm text-zinc-500">Redirection vers ton tableau de bord…</p>
      </div>
    )
  }

  return (
    <div className="text-center flex flex-col items-center gap-4 py-10">
      <XCircle size={52} className="text-red-400" />
      <h1 className="text-xl font-extrabold text-zinc-900">Lien invalide</h1>
      <p className="text-sm text-zinc-500 max-w-xs">{errMsg}</p>
      <button
        onClick={() => router.push('/dashboard')}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
        Aller à l'accueil
      </button>
    </div>
  )
}

export default function FamilyAcceptPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 60%, #f0fdf4 100%)' }}>
      <div className="w-full max-w-sm">
        <Suspense fallback={
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#4B47A0]" />
          </div>
        }>
          <AcceptContent />
        </Suspense>
      </div>
    </div>
  )
}
