'use client'

import { X, ArrowRight, BookOpen } from 'lucide-react'

interface WelcomeModalProps {
  onStartTour: () => void
  onClose: () => void
}

const FEATURES = [
  { icon: '🥗', label: 'Journal alimentaire', desc: 'Note tes repas, suis calories & macros' },
  { icon: '🏋️', label: 'Séances sport',       desc: 'Enregistre entraînements & Tabata HIIT' },
  { icon: '😴', label: 'Sommeil',              desc: 'Analyse la qualité de tes nuits' },
  { icon: '🤖', label: 'Coach Waty',           desc: 'Conseils IA personnalisés en temps réel' },
  { icon: '📊', label: 'Bilan & objectifs',    desc: 'Suivi hebdo et mensuel de ta progression' },
]

export function WelcomeModal({ onStartTour, onClose }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header coloré */}
        <div className="p-6 pb-4"
          style={{ background: 'linear-gradient(135deg, #4B47A0 0%, #2BA8B0 100%)' }}>
          <div className="flex items-start justify-between mb-3">
            <img src="/logo_my_twin_app.png" alt="MYTA" className="h-8 object-contain brightness-0 invert" />
            <button onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <X size={13} className="text-white" />
            </button>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Bienvenue sur MYTA ! 🎉</h2>
          <p className="text-white/80 text-sm mt-1 leading-relaxed">
            Ton coach digital nutrition, sport & sommeil
          </p>
        </div>

        {/* Features */}
        <div className="px-5 pt-4 pb-2 flex flex-col gap-3">
          <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
            Ce que tu peux faire
          </p>
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-zinc-50 rounded-2xl flex items-center justify-center text-lg flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">{f.label}</p>
                <p className="text-xs text-zinc-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Boutons */}
        <div className="px-5 pb-6 pt-4 flex flex-col gap-2">
          <button
            onClick={onStartTour}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}
          >
            Commencer le tour interactif <ArrowRight size={16} />
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-zinc-500 font-bold text-sm bg-zinc-50 hover:bg-zinc-100 transition-all active:scale-[0.98]"
          >
            <BookOpen size={15} />
            Explorer seul(e)
          </button>
        </div>
      </div>
    </div>
  )
}
