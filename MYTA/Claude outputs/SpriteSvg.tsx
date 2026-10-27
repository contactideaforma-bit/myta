import type { Sprite } from '@/lib/game-sprites'

/** Rend un sprite canvas (Path2D) en SVG inline pour les écrans React. */
export function SpriteSvg({ sprite, size = 48, className = '', title }: { sprite: Sprite; size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {sprite.map((sh, i) => (
        <path key={i} d={sh.d} fill={sh.fill ?? 'none'} stroke={sh.stroke} strokeWidth={sh.stroke ? (sh.lw ?? 2) : undefined}
          strokeLinecap="round" strokeLinejoin="round" opacity={sh.alpha} />
      ))}
    </svg>
  )
}
