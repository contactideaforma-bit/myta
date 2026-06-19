import Link from 'next/link'

export const metadata = {
  title: 'Contact — My Twin App',
  description: 'Contacter le support de My Twin App (MYTA).',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-12 flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">← Retour</Link>
          <h1 className="text-3xl font-extrabold text-zinc-900">Contact &amp; assistance</h1>
          <p className="text-zinc-400 text-sm">Une question, un bug, une demande sur ton abonnement ? On te répond.</p>
        </div>

        {/* Support */}
        <section className="flex flex-col gap-4 text-sm text-zinc-600 leading-relaxed">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 mb-1">Support</h2>
            <p>
              Écris-nous à{' '}
              <a href="mailto:contact@mytwinapp.fr" className="text-tta-mid font-semibold hover:underline">
                contact@mytwinapp.fr
              </a>
              . Nous répondons généralement sous 48 h ouvrées.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-zinc-900 mb-1">Éditeur</h2>
            <p>IDEAFORMA</p>
            <p>Avenue Charles de Gaulle, 92200 Neuilly-sur-Seine, France</p>
            <p>SIRET : 993 125 335 00014</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-zinc-900 mb-1">Abonnements</h2>
            <p>
              Pour toute question sur un abonnement souscrit dans l&apos;app iOS, tu peux aussi gérer ou
              résilier directement depuis les réglages de ton compte Apple. Voir nos{' '}
              <Link href="/legal" className="text-tta-mid font-semibold hover:underline">conditions d&apos;utilisation</Link>{' '}
              et notre{' '}
              <Link href="/privacy" className="text-tta-mid font-semibold hover:underline">politique de confidentialité</Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
