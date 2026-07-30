'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isIosApp } from '@/lib/app-platform'
import { linkRevenueCatUser } from '@/lib/revenuecat'
import { hasActiveAccess } from '@/lib/access'
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Gift, CheckCircle2 } from 'lucide-react'

/**
 * App iOS : après connexion/inscription, rattache l'utilisateur RevenueCat
 * (transfert des achats faits en anonyme — Apple 5.1.1(v)) puis synchronise
 * l'abonnement vers le profil Supabase côté serveur.
 */
async function syncIosPurchases(accessToken: string | undefined, userId: string) {
  if (!isIosApp()) return
  try {
    const plan = await linkRevenueCatUser(userId)
    if (plan) localStorage.setItem('myta_plan', plan)
    if (accessToken) {
      await fetch('/api/revenuecat/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {})
    }
  } catch { /* best effort — ne bloque jamais la connexion */ }
}

type Mode = 'login' | 'register' | 'forgot'

// ⏳ Compte développeur Apple en migration (accès coupé, dossier 20000118458293) :
// le provider Apple n'est pas configurable dans Supabase → bouton masqué pour
// éviter l'erreur « provider is not enabled ». Repasser à true quand Apple aura
// rétabli l'accès ET que le provider Apple sera configuré dans Supabase.
const APPLE_SIGNIN_READY: boolean = false

// ── Logos SVG (Apple / Google) ────────────────────────────────────────────────
const AppleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
)
const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5c-2.1 1.6-4.7 2.9-7.5 2.9-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4 5.6l6.5 5.5C41.6 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/>
  </svg>
)

export default function AuthPage() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [name, setName]             = useState('')
  const [referralInput, setReferralInput] = useState('')
  const [mode, setMode]             = useState<Mode>('login')

  const [loading, setLoading]   = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'apple' | 'google' | null>(null)
  const [message, setMessage]   = useState('')
  const [msgType, setMsgType]   = useState<'success' | 'error'>('error')
  const [showPass, setShowPass] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [purchased, setPurchased] = useState(false)

  const supabase = createClient()
  // App iOS : l'inscription est OPTIONNELLE (Apple 5.1.1(v)) → on affiche un
  // accès direct au paywall sans compte.
  const [iosApp, setIosApp] = useState(false)
  useEffect(() => { setIosApp(isIosApp()) }, [])

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
    // Achat in-app effectué sans compte (Apple 5.1.1(v)) : compte optionnel.
    // Le chemin recommandé = 1 tap « Continuer avec Apple » (pas de formulaire).
    if (params.get('purchased') === '1') {
      setPurchased(true)
      setMode('register')
      notify('✅ Abonnement activé ! Lie un compte (gratuit) en 1 tap pour sauvegarder ton suivi et le retrouver sur tous tes appareils.', 'success')
    }
  }, [])

  // ── Auto-redirect si déjà connecté (gère le token refresh côté client) ────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        await syncIosPurchases(session.access_token, session.user.id)
        const { data: profile } = await supabase
          .from('profiles').select('subscription_status, trial_ends_at').eq('id', session.user.id).single()
        const hasAccess = hasActiveAccess(profile?.subscription_status, profile?.trial_ends_at)
        window.location.href = hasAccess ? '/dashboard' : '/pricing'
      } catch {
        window.location.href = '/dashboard'
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connexion 1 tap : compte lié à Apple / Google (Supabase OAuth) ────────
  // Après un achat in-app anonyme, /auth/confirm?purchased=1 rattache les
  // achats RevenueCat au compte puis entre directement dans l'app.
  async function handleOAuth(provider: 'apple' | 'google') {
    setMessage('')
    setOauthLoading(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/confirm${purchased ? '?purchased=1' : ''}`,
        },
      })
      if (error) throw error
      // signInWithOAuth redirige la page — on laisse le spinner tourner.
    } catch {
      notify(`Connexion ${provider === 'apple' ? 'Apple' : 'Google'} indisponible pour le moment. Réessaie ou utilise l'email.`, 'error')
      setOauthLoading(null)
    }
  }

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

        // App iOS : rattacher les achats anonymes au compte AVANT de lire le statut
        await syncIosPurchases(data.session?.access_token, data.user.id)

        // Vérifier statut abonnement
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

  // Boutons sociaux : Apple partout (si configuré), Google uniquement hors app
  // iOS (l'OAuth Google est bloqué dans les WebView embarquées).
  const showSocial = APPLE_SIGNIN_READY || !iosApp
  const socialButtons = showSocial && (
    <div className="flex flex-col gap-2 mb-4">
      {APPLE_SIGNIN_READY && (
        <button type="button" onClick={() => handleOAuth('apple')} disabled={loading || !!oauthLoading}
          className="w-full py-3 rounded-2xl bg-black text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 dark:border dark:border-zinc-600">
          {oauthLoading === 'apple'
            ? <Loader2 size={16} className="animate-spin" />
            : <><AppleLogo /> Continuer avec Apple</>}
        </button>
      )}
      {!iosApp && (
        <button type="button" onClick={() => handleOAuth('google')} disabled={loading || !!oauthLoading}
          className="w-full py-3 rounded-2xl bg-white border-2 border-zinc-200 text-zinc-700 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60">
          {oauthLoading === 'google'
            ? <Loader2 size={16} className="animate-spin" />
            : <><GoogleLogo /> Continuer avec Google</>}
        </button>
      )}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-[#3d3a7a]" />
        <span className="text-[11px] text-zinc-400 font-semibold">ou par email</span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-[#3d3a7a]" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 page-gradient">
      <div className="w-full max-w-sm flex flex-col gap-8">

        <div className="flex flex-col items-center gap-4">
          <img src="/logo_my_twin_app.png" alt="My Twin App" className="w-64 object-contain drop-shadow-sm" />
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-600 border-green-200">
              🥗 Nutrition
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-indigo-50 text-indigo-600 border-indigo-100">
              🏋️ Sport
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold border bg-teal-50 text-teal-700 border-teal-100">
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
            {purchased ? 'Abonnement activé 🎉' : mode === 'login' ? 'Bon retour ! 👋' : 'Créer un compte'}
          </h2>
          <p className="text-zinc-400 text-sm mb-5">
            {purchased
              ? (showSocial
                  ? 'Lie ton compte en 1 tap pour entrer dans l\'app'
                  : 'Crée un compte (gratuit) pour retrouver ton suivi partout')
              : mode === 'login' ? 'Connecte-toi à ton espace MYTA' : 'Rejoins My Twin App gratuitement'}
          </p>

          {socialButtons}

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

        {/* App iOS : accès au paywall SANS compte (Apple 5.1.1(v)) */}
        {iosApp && !purchased && (
          <button
            onClick={() => window.location.href = '/pricing'}
            className="w-full py-3 rounded-2xl border-2 border-[#4B47A0]/30 text-[#4B47A0] text-sm font-bold hover:bg-[#4B47A0]/5 transition-all flex items-center justify-center gap-2">
            Continuer sans compte — voir les abonnements →
          </button>
        )}

        {/* Lien démo */}
        {!purchased && (
          <button
            onClick={() => window.location.href = '/demo'}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-500 text-sm font-semibold hover:border-[#4B47A0] hover:text-[#4B47A0] transition-all flex items-center justify-center gap-2">
            👀 Voir la démo sans s'inscrire
          </button>
        )}

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
