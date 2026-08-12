/**
 * Bandeau de confiance — les 4 signaux qui rassurent avant l'inscription.
 * Icônes Lucide (jamais d'emoji : c'est ce qui distingue une UI produit d'une
 * UI bricolée), aplat neutre, pas de gradient : c'est de l'information, pas
 * une accroche marketing.
 */

import { ShieldCheck, Server, Lock, XCircle } from 'lucide-react'

const ITEMS = [
  { Icon: ShieldCheck, title: 'Conforme RGPD',      desc: 'Tes données de santé ne sont jamais revendues' },
  { Icon: Server,      title: 'Hébergé en Europe',  desc: 'Serveurs et sauvegardes dans l’Union européenne' },
  { Icon: Lock,        title: 'Paiement Stripe',    desc: 'Aucune coordonnée bancaire ne transite par MYTA' },
  { Icon: XCircle,     title: 'Sans engagement',    desc: 'Résiliation en 1 clic, depuis ton compte' },
]

export function TrustBand() {
  return (
    <section className="border-y border-zinc-100 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7">
        {ITEMS.map(({ Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Icon size={17} className="text-zinc-600" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 leading-snug">{title}</p>
              <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
