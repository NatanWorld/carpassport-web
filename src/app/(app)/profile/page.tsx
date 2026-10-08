'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data)
          setFullName(data.full_name || '')
          setUsername(data.username || '')
          setBio(data.bio || '')
        }
      })
    })
  }, [])

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      let avatarUrl = profile?.avatar_url || null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: false })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }

      const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      if (username.trim() && clean !== username.trim()) {
        throw new Error('Username pode ter apenas letras minúsculas, números e _')
      }

      const { error: updateError } = await supabase.from('profiles').update({
        full_name: fullName.trim(),
        username: clean || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      }).eq('id', user.id)

      if (updateError) {
        if (updateError.code === '23505') throw new Error('Este username já está em uso')
        throw updateError
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const currentAvatar = avatarPreview || profile?.avatar_url

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Meu Perfil</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">✓ Perfil salvo</div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            {currentAvatar ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden">
                <Image src={currentAvatar} alt="Avatar" fill className="object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-3xl">
                👤
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
          </label>
          <div>
            <p className="font-semibold text-slate-900">{fullName || 'Seu nome'}</p>
            <p className="text-sm text-slate-500">@{username || 'username'}</p>
            <p className="text-xs text-slate-400 mt-1">Toque na foto para trocar</p>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome completo</label>
            <input className="input mt-1" placeholder="Seu nome" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Username</label>
            <div className="flex items-center mt-1">
              <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-3 py-3 text-slate-500 text-sm">@</span>
              <input
                className="input rounded-l-none flex-1"
                placeholder="seuusername"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Usado no link da sua garagem pública</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bio</label>
            <textarea
              className="input mt-1 min-h-[70px] resize-none"
              placeholder="Conte um pouco sobre você..."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>
        </div>

        {username && (
          <div className="card p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-700">
              Sua garagem pública: <strong>/g/{username}</strong>
            </p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </div>
  )
}
