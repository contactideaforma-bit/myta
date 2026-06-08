import { Navbar } from '@/components/ui/Navbar'

export const metadata = { title: 'Mon compte — MYTA' }

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="page">{children}</main>
    </>
  )
}
