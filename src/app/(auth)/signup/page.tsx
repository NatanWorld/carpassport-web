'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() } },
      })
      if (error) { setError(error.message); return }
      router.push('/onboarding')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Criar conta</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-3">
        <input
          className="input"
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoComplete="name"
        />
        <input
          className="input"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className="input"
          type="password"
          placeholder="Senha (mínimo 6 caracteres)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
