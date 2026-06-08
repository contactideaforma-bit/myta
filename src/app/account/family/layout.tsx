import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ma famille — MYTA' }

// Le layout parent /account/layout.tsx fournit déjà Navbar + main.page
// Ce layout est un simple passthrough pour éviter le double-rendu
export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
