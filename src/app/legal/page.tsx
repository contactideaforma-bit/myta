import Link from 'next/link'

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-12 flex flex-col gap-16">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">← Retour</Link>
          <h1 className="text-3xl font-extrabold text-zinc-900">Informations légales</h1>
          <p className="text-zinc-400 text-sm">Dernière mise à jour : juin 2026</p>
        </div>

        {/* ── MENTIONS LÉGALES ── */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-zinc-900 border-b border-zinc-100 pb-3">Mentions légales</h2>

          <div className="flex flex-col gap-4 text-sm text-zinc-600 leading-relaxed">
            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Éditeur du site</h3>
              <p>IDEAFORMA</p>
              <p>Avenue Charles de Gaulle, 92200 Neuilly-sur-Seine, France</p>
              <p>SIRET : 993 125 335 00014</p>
              <p>Email : <a href="mailto:contact@mytwinapp.fr" className="text-tta-mid hover:underline">contact@mytwinapp.fr</a></p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Directeur de la publication</h3>
              <p>IDEAFORMA, représentée par son dirigeant.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Hébergement</h3>
              <p><strong>Application web :</strong> Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis — <a href="https://vercel.com" className="text-tta-mid hover:underline" target="_blank" rel="noopener noreferrer">vercel.com</a></p>
              <p className="mt-1"><strong>Base de données :</strong> Supabase Inc., 970 Toa Payoh North, Singapour — <a href="https://supabase.com" className="text-tta-mid hover:underline" target="_blank" rel="noopener noreferrer">supabase.com</a></p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Propriété intellectuelle</h3>
              <p>L'ensemble du contenu du site mytwinapp.fr (textes, graphismes, logo, icônes, images, sons, logiciels) est la propriété exclusive d'IDEAFORMA et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction, représentation, modification ou adaptation, totale ou partielle, est strictement interdite sans l'autorisation écrite préalable d'IDEAFORMA.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Limitation de responsabilité</h3>
              <p>Les informations fournies par My Twin App (MYTA) à caractère nutritionnel, sportif ou médical sont données à titre indicatif uniquement. Elles ne constituent pas un avis médical et ne remplacent en aucun cas la consultation d'un professionnel de santé qualifié. IDEAFORMA ne saurait être tenu responsable de tout dommage direct ou indirect résultant de l'utilisation de ces informations.</p>
            </div>
          </div>
        </section>

        {/* ── CGU ── */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-zinc-900 border-b border-zinc-100 pb-3">Conditions Générales d'Utilisation</h2>

          <div className="flex flex-col gap-5 text-sm text-zinc-600 leading-relaxed">

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 1 — Objet</h3>
              <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application My Twin App (MYTA), éditée par IDEAFORMA, accessible à l'adresse mytwinapp.fr. En créant un compte, l'utilisateur accepte sans réserve les présentes CGU.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 2 — Accès au service</h3>
              <p>My Twin App est accessible via abonnement payant après une période d'essai gratuite de 3 jours. L'accès est conditionné à la création d'un compte avec une adresse email valide et à la souscription d'un abonnement mensuel (3,99 €/mois) ou annuel (39,99 €/an). Les tarifs sont indiqués TTC.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 3 — Essai gratuit</h3>
              <p>Tout nouvel utilisateur bénéficie d'une période d'essai gratuite de 3 jours. Aucun débit n'est effectué pendant cette période. À l'issue de l'essai, l'abonnement choisi est automatiquement activé sauf annulation avant la fin de la période d'essai.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 4 — Résiliation et remboursement</h3>
              <p>L'utilisateur peut résilier son abonnement à tout moment depuis son espace personnel ou en contactant contact@mytwinapp.fr. La résiliation prend effet à la fin de la période de facturation en cours. Conformément à la législation applicable, l'utilisateur dispose d'un droit de rétractation de 14 jours à compter de la souscription, sauf si l'accès au service a été expressément demandé avant l'expiration de ce délai.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 5 — Obligations de l'utilisateur</h3>
              <p>L'utilisateur s'engage à fournir des informations exactes lors de la création de son compte, à ne pas partager ses identifiants avec des tiers, à utiliser l'application conformément à sa destination et à ne pas tenter de porter atteinte au bon fonctionnement du service.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 6 — Données de santé et avertissement médical</h3>
              <p>Les données nutritionnelles, sportives et de bien-être fournies par MYTA sont calculées sur la base d'algorithmes et de bases de données de référence. Elles sont données à titre indicatif uniquement et ne constituent pas un avis médical. IDEAFORMA recommande à tout utilisateur présentant des problèmes de santé de consulter un professionnel de santé avant de modifier son alimentation ou son activité physique.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 7 — Paiement</h3>
              <p>Les paiements sont traités de manière sécurisée par Stripe Inc. IDEAFORMA ne conserve aucune donnée bancaire. En cas de litige concernant une facturation, l'utilisateur peut contacter contact@mytwinapp.fr dans un délai de 30 jours suivant la facturation concernée.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 8 — Modification des CGU</h3>
              <p>IDEAFORMA se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par email. L'utilisation continue du service après notification vaut acceptation des nouvelles CGU.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">Article 9 — Loi applicable</h3>
              <p>Les présentes CGU sont soumises au droit français. En cas de litige, les parties rechercheront une solution amiable avant tout recours judiciaire. À défaut, les tribunaux compétents du ressort de Nanterre seront seuls compétents.</p>
            </div>
          </div>
        </section>

        {/* ── POLITIQUE DE CONFIDENTIALITÉ ── */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-zinc-900 border-b border-zinc-100 pb-3">Politique de confidentialité</h2>

          <div className="flex flex-col gap-5 text-sm text-zinc-600 leading-relaxed">

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">1. Responsable du traitement</h3>
              <p>IDEAFORMA, Avenue Charles de Gaulle, 92200 Neuilly-sur-Seine — contact@mytwinapp.fr</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">2. Données collectées</h3>
              <p>Dans le cadre de l'utilisation de MYTA, nous collectons les données suivantes :</p>
              <ul className="mt-2 flex flex-col gap-1 pl-4">
                <li>• <strong>Données d'identification :</strong> adresse email, prénom</li>
                <li>• <strong>Données de santé :</strong> poids, taille, date de naissance, sexe, niveau d'activité physique, objectifs nutritionnels et sportifs</li>
                <li>• <strong>Données d'utilisation :</strong> journal alimentaire, séances sportives, données de sommeil, pesées</li>
                <li>• <strong>Données de paiement :</strong> gérées exclusivement par Stripe (nous ne conservons pas vos données bancaires)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">3. Finalités du traitement</h3>
              <p>Vos données sont utilisées pour :</p>
              <ul className="mt-2 flex flex-col gap-1 pl-4">
                <li>• Fournir et personnaliser le service MYTA</li>
                <li>• Calculer vos besoins nutritionnels et sportifs</li>
                <li>• Générer des rapports et conseils personnalisés via IA</li>
                <li>• Gérer votre abonnement et les paiements</li>
                <li>• Améliorer le service</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">4. Base légale</h3>
              <p>Le traitement de vos données repose sur l'exécution du contrat d'abonnement (art. 6.1.b RGPD) et, pour les données de santé, sur votre consentement explicite (art. 9.2.a RGPD) donné lors de la création de votre compte.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">5. Conservation des données</h3>
              <p>Vos données sont conservées pendant toute la durée de votre abonnement et 3 ans après sa résiliation, conformément aux obligations légales. Les données de santé sont supprimées sur demande dans un délai de 30 jours.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">6. Transferts hors UE</h3>
              <p>Vos données sont hébergées par Vercel (États-Unis) et Supabase (Singapour), tous deux certifiés conformes aux exigences du RGPD via des clauses contractuelles types approuvées par la Commission européenne.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">7. Vos droits</h3>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="mt-2 flex flex-col gap-1 pl-4">
                <li>• <strong>Accès</strong> à vos données personnelles</li>
                <li>• <strong>Rectification</strong> des données inexactes</li>
                <li>• <strong>Suppression</strong> (droit à l'oubli)</li>
                <li>• <strong>Portabilité</strong> de vos données</li>
                <li>• <strong>Opposition</strong> au traitement</li>
                <li>• <strong>Limitation</strong> du traitement</li>
              </ul>
              <p className="mt-2">Pour exercer ces droits, contactez-nous à <a href="mailto:contact@mytwinapp.fr" className="text-tta-mid hover:underline">contact@mytwinapp.fr</a>. Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">8. Cookies</h3>
              <p>MYTA utilise uniquement des cookies techniques nécessaires au fonctionnement du service (authentification, préférences). Aucun cookie publicitaire ou de traçage tiers n'est utilisé.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">9. Sécurité</h3>
              <p>Vos données sont chiffrées en transit (HTTPS/TLS) et au repos. L'accès aux données est restreint aux seuls services techniques nécessaires au fonctionnement de MYTA. Votre mot de passe n'est jamais stocké en clair.</p>
            </div>

            <div>
              <h3 className="font-bold text-zinc-800 mb-1">10. Contact</h3>
              <p>Pour toute question relative à la protection de vos données : <a href="mailto:contact@mytwinapp.fr" className="text-tta-mid hover:underline">contact@mytwinapp.fr</a></p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-zinc-100 pt-6 text-center">
          <p className="text-xs text-zinc-400">© 2026 IDEAFORMA — My Twin App (MYTA). Tous droits réservés.</p>
          <Link href="/" className="text-xs text-tta-mid hover:underline mt-2 inline-block">Retour à l'application</Link>
        </div>

      </div>
    </div>
  )
}
