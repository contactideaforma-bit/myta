/**
 * Illustrations vectorielles MYTA — petites scènes en aplats (3-4 couleurs,
 * ombre douce, reflet). Validées le 27/10/2026.
 *
 * Elles remplacent les emojis et les pictogrammes dans ce qui a de la place
 * (≥ 40 px) : tuiles, feuille « Ajouter », états vides, badges. Les pictogrammes
 * (MytaIcon) restent pour la barre d'onglets et les boutons.
 *
 * Grille 64 × 64. Couleurs fixes (l'illustration porte la couleur, la tuile
 * reste neutre) ; `shadow` ajoute l'ombre portée au sol.
 */

export type MytaIllustrationName = 'repas' | 'seance' | 'nuit' | 'recette' | 'eau' | 'waty' | 'trophee' | 'vide' | 'maison' | 'micro' | 'photo' | 'gelules'

interface Props {
  name: MytaIllustrationName
  size?: number
  className?: string
  shadow?: boolean
  title?: string
}

const ART: Record<MytaIllustrationName, JSX.Element> = {
  repas: <>
    <path d="M8 30h48c0 13-10 22-24 22S8 43 8 30z" fill="#4B47A0" />
    <path d="M8 30h48c0 4-1 8-3 11H11c-2-3-3-7-3-11z" fill="#3B3780" />
    <path d="M12 30c0-9 9-14 20-14s20 5 20 14z" fill="#CFF5DD" />
    <circle cx="24" cy="24" r="5" fill="#F97316" />
    <circle cx="36" cy="22" r="5.5" fill="#22C55E" />
    <circle cx="45" cy="26" r="4" fill="#FBBF24" />
    <path d="M28 29c3-3 7-3 10 0" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 36c4 10 12 12 18 12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.45" />
  </>,
  seance: <>
    <rect x="18" y="28" width="28" height="8" rx="4" fill="#5C60C0" />
    <rect x="8" y="20" width="10" height="24" rx="4" fill="#7B7FD4" />
    <rect x="46" y="20" width="10" height="24" rx="4" fill="#7B7FD4" />
    <rect x="4" y="25" width="5" height="14" rx="2.5" fill="#3B3780" />
    <rect x="55" y="25" width="5" height="14" rx="2.5" fill="#3B3780" />
    <path d="M11 24h4M49 24h4" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    <circle cx="32" cy="14" r="4" fill="#22C55E" />
    <path d="M26 10l2-4M38 10l-2-4" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
  </>,
  nuit: <>
    <circle cx="32" cy="32" r="26" fill="#EDE9FE" />
    <path d="M38 10a20 20 0 1 0 16 30 15 15 0 0 1-16-30z" fill="#7C3AED" />
    <path d="M44 14a16 16 0 0 0 4 22" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
    <path d="M48 8l1.2 2.8 2.8 1.2-2.8 1.2L48 16l-1.2-2.8L44 12l2.8-1.2z" fill="#FBBF24" />
    <circle cx="54" cy="24" r="1.6" fill="#FBBF24" />
    <path d="M8 46h18a5 5 0 0 0 0-10 7 7 0 0 0-13-2 5 5 0 0 0-5 12z" fill="#fff" />
  </>,
  recette: <>
    <rect x="18" y="6" width="28" height="50" rx="7" fill="#15152A" />
    <rect x="21" y="10" width="22" height="42" rx="4" fill="#fff" />
    <rect x="24" y="14" width="16" height="12" rx="3" fill="#FED7AA" />
    <circle cx="32" cy="20" r="4" fill="#F97316" />
    <path d="M25 31h14M25 36h14M25 41h9" stroke="#C9C9DD" strokeWidth="2" strokeLinecap="round" />
    <path d="M44 30l12-6-3 12z" fill="#22C55E" />
    <circle cx="40" cy="46" r="4.5" fill="#F97316" />
    <path d="M38.3 46h3.4M40 44.3v3.4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
  </>,
  eau: <>
    <path d="M18 10h28l-3 42a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4z" fill="#E0F2FE" />
    <path d="M20.5 26h23l-1.6 26a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z" fill="#06B6D4" />
    <path d="M20.5 26c4 2 8-2 11.5 0s7.5 2 11.5 0" fill="none" stroke="#67E8F9" strokeWidth="3" strokeLinecap="round" />
    <path d="M24 32v18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
    <circle cx="36" cy="40" r="2" fill="#fff" opacity="0.6" />
    <circle cx="33" cy="47" r="1.3" fill="#fff" opacity="0.6" />
  </>,
  waty: <>
    <path d="M8 30a24 24 0 0 0 48 0z" fill="#22C55E" />
    <path d="M12 30a20 20 0 0 0 40 0z" fill="#F0FDF4" />
    <path d="M15 30a17 17 0 0 0 34 0z" fill="#FB7185" />
    <path d="M19 30a13 13 0 0 0 26 0z" fill="#F43F5E" />
    <ellipse cx="25" cy="35" rx="1.6" ry="2.4" fill="#15152A" transform="rotate(-20 25 35)" />
    <ellipse cx="39" cy="35" rx="1.6" ry="2.4" fill="#15152A" transform="rotate(20 39 35)" />
    <circle cx="27" cy="38" r="2" fill="#fff" />
    <circle cx="37" cy="38" r="2" fill="#fff" />
    <circle cx="27.6" cy="38.4" r="1" fill="#15152A" />
    <circle cx="37.6" cy="38.4" r="1" fill="#15152A" />
    <path d="M29 43c2 1.6 4 1.6 6 0" fill="none" stroke="#15152A" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M16 26c6-8 26-8 32 0" fill="none" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
  </>,
  trophee: <>
    <path d="M18 8h28v16a14 14 0 0 1-28 0z" fill="#FBBF24" />
    <path d="M18 14h-6a2 2 0 0 0-2 2v4a9 9 0 0 0 9 9M46 14h6a2 2 0 0 1 2 2v4a9 9 0 0 1-9 9" fill="none" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
    <rect x="28" y="38" width="8" height="8" fill="#F59E0B" />
    <rect x="20" y="46" width="24" height="7" rx="3" fill="#D97706" />
    <path d="M25 13a6 6 0 0 1 4-3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
    <path d="M32 18l1.5 3.2 3.5.5-2.5 2.5.6 3.5-3.1-1.7-3.1 1.7.6-3.5-2.5-2.5 3.5-.5z" fill="#fff" opacity="0.9" />
  </>,
  maison: <>
    <path d="M32 8L6 30h7v22a3 3 0 0 0 3 3h32a3 3 0 0 0 3-3V30h7z" fill="#4B47A0" />
    <path d="M32 8L6 30h7l19-16 19 16h7z" fill="#3B3780" />
    <rect x="26" y="36" width="12" height="19" rx="5" fill="#FBBF24" />
    <rect x="40" y="34" width="8" height="8" rx="2" fill="#E0F2FE" />
    <rect x="16" y="34" width="8" height="8" rx="2" fill="#E0F2FE" />
    <path d="M14 34c0 8 4 14 10 17" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
    <path d="M46 10h5v10l-5-4z" fill="#22C55E" />
  </>,
  micro: <>
    <rect x="22" y="6" width="20" height="34" rx="10" fill="#22C55E" />
    <rect x="26" y="10" width="5" height="22" rx="2.5" fill="#fff" opacity="0.45" />
    <path d="M14 30a18 18 0 0 0 36 0" fill="none" stroke="#15803D" strokeWidth="4" strokeLinecap="round" />
    <path d="M32 48v8M22 56h20" stroke="#15803D" strokeWidth="4" strokeLinecap="round" />
    <path d="M50 14c3 3 3 7 0 10M55 9c6 6 6 14 0 20" fill="none" stroke="#86EFAC" strokeWidth="3" strokeLinecap="round" />
  </>,
  photo: <>
    <path d="M8 20a6 6 0 0 1 6-6h8l4-6h12l4 6h8a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#2563EB" />
    <path d="M8 20a6 6 0 0 1 6-6h8l4-6h12l4 6h8a6 6 0 0 1 6 6v4H8z" fill="#1D4ED8" />
    <circle cx="32" cy="34" r="12" fill="#E0F2FE" />
    <circle cx="32" cy="34" r="7" fill="#0EA5E9" />
    <circle cx="29" cy="31" r="2.2" fill="#fff" opacity="0.8" />
    <circle cx="49" cy="21" r="2.5" fill="#FBBF24" />
  </>,
  gelules: <>
    <rect x="10" y="22" width="30" height="14" rx="7" transform="rotate(-30 25 29)" fill="#A855F7" />
    <path d="M18 36l12-21" stroke="#fff" strokeWidth="3" strokeLinecap="round" transform="rotate(-30 25 29)" opacity="0.45" />
    <rect x="28" y="30" width="30" height="14" rx="7" transform="rotate(25 43 37)" fill="#F3E8FF" />
    <rect x="43" y="30" width="15" height="14" rx="7" transform="rotate(25 43 37)" fill="#7C3AED" />
    <circle cx="20" cy="48" r="4" fill="#22C55E" /><circle cx="30" cy="52" r="3" fill="#FBBF24" />
  </>,
  vide: <>
    <path d="M10 30h44c0 11-9 19-22 19S10 41 10 30z" fill="#DCDBF6" />
    <path d="M14 30c0-8 8-12 18-12s18 4 18 12z" fill="#fff" />
    <path d="M20 29c4-4 8-4 12 0" fill="none" stroke="#C9C9DD" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 5" />
    <path d="M16 36c3 7 9 9 14 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
  </>,
}

export function MytaIllustration({ name, size = 48, className = '', shadow = false, title }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {shadow && <ellipse cx="32" cy="56" rx="20" ry="4" fill="#15152A" opacity="0.07" />}
      {ART[name]}
    </svg>
  )
}
