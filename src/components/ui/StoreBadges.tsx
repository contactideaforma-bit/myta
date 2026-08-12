/**
 * Badges de téléchargement App Store / Google Play + preuve sociale.
 *
 * Les badges sont reproduits en SVG inline (pas de requête réseau, pas de flash
 * au chargement, nets sur écran Retina). Si tu veux l'artwork officiel au pixel
 * près, télécharge-le ici et remplace le SVG par une <Image /> :
 *   Apple  → https://developer.apple.com/app-store/marketing/guidelines/
 *   Google → https://play.google.com/intl/fr/badges/
 */

export const APP_STORE_URL  = 'https://apps.apple.com/fr/app/myta/id6780540005'
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=fr.mytwinapp.app'

/** Note affichée sous les badges. À mettre à jour quand les avis évoluent. */
export const APP_STORE_RATING = 5.0

function AppStoreBadge() {
  return (
    <svg viewBox="0 0 160 54" className="h-[52px] w-auto" role="img" aria-label="Télécharger dans l'App Store">
      <rect x="0.5" y="0.5" width="159" height="53" rx="10" fill="#000" stroke="rgba(255,255,255,0.35)" />
      <g transform="translate(15, 13) scale(1.15)" fill="#fff">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </g>
      <text x="52" y="22" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9.5" letterSpacing="0.2">
        Télécharger dans l&apos;
      </text>
      <text x="52" y="40" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="600" letterSpacing="-0.3">
        App Store
      </text>
    </svg>
  )
}

function PlayStoreBadge() {
  return (
    <svg viewBox="0 0 170 54" className="h-[52px] w-auto" role="img" aria-label="Disponible sur Google Play">
      <rect x="0.5" y="0.5" width="169" height="53" rx="10" fill="#000" stroke="rgba(255,255,255,0.35)" />
      <g transform="translate(14, 14) scale(1.1)">
        <path fill="#00D3FF" d="M3.5 2.2c-.3.3-.5.8-.5 1.4v16.8c0 .6.2 1.1.5 1.4l.1.1 9.4-9.4v-.2L3.6 2.1l-.1.1z" />
        <path fill="#FFCE00" d="M16.1 15.6l-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1.1.6 1.1 1.6 0 2.2l-3.7 2.1-.1-.1z" />
        <path fill="#FF3A44" d="M16.2 15.5L13 12.3 3.5 21.8c.4.4 1 .4 1.6.1l11.1-6.4z" />
        <path fill="#00C853" d="M16.2 8.5L5.1 2.1C4.5 1.8 3.9 1.8 3.5 2.2l9.5 9.5 3.2-3.2z" />
      </g>
      <text x="52" y="22" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" letterSpacing="0.6">
        DISPONIBLE SUR
      </text>
      <text x="52" y="40" fill="#fff" fontFamily="system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="600" letterSpacing="-0.3">
        Google Play
      </text>
    </svg>
  )
}

function Stars({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-hidden>
      {[0, 1, 2, 3, 4].map(i => (
        <svg key={i} viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-current">
          <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
        </svg>
      ))}
    </span>
  )
}

/**
 * Rangée de badges.
 * `tone="light"` sur fond sombre (héro, footer), `tone="dark"` sur fond clair.
 */
export function StoreBadges({
  tone = 'light',
  showRating = true,
  className = '',
}: { tone?: 'light' | 'dark'; showRating?: boolean; className?: string }) {
  const muted = tone === 'light' ? 'text-white/70' : 'text-zinc-500'
  const strong = tone === 'light' ? 'text-white' : 'text-zinc-900'

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
           className="transition-transform hover:scale-[1.04] active:scale-[0.98]"
           aria-label="Télécharger MYTA sur l'App Store">
          <AppStoreBadge />
        </a>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
           className="transition-transform hover:scale-[1.04] active:scale-[0.98]"
           aria-label="Télécharger MYTA sur Google Play">
          <PlayStoreBadge />
        </a>
      </div>

      {showRating && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${muted}`}>
          <Stars className="text-amber-400" />
          <span><strong className={`font-bold ${strong}`}>{APP_STORE_RATING.toFixed(1).replace('.', ',')}</strong> sur l&apos;App Store</span>
          <span aria-hidden>·</span>
          <span>iPhone &amp; Android</span>
        </div>
      )}
    </div>
  )
}
