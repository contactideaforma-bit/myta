import type { Metadata } from 'next'
import { Navbar } from '@/components/ui/Navbar'

export const metadata: Metadata = { title: 'Amis & Challenges — MYTA' }

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}
