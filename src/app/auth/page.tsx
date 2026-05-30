'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState('')
  const [showPass, setShowPass] = useState(false)

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
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Panneau gauche / haut : visuel brand ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4B47A0 0%, #2BA8B0 50%, #22C55E 100%)' }}>

        {/* Orbes décoratifs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 60%)' }} />

        {/* Contenu brand */}
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">

          {/* Logo PNG */}
          <img
            src="/logo_my_twin_app.png"
            alt="My Twin App"
            className="w-72 md:w-80 object-contain drop-shadow-xl"
          />

          {/* Pills modules */}
          <div className="flex gap-3 mt-2">
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 backdrop-blur text-white text-sm font-bold border border-white/30">
              🥗 Nutrition
            </span>
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 backdrop-blur text-white text-sm font-bold border border-white/30">
              🏋️ Sport
            </span>
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 backdrop-blur text-white text-sm font-bold border border-white/30">
              😴 Sommeil
            </span>
          </div>

          <p className="text-white/75 text-sm max-w-xs leading-relaxed">
            Ton coach digital personnel — nutrition, entraînements et récupération dans un seul espace.
          </p>
        </div>
      </div>

      {/* ── Panneau droit / bas : formulaire ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 md:p-12">
        <div className="w-full max-w-sm">

          {/* Titre */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              {mode === 'login' ? 'Bon retour ! 👋' : 'Créer un compte'}
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              {mode === 'login'
                ? 'Connecte-toi pour accéder à ton espace MYTA'
                : 'Rejoins My Twin App gratuitement'}
            </p>
          </div>

          {/* Tabs login / register */}
          <div className="flex bg-zinc-100 rounded-2xl p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setMessage('') }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  mode === m
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {mode === 'register' && (
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Ton prénom"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white"
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-3 border-2 border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-[#4B47A0] focus:ring-2 focus:ring-[#4B47A0]/15 transition-all bg-white"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {message && (
              <div className={`text-xs px-4 py-3 rounded-2xl flex items-start gap-2 ${
                message.includes('Vérifiez')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <span>{message.includes('Vérifiez') ? '✅' : '⚠️'}</span>
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 mt-1"
              style={{ background: 'linear-gradient(90deg, #4B47A0 0%, #2BA8B0 100%)' }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <>
                    {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                    <ArrowRight size={15} />
                  </>
              }
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-zinc-400 text-xs mt-8">
            🔒 Données sécurisées · synchronisées avec Supabase
          </p>
        </div>
      </div>
    </div>
  )
}