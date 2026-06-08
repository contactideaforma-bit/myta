'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * /billing est désormais fusionné dans /account.
 * Cette page redirige automatiquement.
 */
export default function BillingRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/account')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-zinc-400" />
    </div>
  )
}
