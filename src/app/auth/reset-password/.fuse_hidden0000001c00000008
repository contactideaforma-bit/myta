'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'

/**
 * Page de réinitialisation du mot de passe.
 * L'utilisateur arrive ici via le lien de l'email Supabase (flow recovery).
 * Le client @supabase/ssr échange automatiquement le code PKCE (?code=...)
 * contre une session — on gère aussi le fallback manuel.
 */
export default function ResetPasswordPage() {
  const [ready, setReady]       = useState(false)
  const [sessionOk, setSessionOk] = useState(false)
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function init() {
      // 1. Le client détecte normalement le code dans l'URL automatiquement.
      //    On force l'échange si un ?code= est présent et pas encore consommé.
      const code = new URLSearchParams(window.location.search).get('code')
      let { data: { session } } = await supabase.auth.getSession()

      if (!session && code) {
        const { data, error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        if (!exErr) session = data.session
      }

      if (cancelled) return
      if (session) {
        setSessionOk(true)
        setReady(true)
        return
      }

      // 2. Fallback : attendre l'événement PASSWORD_RECOVERY (flow implicite #access_token)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && s) {
          setSessionOk(true)
          setReady(true)
        }
      })

      // 3. Au bout de 3 s sans session → lien invalide/expiré
      setTimeout(() => {
        if (!cancelled) setReady(true)
        subscription.unsubscribe()
      }, 3000)
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Minimum 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setSaving(true)
    const { error: upErr } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (upErr) {
      setError(upErr.message === 'New password should be different from the old password.'
        ? "Le nouveau mot de passe doit être différent de l'ancien."
        : upErr.message)
      return
    }
    setDone(true)
    setTimeout(() => { window.location.href = '/dashboard' }, 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 page-gradient">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <img src="/logo_my_twin_app.png" alt="MYTA" className="w-48 mx-auto object-contain" />

        <div className="bg-white rounded-3xl p-6 shadow-lg border border-zinc-100">

          {!ready && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={28} className="animate-spin text-[#4B47A0]" />
              <p className="text-sm text-zinc-400">Vérification du lien…</p>
            </div>
          )}

          {ready && !sessionOk && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <AlertCircle size={32} className="text-red-500" />
              <p className="text-sm font-bold text-zinc-900">Lien invalide ou expiré</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Le lien de réinitialisation n'est plus valide (il expire après 1 h et ne
                fonctionne que dans le navigateur où tu as fait la demande).
              </p>
              <a href="/auth"
                className="w-full py-3 rounded-2xl text-white text-sm font-bold text-center"
                style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                Refaire une demande
              </a>
            </div>
          )}

          {ready && sessionOk && !done && (
            <>
              <h1 className="text-xl font-extrabold text-zinc-900 mb-0.5">Nouveau mot de passe 🔑</h1>
              <p className="text-zinc-400 text-sm mb-5">Choisis ton nouveau mot de passe MYTA</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type={showPass ? 'text' : 'password'} placeholder="Nouveau mot de passe"
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                    className="w-full pl-10 pr-10 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white" />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type={showPass ? 'text' : 'password'} placeholder="Confirme le mot de passe"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
                    className="w-full pl-10 pr-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white" />
                </div>

                {error && (
                  <div className="text-xs px-4 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-start gap-2">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />{error}
                  </div>
                )}

                <button type="submit" disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-70 mt-1"
                  style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Changer mon mot de passe'}
                </button>
                <p className="text-[11px] text-zinc-400 text-center">Minimum 8 caractères</p>
              </form>
            </>
          )}

          {done && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={36} className="text-green-500" />
              <p className="text-sm font-bold text-zinc-900">Mot de passe mis à jour ✓</p>
              <p className="text-xs text-zinc-400">Redirection vers ton espace…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
