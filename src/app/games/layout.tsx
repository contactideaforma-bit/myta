import type { Metadata } from 'next'
import { Navbar } from '@/components/ui/Navbar'

export const metadata: Metadata = { title: 'Mini-jeux Waty — MYTA' }

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}
