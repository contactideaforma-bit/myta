/**
 * Logo MYTA — badge + wordmark (piste C).
 *
 * Structure volontaire : le SYMBOLE porte la couleur (dégradé de l'icône des
 * stores), le TEXTE reste neutre. Conséquence pratique :
 *  - le lockup marche sur fond clair comme sur fond sombre sans variante,
 *  - le badge seul sert de favicon / avatar / écran de démarrage,
 *  - le vert de l'icône et l'indigo du site cohabitent au lieu de s'affronter.
 *
 * Rendu en texte + CSS, jamais en image : net à toutes les tailles, aucune
 * requête réseau, et le thème sombre est géré par la classe `.dark`.
 *
 * Couleurs échantillonnées directement sur store_icon.png.
 */

const ICON_FROM = '#0599AE'   // turquoise, angle haut-gauche de l'icône
const ICON_TO   = '#71D261'   // vert, angle bas-droit

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { badge: number; radius: number; mono: number; name: number; base: number; gap: number }> = {
  sm: { badge: 28, radius: 8,  mono: 7.5, name: 17, base: 5.5, gap: 8  },
  md: { badge: 36, radius: 10, mono: 9.5, name: 22, base: 7,   gap: 10 },
  lg: { badge: 52, radius: 14, mono: 14,  name: 33, base: 10,  gap: 14 },
}

export function LogoBadge({ size = 'md', className = '' }: { size?: Size; className?: string }) {
  const s = SIZES[size]
  return (
    <span
      aria-hidden
      className={`flex-none inline-flex items-center justify-center ${className}`}
      style={{
        width: s.badge,
        height: s.badge,
        borderRadius: s.radius,
        background: `linear-gradient(135deg, ${ICON_FROM} 0%, ${ICON_TO} 100%)`,
      }}
    >
      <span
        className="font-extrabold text-white text-center"
        style={{ fontSize: s.mono, lineHeight: 0.94, letterSpacing: '0.01em' }}
      >
        MY<br />TA
      </span>
    </span>
  )
}

export function Logo({
  size = 'md',
  tone = 'auto',
  baseline = true,
  className = '',
}: {
  size?: Size
  /** 'auto' suit le thème · 'light' force le texte blanc (fonds sombres) */
  tone?: 'auto' | 'light'
  baseline?: boolean
  className?: string
}) {
  const s = SIZES[size]
  const nameColor = tone === 'light' ? 'text-white' : 'text-[#2D2A5E] dark:text-white'
  const baseColor = tone === 'light' ? 'text-white/65' : 'text-zinc-400 dark:text-white/55'

  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: s.gap }}>
      <LogoBadge size={size} />
      <span className="flex flex-col">
        <span
          className={`font-extrabold leading-none ${nameColor}`}
          style={{ fontSize: s.name, letterSpacing: '-0.035em' }}
        >
          MYTA
        </span>
        {baseline && (
          <span
            className={`font-semibold uppercase leading-none ${baseColor}`}
            style={{ fontSize: s.base, letterSpacing: '0.26em', marginTop: s.name * 0.16 }}
          >
            My&nbsp;Twin&nbsp;App
          </span>
        )}
      </span>
    </span>
  )
}
