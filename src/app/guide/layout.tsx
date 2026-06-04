import { Navbar } from '@/components/ui/Navbar'

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}
