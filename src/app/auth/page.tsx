'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Layers, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/nutrition/journal'
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })
      if (error) setMessage(error.message)
      else setMessage('Vérifiez votre email pour confirmer votre compte.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tta to-tta-mid flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo MYTA */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
            <Layers size={28} className="text-tta-accent" />
          </div>
          <div className="text-center">
            <p className="text-white/60 text-xs tracking-widest uppercase">My Twin App</p>
            <h1 className="text-white text-2xl font-bold tracking-tight">MYTA</h1>
          </div>
          <p className="text-white/50 text-sm text-center">
            Nutrition &amp; Sport — un seul espace
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="text-sm text-zinc-500 mb-5">
            {mode === 'login'
              ? 'Bienvenue sur MYTA'
              : 'Rejoignez My Twin App'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Prénom"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="input pl-9"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input pl-9"
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="input pl-9"
              />
            </div>

            {message && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                message.includes('Vérifiez')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
              }`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary justify-center mt-1 py-2.5"
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}<ArrowRight size={15} /></>
              }
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setMessage('') }}
              className="text-xs text-zinc-500 hover:text-tta-mid transition-colors"
            >
              {mode === 'login'
                ? "Pas encore de compte ? S'inscrire"
                : 'Déjà inscrit ? Se connecter'}
            </button>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          🔒 Données synchronisées sur Supabase
        </p>
      </div>
    </div>
  )
}
