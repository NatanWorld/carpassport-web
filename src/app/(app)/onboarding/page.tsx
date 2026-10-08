'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      if (!clean) throw new Error('Username inválido')

      const { error: updateError } = await supabase.from('profiles').update({
        username: clean,
        full_name: fullName.trim() || null,
      }).eq('id', user.id)

      if (updateError) {
        if (updateError.code === '23505') throw new Error('Este username já está em uso')
        throw updateError
      }

      router.push('/garage')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🚗</div>
          <h1 className="text-2xl font-extrabold text-slate-900">Bem-vindo ao CarPassport!</h1>
          <p className="text-slate-500 text-sm mt-1">Escolha seu username para começar</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</label>
            <input
              className="input mt-1"
              placeholder="Seu nome"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Username *</label>
            <div className="flex items-center mt-1">
              <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-3 py-3 text-slate-500 text-sm">@</span>
              <input
                className="input rounded-l-none"
                placeholder="seuusername"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Link: /g/{username || 'seuusername'}</p>
          </div>

          <button type="submit" disabled={loading || !username} className="btn-primary w-full">
            {loading ? 'Salvando...' : 'Começar →'}
          </button>
        </form>
      </div>
    </div>
  )
}
