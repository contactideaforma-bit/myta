import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import './globals.css'

// Manrope : grotesque géométrique, plus signée qu'Inter ; la variable CSS garde
// son nom historique pour ne rien casser dans tailwind.config.js.
const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-geist-sans' })

// Viewport : largeur verrouillée sur l'écran du téléphone, pas de zoom/pan
// (sans ça, le WebView iOS rend le site en largeur desktop ~980px et la page
// « flotte » comme une page web classique).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F6FB' },
    { media: '(prefers-color-scheme: dark)',  color: '#0F1020' },
  ],
}

export const metadata: Metadata = {
  title: 'My Twin App — MYTA',
  description: 'Nutrition & Sport — deux modules, une seule app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MYTA',
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="MYTA" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MYTA" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${manrope.variable} font-sans`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        {/* Vercel Web Analytics : comptage des visites sur mytwinapp.fr (production uniquement) */}
        <Analytics />
      </body>
    </html>
  )
}
