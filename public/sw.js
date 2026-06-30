// Service worker AUTO-DESTRUCTEUR.
//
// L'ancien service worker (next-pwa/Workbox) précachait les bundles et servait
// du code périmé dans l'app iOS (WKWebView), même après réinstallation —
// l'écran d'offres restait bloqué en chargement (rejet Apple 2.1b).
//
// Ce SW remplace l'ancien : il s'installe, vide TOUS les caches, se
// désenregistre, puis recharge les pages ouvertes pour qu'elles repartent
// proprement sur le réseau. Une fois passé, plus aucun service worker n'est
// actif et l'app charge toujours la dernière version du site.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch (e) {
        // ignore
      }
      try {
        await self.registration.unregister()
      } catch (e) {
        // ignore
      }
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        try { client.navigate(client.url) } catch (e) { /* ignore */ }
      }
    })()
  )
})
