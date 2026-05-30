import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' })

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
        <meta name="theme-color" content="#4B47A0" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}