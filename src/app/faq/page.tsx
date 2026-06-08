'use client'

import { useState } from 'react'
import { ChevronDown, Mic, CreditCard, Lock, Bell, Download, Settings, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FaqItem {
  icon: React.ReactNode
  iconBg: string
  question: string
  subtitle: string
  tag: string
  tagColor: string
  steps: { text: React.ReactNode }[]
  tip?: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    icon: <Mic size={18} />,
    iconBg: 'bg-orange-100 text-orange-500',
    question: 'Microphone bloqué',
    subtitle: '« Impossible d\'accéder au micro »',
    tag: 'Android · Chrome',
    tagColor: 'bg-orange-50 text-orange-700',
    steps: [
      { text: <>Ouvre <strong>Paramètres</strong> Android</> },
      { text: <>Va dans <strong>Applications → Chrome</strong> (ou ton navigateur)</> },
      { text: <>Appuie sur <strong>Autorisations → Microphone → Autoriser</strong></> },
      { text: <>Recharge MYTA et réessaie</> },
    ],
    tip: 'Alternative : dans Chrome, appuie sur le cadenas 🔒 dans la barre d\'adresse → Autorisations du site → Microphone → Autoriser',
  },
  {
    icon: <CreditCard size={18} />,
    iconBg: 'bg-red-100 text-red-500',
    question: 'Paiement échoué / accès bloqué',
    subtitle: 'L\'app est inaccessible après un échec CB',
    tag: 'Abonnement',
    tagColor: 'bg-red-50 text-red-700',
    steps: [
      { text: <>Tu es automatiquement redirigé vers la page <strong>Paiement échoué</strong></> },
      { text: <>Clique sur <strong>« Mettre à jour ma carte »</strong> — portail Stripe sécurisé</> },
      { text: <>Entre ta nouvelle carte et valide</> },
      { text: <>Reviens sur MYTA — ton accès est rétabli immédiatement</> },
    ],
    tip: 'Tu as aussi reçu un email d\'alerte. Contacte contact@mytwinapp.fr si le problème persiste.',
  },
  {
    icon: <Lock size={18} />,
    iconBg: 'bg-blue-100 text-blue-500',
    question: 'Mot de passe oublié',
    subtitle: 'Impossible de se connecter',
    tag: 'Compte',
    tagColor: 'bg-blue-50 text-blue-700',
    steps: [
      { text: <>Sur l'écran de connexion, clique sur <strong>« Mot de passe oublié »</strong></> },
      { text: <>Entre ton adresse email et valide</> },
      { text: <>Ouvre le <strong>mail de réinitialisation</strong> (vérifie les spams)</> },
      { text: <>Clique sur le lien et choisis un nouveau mot de passe (8 caractères min.)</> },
    ],
    tip: 'Le lien expire après 1 heure. Si tu ne reçois rien, écris à contact@mytwinapp.fr',
  },
  {
    icon: <Bell size={18} />,
    iconBg: 'bg-green-100 text-green-500',
    question: 'Notifications absentes',
    subtitle: 'Je ne reçois pas les rappels',
    tag: 'Android',
    tagColor: 'bg-green-50 text-green-700',
    steps: [
      { text: <>Paramètres Android → <strong>Applications → Chrome → Notifications → Autoriser</strong></> },
      { text: <>Dans MYTA, va dans <strong>Profil</strong> et active les notifications</> },
      { text: <>Vérifie que le mode <strong>Ne pas déranger</strong> n'est pas actif</> },
    ],
    tip: 'Si MYTA est installée en PWA, les notifs viennent de Chrome — les autorisations Chrome s\'appliquent.',
  },
  {
    icon: <Download size={18} />,
    iconBg: 'bg-purple-100 text-purple-500',
    question: 'Installer MYTA sur mon téléphone',
    subtitle: 'Ajouter l\'app à l\'écran d\'accueil',
    tag: 'Android Chrome',
    tagColor: 'bg-purple-50 text-purple-700',
    steps: [
      { text: <>Ouvre <strong>mytwinapp.fr</strong> dans Chrome</> },
      { text: <>Appuie sur le menu <strong>⋮</strong> (3 points) en haut à droite</> },
      { text: <>Sélectionne <strong>« Ajouter à l'écran d'accueil »</strong> et confirme</> },
      { text: <>L'icône MYTA apparaît comme une vraie app !</> },
    ],
    tip: 'Sur iPhone (Safari) : appuie sur le bouton partager ↑ → « Sur l\'écran d\'accueil »',
  },
  {
    icon: <Settings size={18} />,
    iconBg: 'bg-teal-100 text-teal-600',
    question: 'Changer email, mot de passe ou abonnement',
    subtitle: 'Gérer son compte',
    tag: 'Mon compte',
    tagColor: 'bg-teal-50 text-teal-700',
    steps: [
      { text: <>Ouvre le menu <strong>☰</strong> en haut à gauche</> },
      { text: <>Clique sur <strong>« Mon compte »</strong> en bas du menu</> },
      { text: <>Tu peux modifier : <strong>nom, email, mot de passe, carte bancaire, abonnement</strong></> },
    ],
    tip: 'Pour résilier ou changer de formule, clique sur « Gérer mon abonnement » → portail Stripe sécurisé.',
  },
]

function FaqCard({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-sm cursor-pointer"
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0', item.iconBg)}>
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-800 leading-tight">{item.question}</p>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.subtitle}</p>
        </div>
        <ChevronDown
          size={16}
          className={cn('text-zinc-400 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </div>

      {open && (
        <div className="border-t border-zinc-100 px-4 py-4 flex flex-col gap-3">
          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full self-start', item.tagColor)}>
            {item.tag}
          </span>
          <div className="flex flex-col gap-2">
            {item.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5',
                  item.iconBg
                )}>
                  {i + 1}
                </div>
                <p className="text-sm text-zinc-700 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
          {item.tip && (
            <div className="bg-zinc-50 rounded-2xl px-3 py-2.5 flex gap-2 items-start">
              <HelpCircle size={13} className="text-zinc-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-500 leading-relaxed">{item.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FaqPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

      {/* Header */}
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-tta-light rounded-2xl flex items-center justify-center mx-auto mb-3">
          <HelpCircle size={22} className="text-tta-mid" />
        </div>
        <h1 className="text-xl font-extrabold text-zinc-900">Aide & FAQ</h1>
        <p className="text-sm text-zinc-400 mt-1">Questions fréquentes · Appuie pour voir la solution</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {FAQ_ITEMS.map((item, i) => (
          <FaqCard key={i} item={item} />
        ))}
      </div>

      {/* Contact */}
      <div className="bg-zinc-50 rounded-3xl px-5 py-4 text-center mt-2">
        <p className="text-sm font-bold text-zinc-700">Tu n'as pas trouvé ta réponse ?</p>
        <p className="text-xs text-zinc-400 mt-1 mb-3">Notre équipe répond sous 24h</p>
        <a
          href="mailto:contact@mytwinapp.fr"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold"
          style={{ background: 'linear-gradient(90deg, #4B47A0, #2BA8B0)' }}
        >
          Contacter le support
        </a>
      </div>

    </div>
  )
}
