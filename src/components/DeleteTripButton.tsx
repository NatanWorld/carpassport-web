'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteTripButton({ logId }: { logId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Remover esta viagem?')) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('trip_logs').delete().eq('id', logId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
    >
      {loading ? '...' : 'Remover'}
    </button>
  )
}
