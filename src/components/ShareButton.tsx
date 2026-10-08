'use client'

import { useState } from 'react'

export default function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Minha Garagem · MyCarPassport', url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button onClick={handleShare} className="btn-outline text-sm px-3 py-2">
      {copied ? '✓ Copiado' : '🔗 Compartilhar'}
    </button>
  )
}
