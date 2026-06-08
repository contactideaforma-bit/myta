import { Navbar } from '@/components/ui/Navbar'

export const metadata = { title: 'Ma famille — MYTA' }

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="page">{children}</main>
    </>
  )
}
