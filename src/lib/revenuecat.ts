/**
 * Intégration RevenueCat (achats in-app iOS — exigence Apple 3.1.1).
 *
 * - Ne s'active QUE dans l'app iOS (Capacitor). Sur le web, toutes les
 *   fonctions sont des no-op : la monétisation web reste sur Stripe.
 * - L'appUserID RevenueCat = l'ID utilisateur Supabase, ce qui permet au
 *   webhook /api/webhook/revenuecat de retrouver le profil à mettre à jour.
 *
 * v1 : plans solo uniquement (Essentiel, Premium). Couple/Famille restent web.
 *
 * Variables d'env :
 *   NEXT_PUBLIC_REVENUECAT_IOS_KEY   — clé publique SDK (Apple) RevenueCat
 */

import { isIosApp } from './app-platform'
import type { PlanId } from './stripe-plans'

/** Product IDs déclarés dans App Store Connect (auto-renewable subscriptions). */
export const RC_PRODUCT_IDS = {
  essentiel: 'fr.mytwinapp.app.essentiel.monthly',
  premium:   'fr.mytwinapp.app.premium.monthly',
} as const

/** product_id App Store → planId interne (utilisé aussi côté webhook). */
export const RC_PRODUCT_TO_PLAN: Record<string, PlanId> = {
  [RC_PRODUCT_IDS.essentiel]: 'essentiel',
  [RC_PRODUCT_IDS.premium]:   'premium',
}

let configured = false

/** Import dynamique du plugin (évite de charger le natif sur le web).
 *  Borné par un timeout : si le chunk JS (servi par Vercel / le service worker
 *  PWA) ne se charge pas, on échoue proprement au lieu de bloquer l'UI. */
async function getPurchases() {
  const mod = await withTimeout(
    import('@revenuecat/purchases-capacitor'),
    RC_TIMEOUT_MS,
    'import'
  )
  // ⚠️ NE JAMAIS retourner mod.Purchases nu depuis une fonction async :
  // l'objet Purchases est un proxy Capacitor "thenable". Le `return`/`await`
  // déclenche alors Purchases.then(), rejeté par le natif avec
  // « "Purchases.then()" is not implemented on ios » → achats cassés.
  // On l'encapsule dans un objet (non-thenable) pour neutraliser ce piège.
  return { Purchases: mod.Purchases }
}

/**
 * Rejette si `p` ne se résout pas dans `ms`. Évite un spinner infini quand
 * StoreKit reste bloqué (produits pas encore propagés côté Apple, réseau…).
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`rc_timeout_${label}`)), ms)
    ),
  ])
}

/** Délai max d'attente d'une réponse StoreKit avant d'abandonner (ms). */
const RC_TIMEOUT_MS = 12000

/**
 * Initialise RevenueCat et associe l'utilisateur Supabase.
 * À appeler une fois, côté client, après connexion (dans un useEffect).
 */
export async function initRevenueCat(supabaseUserId: string): Promise<void> {
  if (!isIosApp()) return
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
  if (!apiKey) {
    console.warn('[RevenueCat] NEXT_PUBLIC_REVENUECAT_IOS_KEY manquante')
    return
  }
  try {
    const { Purchases } = await getPurchases()
    if (!configured) {
      await withTimeout(Purchases.configure({ apiKey, appUserID: supabaseUserId }), RC_TIMEOUT_MS, 'configure')
      configured = true
    } else {
      await withTimeout(Purchases.logIn({ appUserID: supabaseUserId }), RC_TIMEOUT_MS, 'login')
    }
  } catch (err) {
    console.error('[RevenueCat] init:', err)
  }
}

export interface RcProduct {
  planId:        PlanId
  productId:     string
  priceString:   string   // ex: "4,99 €"
  title:         string
  /** identifiant du package RevenueCat à passer à purchase() */
  packageId:     string
  hasFreeTrial:  boolean
}

/**
 * Récupère l'offering courant et le mappe sur nos plans solo.
 * Retourne [] hors app iOS ou si l'offering n'est pas configuré.
 */
/** Diagnostic temporaire affiché à l'écran (debug paywall iOS). */
let _lastRcDiag = '(pas encore chargé)'
export function getLastRcDiag(): string { return _lastRcDiag }

export async function getRcProducts(): Promise<RcProduct[]> {
  if (!isIosApp()) { _lastRcDiag = 'not-ios'; return [] }
  try {
    const { Purchases } = await getPurchases()
    const offerings = await withTimeout(Purchases.getOfferings(), RC_TIMEOUT_MS, 'getOfferings')
    // Diagnostic temporaire : structure réelle renvoyée par le SDK.
    _lastRcDiag = JSON.stringify({
      current: offerings.current?.identifier ?? null,
      all: Object.keys(offerings.all ?? {}),
      pkgs: offerings.current?.availablePackages?.map((p: any) => p.product?.identifier) ?? [],
      allPkgs: Object.values(offerings.all ?? {}).flatMap((o: any) =>
        (o.availablePackages ?? []).map((p: any) => p.product?.identifier)),
    })
    console.log('[RevenueCat][diag] offerings', _lastRcDiag)
    // Fallback : si aucun offering "current" n'est défini côté RevenueCat
    // (config incomplète / sandbox review), on prend le premier offering
    // qui contient nos produits plutôt que d'afficher un écran d'erreur.
    const current = offerings.current
      ?? Object.values(offerings.all ?? {}).find(o =>
           (o.availablePackages ?? []).some(p => RC_PRODUCT_TO_PLAN[p.product?.identifier])
         )
      ?? null
    if (!current) return []

    const out: RcProduct[] = []
    for (const pkg of current.availablePackages) {
      const productId = pkg.product.identifier
      const planId = RC_PRODUCT_TO_PLAN[productId]
      if (!planId) continue
      out.push({
        planId,
        productId,
        priceString: pkg.product.priceString,
        title:       pkg.product.title,
        packageId:   pkg.identifier,
        hasFreeTrial: !!pkg.product.introPrice && pkg.product.introPrice.price === 0,
      })
    }
    // Essentiel puis Premium
    return out.sort((a, b) => (a.planId === 'premium' ? 1 : 0) - (b.planId === 'premium' ? 1 : 0))
  } catch (err: any) {
    _lastRcDiag = 'ERR: ' + (err?.message ?? String(err))
    console.error('[RevenueCat] getOfferings:', err)
    return []
  }
}

export interface RcPurchaseResult {
  ok:      boolean
  planId?: PlanId
  /** true si l'utilisateur a annulé volontairement (pas une vraie erreur) */
  cancelled?: boolean
  error?:  string
}

/** Lance l'achat d'un package. */
export async function purchaseRcPackage(packageId: string): Promise<RcPurchaseResult> {
  if (!isIosApp()) return { ok: false, error: 'not_ios' }
  try {
    const { Purchases } = await getPurchases()
    const offerings = await Purchases.getOfferings()
    const offering = offerings.current
      ?? Object.values(offerings.all ?? {}).find(o =>
           (o.availablePackages ?? []).some(p => p.identifier === packageId)
         )
      ?? null
    const pkg = offering?.availablePackages.find(p => p.identifier === packageId)
    if (!pkg) return { ok: false, error: 'package_not_found' }

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
    const planId = activePlanFromCustomerInfo(customerInfo)
    return { ok: !!planId, planId: planId ?? undefined }
  } catch (err: any) {
    if (err?.code === 'PURCHASE_CANCELLED' || err?.userCancelled) {
      return { ok: false, cancelled: true }
    }
    console.error('[RevenueCat] purchase:', err)
    return { ok: false, error: err?.message ?? 'purchase_failed' }
  }
}

/** Restaure les achats (obligatoire Apple). Retourne le plan actif si trouvé. */
export async function restoreRcPurchases(): Promise<RcPurchaseResult> {
  if (!isIosApp()) return { ok: false, error: 'not_ios' }
  try {
    const { Purchases } = await getPurchases()
    const { customerInfo } = await Purchases.restorePurchases()
    const planId = activePlanFromCustomerInfo(customerInfo)
    return { ok: !!planId, planId: planId ?? undefined }
  } catch (err: any) {
    console.error('[RevenueCat] restore:', err)
    return { ok: false, error: err?.message ?? 'restore_failed' }
  }
}

/** Déduit le plan actif à partir des entitlements RevenueCat. */
function activePlanFromCustomerInfo(info: any): PlanId | null {
  const active = info?.entitlements?.active ?? {}
  // L'entitlement "premium" prime sur "essentiel".
  if (active.premium) return 'premium'
  if (active.essentiel) return 'essentiel'
  // Fallback : déduire depuis le product actif
  const productId: string | undefined = info?.activeSubscriptions?.[0]
  if (productId && RC_PRODUCT_TO_PLAN[productId]) return RC_PRODUCT_TO_PLAN[productId]
  return null
}
