'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Gift } from 'lucide-react'

export default function AuthPage() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [name, setName]             = useState('')
  const [referralInput, setReferralInput] = useState('')
  const [mode, setMode]             = useState<'login' | 'register'>('login')

  // Auto-fill referral code from URL ?ref=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) { setReferralInput(ref.toUpperCase()); setMode('register') }
  }, [])
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const [showPass, setShowPass] = useState(false)

  const supabase = createClient()

  // ── Auto-redirect si déjà connecté (gère le token refresh côté client) ────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        const { data: profile } = await supabase
          .from('profiles').select('subscription_status').eq('id', session.user.id).single()
        const hasAccess = ['trialing', 'active', 'vip'].includes(profile?.subscription_status ?? '')
        window.location.href = hasAccess ? '/dashboard' : '/pricing'
      } catch {
        window.location.href = '/dashboard'
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage(error.message || 'Erreur de connexion')
          setLoading(false)
          return
        }
        if (!data?.user) {
          setMessage('Connexion échouée, réessaie.')
          setLoading(false)
          return
        }

        // Vérifier statut abonnement
        const { data: profile } = await supabase
          .from('profiles').select('subscription_status').eq('id', data.user.id).single()
        const status    = profile?.subscription_status
        const hasAccess = ['trialing', 'active', 'vip'].includes(status ?? '')

        setMessage('✅ Connexion réussie, redirection…')
        // Petit délai pour que le cookie soit bien posé avant la navigation
        setTimeout(() => {
          window.location.href = hasAccess ? '/dashboard' : '/pricing'
        }, 300)

      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: name, referred_by: referralInput.trim().toUpperCase() || null },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        })
        if (error) { setMessage(error.message) }
        else {
          if (referralInput.trim()) localStorage.setItem('myta_referral', referralInput.trim().toUpperCase())
          setMessage('Vérifiez votre email pour confirmer votre compte.')
        }
        setLoading(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessage('Erreur inattendue : ' + msg)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'linear-gradient(160deg, #f0f0ff 0%, #e8fbf8 50%, #f0fdf4 100%)' }}
    >
      <div className="w-full max-w-sm flex flex-col gap-8">

        <div className="flex flex-col items-center gap-4">
          <img src="/logo_my_twin_app.png" alt="My Twin App" className="w-64 object-contain drop-shadow-sm" />
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{ background: '#f0fdf4', color: '#16A34A', borderColor: '#bbf7d0' }}>
              🥗 Nutrition
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{ background: '#f0f0ff', color: '#4B47A0', borderColor: '#c7d2fe' }}>
              🏋️ Sport
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{ background: '#e8fbf8', color: '#0D7A6E', borderColor: '#99f6e4' }}>
              😴 Sommeil
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg border border-zinc-100">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight mb-0.5">
            {mode === 'login' ? 'Bon retour ! 👋' : 'Créer un compte'}
          </h2>
          <p className="text-zinc-400 text-sm mb-5">
            {mode === 'login' ? 'Connecte-toi à ton espace MYTA' : 'Rejoins My Twin App gratuitement'}
          </p>

          <div className="flex bg-zinc-100 rounded-2xl p-1 mb-5">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setMessage('') }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" placeholder="Ton prénom" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full pl-10 pr-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white" />
                </div>
                <div className="relative">
                  <Gift size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" placeholder="Code de parrainage (optionnel)" value={referralInput}
                    onChange={e => setReferralInput(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white uppercase tracking-widest font-mono" />
                </div>
              </>
            )}
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input type="email" placeholder="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white" />
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input type={showPass ? 'text' : 'password'} placeholder="Mot de passe" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full pl-10 pr-10 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {message && (
              <div className={`text-xs px-4 py-3 rounded-2xl flex items-start gap-2 ${
                message.includes('Vérifiez') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <span>{message.includes('Vérifiez') ? '✅' : '⚠️'}</span>
                <span>{message}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 mt-1"
              style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}>
              {loading ? <Loader2 size={16} className="animate-spin" />
                : <>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}<ArrowRight size={15} /></>}
            </button>
          </form>
        </div>

        {/* Lien démo */}
        <button
          onClick={() => window.location.href = '/demo'}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-500 text-sm font-semibold hover:border-[#4B47A0] hover:text-[#4B47A0] transition-all flex items-center justify-center gap-2">
          👀 Voir la démo sans s'inscrire
        </button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-zinc-400 text-xs">🔒 Données sécurisées · synchronisées avec Supabase</p>
          <div className="flex gap-3">
            <a href="/legal" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">Mentions légales</a>
            <a href="/legal" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">CGU</a>
            <a href="/legal" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">Confidentialité</a>
          </div>
        </div>
      </div>
    </div>
  )
}
