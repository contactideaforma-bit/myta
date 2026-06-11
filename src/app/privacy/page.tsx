export const metadata = {
  title: 'Politique de confidentialité — My Twin App',
  description: 'Politique de confidentialité de My Twin App (MYTA)',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 text-sm text-gray-800">
      <h1 className="text-2xl font-bold mb-2">Politique de confidentialité</h1>
      <p className="text-gray-500 mb-8">Dernière mise à jour : 11 juin 2026</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. Qui sommes-nous</h2>
        <p>
          My Twin App (« MYTA ») est une application de santé et de bien-être qui
          permet de suivre son alimentation, ses séances sportives et de participer
          à des défis avec des amis. L'application est éditée par IDEA.
        </p>
        <p className="mt-2">
          Contact : <a href="mailto:contact@mytwinapp.fr" className="text-blue-600 underline">contact@mytwinapp.fr</a>
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. Données collectées</h2>
        <p>Nous collectons uniquement les données nécessaires au fonctionnement de l'application :</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Adresse e-mail et mot de passe (compte utilisateur)</li>
          <li>Données nutritionnelles saisies (calories, protéines, glucides, lipides)</li>
          <li>Données de séances sportives (durée, date)</li>
          <li>Données de groupes et challenges (nom de groupe, progression)</li>
          <li>Statut d'abonnement (via Stripe)</li>
          <li>Code de parrainage (optionnel)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">3. Utilisation des données</h2>
        <p>Vos données sont utilisées exclusivement pour :</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Afficher votre tableau de bord personnel et votre progression</li>
          <li>Calculer votre score dans les challenges</li>
          <li>Gérer votre abonnement et vos paiements</li>
          <li>Vous envoyer des notifications liées à votre activité (si activées)</li>
        </ul>
        <p className="mt-2 font-medium">Nous ne vendons ni ne partageons vos données avec des tiers à des fins commerciales.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">4. Services tiers</h2>
        <p>L'application utilise les services suivants :</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Supabase</strong> — base de données et authentification (hébergé en UE)</li>
          <li><strong>Stripe</strong> — traitement des paiements (les données bancaires ne sont jamais stockées sur nos serveurs)</li>
          <li><strong>Vercel</strong> — hébergement de l'application</li>
        </ul>
        <p className="mt-2">
          Ces services disposent de leurs propres politiques de confidentialité conformes au RGPD.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">5. Conservation des données</h2>
        <p>
          Vos données sont conservées tant que votre compte est actif. En cas de suppression
          de compte, l'ensemble de vos données personnelles est supprimé dans un délai de 30 jours.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">6. Vos droits (RGPD)</h2>
        <p>Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Droit d'accès à vos données</li>
          <li>Droit de rectification</li>
          <li>Droit à l'effacement (« droit à l'oubli »)</li>
          <li>Droit à la portabilité</li>
          <li>Droit d'opposition au traitement</li>
        </ul>
        <p className="mt-2">
          Pour exercer ces droits, contactez-nous à{' '}
          <a href="mailto:contact@mytwinapp.fr" className="text-blue-600 underline">contact@mytwinapp.fr</a>.
          Nous répondrons dans un délai de 30 jours.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">7. Sécurité</h2>
        <p>
          Nous appliquons des mesures de sécurité adaptées : chiffrement des données en transit (HTTPS),
          authentification sécurisée via Supabase, et contrôle d'accès strict aux données (RLS).
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">8. Mineurs</h2>
        <p>
          MYTA est destinée aux utilisateurs de 16 ans et plus. Nous ne collectons pas
          sciemment de données relatives à des mineurs de moins de 16 ans.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">9. Modifications</h2>
        <p>
          Cette politique peut être mise à jour. En cas de changement significatif,
          vous serez informé par e-mail ou via l'application.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">10. Contact</h2>
        <p>
          Pour toute question relative à cette politique :{' '}
          <a href="mailto:contact@mytwinapp.fr" className="text-blue-600 underline">contact@mytwinapp.fr</a>
        </p>
      </section>
    </main>
  )
}
