const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
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
