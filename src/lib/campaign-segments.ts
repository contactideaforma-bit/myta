/** Segments de campagne — partagé client / serveur (aucune dépendance Node). */
export type Segment = 'all' | 'never' | 'dormant' | 'trial' | 'premium'
export const SEGMENTS: { key: Segment; label: string; hint: string }[] = [
  { key: 'all',     label: 'Tous les adhérents',    hint: 'tous les comptes avec un e-mail' },
  { key: 'dormant', label: 'Dormants',              hint: 'aucune ouverture depuis 30 jours' },
  { key: 'never',   label: 'Jamais connectés',      hint: 'compte créé, app jamais ouverte' },
  { key: 'trial',   label: 'Essai / gratuits',      hint: 'non abonnés : à convaincre' },
  { key: 'premium', label: 'Abonnés & partenaires', hint: 'Premium actifs, VIP, partenaires' },
]
