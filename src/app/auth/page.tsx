'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hasActiveAccess } from '@/lib/access'
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Gift, CheckCircle2 } from 'lucide-react'

type Mode = 'login' | 'register' | 'forgot'

export default function AuthPage() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [name, setName]             = useState('')
  const [referralInput, setReferralInput] = useState('')
  const [mode, setMode]             = useState<Mode>('login')

  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const [msgType, setMsgType]   = useState<'success' | 'error'>('error')
  const [showPass, setShowPass] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const supabase = createClient()

  function notify(text: string, type: 'success' | 'error') {
    setMsgType(type)
    setMessage(text)
  }

  // Auto-fill referral code from URL ?ref=CODE + message retour reset
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) { setReferralInput(ref.toUpperCase()); setMode('register') }
    if (params.get('reset') === 'success') {
      notify('✅ Mot de passe modifié ! Connecte-toi avec ton nouveau mot de passe.', 'success')
    }
  }, [])

  // ── Auto-redirect si déjà connecté (gère le token refresh côté client) ────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        const { data: profile } = await supabase
          .from('profiles').select('subscription_status, trial_ends_at').eq('id', session.user.id).single()
        const hasAccess = hasActiveAccess(profile?.subscription_status, profile?.trial_ends_at)
        window.location.href = hasAccess ? '/dashboard' : '/pricing'
      } catch {
        window.location.href = '/dashboard'
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function switchMode(m: Mode) {
    setMode(m)
    setMessage('')
    setForgotSent(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { notify("Saisis ton adresse e-mail d'abord.", 'error'); return }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) {
      notify(error.message, 'error')
    } else {
      setForgotSent(true)
      notify('Email de réinitialisation envoyé. Vérifie ta boîte mail (et tes spams).', 'success')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          notify(error.message || 'Erreur de connexion', 'error')
          setLoading(false)
          return
        }
        if (!data?.user) {
          notify('Connexion échouée, réessaie.', 'error')
          setLoading(false)
          return
        }

        // Vérifier statut abonnement (accès = abonné OU essai 3 j en cours)
        const { data: profile } = await supabase
          .from('profiles').select('subscription_status, trial_ends_at').eq('id', data.user.id).single()
        const hasAccess = hasActiveAccess(profile?.subscription_status, profile?.trial_ends_at)

        notify('✅ Connexion réussie, redirection…', 'success')
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
        if (error) { notify(error.message, 'error') }
        else {
          if (referralInput.trim()) localStorage.setItem('myta_referral', referralInput.trim().toUpperCase())
          notify('Vérifiez votre email pour confirmer votre compte.', 'success')
        }
        setLoading(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      notify('Erreur inattendue : ' + msg, 'error')
      setLoading(false)
    }
  }

  const noticeBox = message && (
    <div className={`text-xs px-4 py-3 rounded-2xl flex items-start gap-2 ${
      msgType === 'success'
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-600 border border-red-200'
    }`}>
      <span>{msgType === 'success' ? '✅' : '⚠️'}</span>
      <span>{message}</span>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 page-gradient">
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

        {/* ────────── Écran MOT DE PASSE OUBLIÉ ────────── */}
        {mode === 'forgot' ? (
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-zinc-100">
            <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight mb-0.5">Mot de passe oublié 🔑</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Entre ton e-mail : on t'envoie un lien pour réinitialiser ton mot de passe.
            </p>

            {forgotSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle2 size={36} className="text-green-500" />
                <p className="text-sm font-bold text-zinc-900">E-mail envoyé ✓</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Un lien de réinitialisation vient d'être envoyé à <strong>{email}</strong>.
                  Vérifie ta boîte mail (et tes spams), le lien est valable 1 h.
                </p>
                <button type="button" onClick={() => switchMode('login')}
                  className="w-full py-3 rounded-2xl text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="email" placeholder="Adresse e-mail" value={email}
                    onChange={e => setEmail(e.target.value)} required autoFocus
                    className="w-full pl-10 pr-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white" />
                </div>

                {noticeBox}

                <button type="submit" disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 mt-1"
                  style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" />
                    : <>Envoyer le lien<ArrowRight size={15} /></>}
                </button>

                <button type="button" onClick={() => switchMode('login')}
                  className="self-center text-xs text-zinc-400 hover:text-tta-mid transition-colors mt-1">
                  ← Retour à la connexion
                </button>
              </form>
            )}
          </div>
        ) : (
        /* ────────── Écran CONNEXION / INSCRIPTION ────────── */
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-zinc-100">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight mb-0.5">
            {mode === 'login' ? 'Bon retour ! 👋' : 'Créer un compte'}
          </h2>
          <p className="text-zinc-400 text-sm mb-5">
            {mode === 'login' ? 'Connecte-toi à ton espace MYTA' : 'Rejoins My Twin App gratuitement'}
          </p>

          <div className="flex bg-zinc-100 rounded-2xl p-1 mb-5">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => switchMode(m)}
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

            {mode === 'login' && (
              <button type="button" onClick={() => switchMode('forgot')} disabled={loading}
                className="self-end text-xs text-tta-mid hover:underline disabled:opacity-50 transition-colors">
                Mot de passe oublié ?
              </button>
            )}

            {noticeBox}

            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 mt-1"
              style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}>
              {loading ? <Loader2 size={16} className="animate-spin" />
                : <>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}<ArrowRight size={15} /></>}
            </button>
          </form>
        </div>
        )}

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
            <a href="/privacy" className="text-xs text-zinc-400 hover:text-tta-mid transition-colors">Confidentialité</a>
          </div>
        </div>
      </div>
    </div>
  )
}
