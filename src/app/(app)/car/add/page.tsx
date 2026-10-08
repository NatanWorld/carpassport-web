'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const CURRENT_YEAR = new Date().getFullYear()

export default function AddCarPage() {
  const router = useRouter()
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [nickname, setNickname] = useState('')
  const [color, setColor] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      let photoUrl: string | null = null
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('car-photos')
          .upload(path, photoFile, { contentType: photoFile.type, upsert: false })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('car-photos').getPublicUrl(path)
        photoUrl = data.publicUrl
      }

      const { error: insertError } = await supabase.from('cars').insert({
        owner_id: user.id,
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year),
        nickname: nickname.trim() || null,
        color: color.trim() || null,
        photo_url: photoUrl,
        is_primary: false,
        is_public: true,
      })

      if (insertError) throw insertError
      router.push('/garage')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar carro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700">
          ← Voltar
        </button>
        <h1 className="text-2xl font-extrabold text-slate-900">Novo carro</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo */}
        <div className="card overflow-hidden">
          {photoPreview ? (
            <div className="relative h-48 w-full">
              <Image src={photoPreview} alt="Preview" fill className="object-cover" />
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg"
              >
                Trocar
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-36 cursor-pointer hover:bg-slate-50 transition-colors">
              <span className="text-3xl mb-2">📷</span>
              <span className="text-sm font-medium text-slate-600">Adicionar foto do carro</span>
              <span className="text-xs text-slate-400 mt-1">opcional</span>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" capture="environment" />
            </label>
          )}
        </div>

        <div className="card p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Marca *</label>
              <input className="input mt-1" placeholder="Toyota" value={brand} onChange={e => setBrand(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Modelo *</label>
              <input className="input mt-1" placeholder="Corolla" value={model} onChange={e => setModel(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ano *</label>
              <input
                className="input mt-1"
                type="number"
                placeholder={String(CURRENT_YEAR)}
                value={year}
                onChange={e => setYear(e.target.value)}
                min={1900}
                max={CURRENT_YEAR + 1}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cor</label>
              <input className="input mt-1" placeholder="Prata" value={color} onChange={e => setColor(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Apelido</label>
            <input className="input mt-1" placeholder="Ex: Corolla Prata" value={nickname} onChange={e => setNickname(e.target.value)} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Salvando...' : 'Salvar carro'}
        </button>
      </form>
    </div>
  )
}
