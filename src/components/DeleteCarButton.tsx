'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  carId: string
  carName: string
}

export default function DeleteCarButton({ carId, carName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Remover "${carName}" da garagem?`)) return
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.from('cars').update({ active: false }).eq('id', carId)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all disabled:opacity-40"
    >
      {loading ? '...' : 'Remover'}
    </button>
  )
}
