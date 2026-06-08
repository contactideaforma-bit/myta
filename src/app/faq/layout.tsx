import { Navbar } from '@/components/ui/Navbar'

export const metadata = { title: 'FAQ — MYTA' }

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="page">{children}</main>
    </>
  )
}
