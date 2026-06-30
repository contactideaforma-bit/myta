// ⚠️ Service worker PWA désactivé : l'app iOS (Capacitor) charge mytwinapp.fr
// en direct ; le précache Workbox provoquait des bundles périmés bloquants
// (écran d'offres figé en chargement → rejet Apple 2.1b). On sert désormais
// un sw.js auto-destructeur (public/sw.js) qui purge le cache des appareils
// déjà piégés. next-pwa est neutralisé pour ne plus régénérer de sw.js.
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: true,
  register: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(self), microphone=(self), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control',     value: 'on' },
        ],
      },
    ]
  },
  // Alias des URLs déclarées sur l'App Store vers les pages existantes.
  async redirects() {
    return [
      { source: '/cgu',             destination: '/legal',   permanent: false },
      { source: '/confidentialite', destination: '/privacy', permanent: false },
    ]
  },
}

module.exports = withPWA(nextConfig)
