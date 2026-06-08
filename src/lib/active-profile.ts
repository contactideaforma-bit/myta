/**
 * Utilitaire pour détecter le profil actif (parent ou enfant).
 * Lit localStorage — à appeler côté client uniquement.
 */
export interface ActiveProfile {
  isChild:     boolean
  childId:     string | null  // UUID sans le préfixe 'ch_'
  viewingName: string
  viewingId:   string         // valeur brute du localStorage
}

export function getActiveProfile(): ActiveProfile {
  if (typeof window === 'undefined') {
    return { isChild: false, childId: null, viewingName: '', viewingId: '' }
  }
  const id   = localStorage.getItem('myta_viewing_as_id')   ?? ''
  const name = localStorage.getItem('myta_viewing_as_name') ?? ''
  const isChild = id.startsWith('ch_')
  return {
    isChild,
    childId:     isChild ? id.slice(3) : null,
    viewingName: name,
    viewingId:   id,
  }
}
