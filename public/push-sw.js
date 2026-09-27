// MYTA — Service worker dédié aux NOTIFICATIONS PUSH, et à rien d'autre.
//
// ⚠️ Volontairement SANS cache et SANS gestionnaire "fetch" : l'ancien
// service worker de mise en cache (next-pwa) servait du code périmé
// (cf. public/sw.js, auto-destructeur). Celui-ci est enregistré avec le
// scope "/push/" : il ne contrôle aucune page de l'app, il reçoit
// seulement les notifications et gère le clic dessus.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'MYTA'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'myta',
    renotify: false,
    data: { url: data.url || '/dashboard' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(
    (event.notification.data && event.notification.data.url) || '/dashboard',
    self.location.origin,
  ).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          try {
            await client.focus()
            if ('navigate' in client) await client.navigate(target)
            return
          } catch (e) {
            // page non contrôlée par ce SW : on ouvre simplement l'URL
          }
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
