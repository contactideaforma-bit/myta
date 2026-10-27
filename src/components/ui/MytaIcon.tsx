/**
 * Pictogrammes MYTA — famille « pleins organiques » (piste B, 27/10/2026).
 *
 * Aucun contour : des masses rondes d'un seul ton (currentColor) et une
 * « entaille » claire qui fait la lecture. Grille 32 × 32, rendus à 16-28 px.
 * L'entaille utilise `var(--icon-cut, #fff)` : sur fond coloré elle reste
 * blanche, sur une carte sombre on peut la passer à la couleur de la carte.
 *
 * Usage : <MytaIcon name="journal" size={22} className="text-nutri" />
 * Variante contour (onglet inactif) : <MytaIcon name="journal" outline />
 */

export type MytaIconName =
  | 'home' | 'journal' | 'sport' | 'sleep' | 'recipe' | 'waty' | 'plus' | 'close'
  | 'bell' | 'menu' | 'back' | 'chevron' | 'calendar' | 'water' | 'flame' | 'sparkle'
  | 'check' | 'chart' | 'user' | 'friends' | 'games' | 'settings' | 'logout' | 'help'
  | 'sun' | 'moon' | 'report' | 'timer' | 'history' | 'advice' | 'target' | 'news' | 'eye'

interface Props {
  name: MytaIconName
  size?: number
  className?: string
  /** Version contour fin (onglets inactifs) */
  outline?: boolean
  title?: string
  style?: React.CSSProperties
}

const CUT = 'var(--icon-cut, #fff)'

/** Formes pleines : fill = currentColor, entailles = CUT */
const FILL: Record<MytaIconName, JSX.Element> = {
  home: <>
    <path d="M16 5c1 0 2 .4 2.7 1.1l7.6 7A4 4 0 0 1 27.6 16V24a4 4 0 0 1-4 4H8.4a4 4 0 0 1-4-4v-8a4 4 0 0 1 1.3-2.9l7.6-7A4 4 0 0 1 16 5z" />
    <rect x="13" y="18" width="6" height="10" rx="3" fill={CUT} />
  </>,
  journal: <>
    <path d="M3.5 14.5A3 3 0 0 1 6.5 12h19a3 3 0 0 1 3 2.5C27.8 22 22.5 27 16 27S4.2 22 3.5 14.5z" />
    <path d="M8 10c1-3 4.5-5 8-5s7 2 8 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M9 17c1.5 3 4 4.5 7 4.5" fill="none" stroke={CUT} strokeWidth="2.4" strokeLinecap="round" />
  </>,
  sport: <>
    <rect x="3" y="12" width="26" height="8" rx="4" />
    <rect x="4" y="8" width="6" height="16" rx="3" />
    <rect x="22" y="8" width="6" height="16" rx="3" />
    <path d="M12 16h8" stroke={CUT} strokeWidth="2.4" strokeLinecap="round" />
  </>,
  sleep: <>
    <path d="M18 4a12 12 0 1 0 10 18 9.5 9.5 0 0 1-10-18z" />
    <path d="M24 5l.9 2.1L27 8l-2.1.9L24 11l-.9-2.1L21 8l2.1-.9z" />
    <path d="M11 17c1 2.5 3 4 6 4.5" fill="none" stroke={CUT} strokeWidth="2.4" strokeLinecap="round" />
  </>,
  recipe: <>
    <path d="M9 3h14a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" />
    <path d="M10 11h12M10 16h12M10 21h7" stroke={CUT} strokeWidth="2.4" strokeLinecap="round" />
  </>,
  waty: <>
    <path d="M16 3c7 0 11 4.5 11 11 0 8-7 11-11 15C12 25 5 22 5 14 5 7.5 9 3 16 3z" />
    <circle cx="12.5" cy="13" r="1.9" fill={CUT} />
    <circle cx="19.5" cy="13" r="1.9" fill={CUT} />
    <path d="M12 18c1.2 1.6 2.6 2.4 4 2.4s2.8-.8 4-2.4" fill="none" stroke={CUT} strokeWidth="2" strokeLinecap="round" />
  </>,
  plus: <>
    <path d="M16 5v22M5 16h22" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </>,
  close: <>
    <path d="M8 8l16 16M24 8L8 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
  </>,
  bell: <>
    <path d="M16 3a9 9 0 0 0-9 9v5l-2.4 4A1.5 1.5 0 0 0 5.9 23h20.2a1.5 1.5 0 0 0 1.3-2L25 17v-5a9 9 0 0 0-9-9z" />
    <path d="M12.5 25a3.5 3.5 0 0 0 7 0z" />
    <path d="M11 13a5 5 0 0 1 3-4.5" fill="none" stroke={CUT} strokeWidth="2.2" strokeLinecap="round" />
  </>,
  menu: <>
    <rect x="4" y="7" width="24" height="5" rx="2.5" />
    <rect x="4" y="13.5" width="24" height="5" rx="2.5" />
    <rect x="4" y="20" width="15" height="5" rx="2.5" />
  </>,
  back: <>
    <path d="M14 7l-8 9 8 9" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 16h19" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
  </>,
  chevron: <>
    <path d="M12 7l9 9-9 9" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  calendar: <>
    <rect x="4" y="6" width="24" height="22" rx="5" />
    <path d="M4 13h24" stroke={CUT} strokeWidth="2.2" />
    <rect x="9" y="17" width="5" height="5" rx="1.5" fill={CUT} />
  </>,
  water: <>
    <path d="M16 3c4 6 9 11 9 17a9 9 0 0 1-18 0c0-6 5-11 9-17z" />
    <path d="M11 20a5 5 0 0 0 4 5" fill="none" stroke={CUT} strokeWidth="2.2" strokeLinecap="round" />
  </>,
  flame: <>
    <path d="M16 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1 0-2-1-3 3 2 6 5 6 9a8 8 0 0 1-16 0c0-6 8-8 8-15z" />
    <path d="M13 24a3 3 0 0 0 6 0c0-2-3-4-3-4s-3 2-3 4z" fill={CUT} />
  </>,
  sparkle: <>
    <path d="M16 3l2.6 7.4L26 13l-7.4 2.6L16 23l-2.6-7.4L6 13l7.4-2.6z" />
    <path d="M25 21l1 2.6 2.6 1-2.6 1L25 28.2l-1-2.6-2.6-1 2.6-1z" />
  </>,
  check: <>
    <path d="M6 17l6.5 6.5L26 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  chart: <>
    <rect x="4" y="17" width="6" height="11" rx="3" />
    <rect x="13" y="9" width="6" height="19" rx="3" />
    <rect x="22" y="4" width="6" height="24" rx="3" />
  </>,
  user: <>
    <circle cx="16" cy="10" r="6" />
    <path d="M4 28a12 12 0 0 1 24 0z" />
  </>,
  friends: <>
    <circle cx="11" cy="10" r="5" />
    <circle cx="22" cy="12" r="4" />
    <path d="M2 26a9 9 0 0 1 18 0z" />
    <path d="M18 26a7.5 7.5 0 0 1 12-6v6z" />
  </>,
  games: <>
    <path d="M9 9h14a7 7 0 0 1 7 7v2a7 7 0 0 1-12 5l-2-2-2 2a7 7 0 0 1-12-5v-2a7 7 0 0 1 7-7z" />
    <path d="M9 14v6M6 17h6" stroke={CUT} strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="23" cy="15" r="1.7" fill={CUT} /><circle cx="23" cy="20" r="1.7" fill={CUT} />
  </>,
  settings: <>
    <path d="M14 3h4l.8 3.4 3 1.2 3-1.8 2.8 2.8-1.8 3 1.2 3L30 14v4l-3.4.8-1.2 3 1.8 3-2.8 2.8-3-1.8-3 1.2L18 29h-4l-.8-3.4-3-1.2-3 1.8-2.8-2.8 1.8-3-1.2-3L2 18v-4l3.4-.8 1.2-3-1.8-3 2.8-2.8 3 1.8 3-1.2z" />
    <circle cx="16" cy="16" r="4.5" fill={CUT} />
  </>,
  logout: <>
    <path d="M14 4h-5a5 5 0 0 0-5 5v14a5 5 0 0 0 5 5h5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    <path d="M13 16h15M23 10l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  help: <>
    <circle cx="16" cy="16" r="13" />
    <path d="M12.5 12.5a3.5 3.5 0 1 1 5 3.2c-1 .6-1.5 1.3-1.5 2.3" fill="none" stroke={CUT} strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="16" cy="22.5" r="1.6" fill={CUT} />
  </>,
  sun: <>
    <circle cx="16" cy="16" r="6.5" />
    <path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </>,
  moon: <>
    <path d="M18 4a12 12 0 1 0 10 18 9.5 9.5 0 0 1-10-18z" />
  </>,
  report: <>
    <path d="M16 3L2 27h28z" />
    <path d="M16 12v7" stroke={CUT} strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="16" cy="23" r="1.6" fill={CUT} />
  </>,
  timer: <>
    <circle cx="16" cy="18" r="11" />
    <rect x="12" y="2" width="8" height="4" rx="2" />
    <path d="M16 12v6l4 3" fill="none" stroke={CUT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  history: <>
    <circle cx="16" cy="16" r="13" />
    <path d="M16 9v7l5 3" fill="none" stroke={CUT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  advice: <>
    <path d="M16 3a9 9 0 0 0-5 16.5V23a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5A9 9 0 0 0 16 3z" />
    <rect x="12" y="26" width="8" height="3" rx="1.5" />
    <path d="M13 12a3.5 3.5 0 0 1 3-3" fill="none" stroke={CUT} strokeWidth="2.2" strokeLinecap="round" />
  </>,
  target: <>
    <circle cx="16" cy="16" r="13" />
    <circle cx="16" cy="16" r="8" fill={CUT} />
    <circle cx="16" cy="16" r="3.5" />
  </>,
  news: <>
    <rect x="3" y="5" width="26" height="22" rx="5" />
    <rect x="7" y="10" width="8" height="7" rx="2" fill={CUT} />
    <path d="M18 11h7M18 16h7M7 22h18" stroke={CUT} strokeWidth="2" strokeLinecap="round" />
  </>,
  eye: <>
    <path d="M2 16c3.5-6 8-9 14-9s10.5 3 14 9c-3.5 6-8 9-14 9S5.5 22 2 16z" />
    <circle cx="16" cy="16" r="5" fill={CUT} />
    <circle cx="16" cy="16" r="2.2" />
  </>,
}

/** Contours (onglets inactifs) — mêmes silhouettes, trait 2.4 */
const OUTLINE: Partial<Record<MytaIconName, JSX.Element>> = {
  home: <path d="M16 5c1 0 2 .4 2.7 1.1l7.6 7A4 4 0 0 1 27.6 16V24a4 4 0 0 1-4 4H8.4a4 4 0 0 1-4-4v-8a4 4 0 0 1 1.3-2.9l7.6-7A4 4 0 0 1 16 5zM13 28v-8a3 3 0 0 1 6 0v8" />,
  journal: <><path d="M4.5 13h23c0 7-5 12-11.5 12S4.5 20 4.5 13z" /><path d="M8 10c1-3 4.5-5 8-5s7 2 8 5" /></>,
  sport: <><rect x="3" y="12" width="26" height="8" rx="4" /><rect x="4" y="8" width="6" height="16" rx="3" /><rect x="22" y="8" width="6" height="16" rx="3" /></>,
  sleep: <><path d="M18 4a12 12 0 1 0 10 18 9.5 9.5 0 0 1-10-18z" /><path d="M24 5l.9 2.1L27 8l-2.1.9L24 11l-.9-2.1L21 8l2.1-.9z" /></>,
  recipe: <><path d="M9 3h14a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" /><path d="M10 11h12M10 16h12M10 21h7" /></>,
}

export function MytaIcon({ name, size = 22, className = '', outline = false, title, style }: Props) {
  const o = outline ? OUTLINE[name] : undefined
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32"
      className={className} style={style}
      fill={o ? 'none' : 'currentColor'}
      stroke={o ? 'currentColor' : undefined}
      strokeWidth={o ? 2.4 : undefined}
      strokeLinecap="round" strokeLinejoin="round"
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
    >
      {o ?? FILL[name]}
    </svg>
  )
}
