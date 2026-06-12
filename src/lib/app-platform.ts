/**
 * Détection du contexte d'exécution natif.
 *
 * L'app iOS (Capacitor) ajoute "MYTA-iOS-App" au user-agent
 * (cf. capacitor.config.ts → ios.appendUserAgent).
 *
 * Règle Apple 3.1.1 : aucune UI d'achat/abonnement externe (Stripe)
 * ne doit être visible dans l'app iOS. Utiliser isIosApp() pour masquer
 * pricing, boutons d'upgrade et gestion de paiement.
 *
 * ⚠️ À n'appeler que côté client (dans un useEffect) pour éviter
 * les mismatchs d'hydratation.
 */
export function isIosApp(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.userAgent.includes('MYTA-iOS-App')
}
