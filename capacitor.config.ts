import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Config Capacitor iOS — l'app native charge directement mytwinapp.fr
 * (l'app web est servie par Vercel, pas embarquée dans le binaire).
 *
 * appendUserAgent permet au site de détecter qu'il tourne dans l'app iOS
 * (→ masquage des achats Stripe, exigence Apple 3.1.1).
 */
const config: CapacitorConfig = {
  appId:   'fr.mytwinapp.app',
  appName: 'MYTA',
  webDir:  'capacitor-www',
  server: {
    url: 'https://mytwinapp.fr',
    allowNavigation: [
      'mytwinapp.fr',
      '*.mytwinapp.fr',
      '*.supabase.co',
    ],
  },
  ios: {
    appendUserAgent: 'MYTA-iOS-App',
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
  },
}

export default config
