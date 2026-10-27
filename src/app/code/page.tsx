'use client'

/** /code?c=XXXX — page d'atterrissage d'un code promo partagé par un partenaire. */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PromoCodeBox } from '@/components/ui/PromoCodeBox'
import { MytaIllustration } from '@/components/ui/MytaIllustration'

export default function CodePage() {
  const router = useRouter()
  const [initial, setInitial] = useState('')
  useEffect(() => { setInitial(new URLSearchParams(window.location.search).get('c')?.toUpperCase() ?? '') }, [])
  return (
    <div className="page">
      <div className="card-hero flex flex-col items-center gap-3 text-center">
        <MytaIllustration name="trophee" size={64} />
        <h1 className="text-xl font-extrabold t-text tracking-tight">Tu as un code ?</h1>
        <p className="text-sm t-muted">Entre le code partagé par ton créateur préféré : les jours de Premium s'ajoutent à ton compte.</p>
        <div className="w-full"><PromoCodeBox initialCode={initial} onSuccess={() => setTimeout(() => router.push('/dashboard'), 1500)} /></div>
      </div>
    </div>
  )
}
