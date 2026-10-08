'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Car } from '@/types'

const CURRENT_YEAR = new Date().getFullYear()

export default function EditCarPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [car, setCar] = useState<Car | null>(null)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [nickname, setNickname] = useState('')
  const [color, setColor] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('cars').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return
      setCar(data)
      setBrand(data.brand)
      setModel(data.model)
      setYear(String(data.year))
      setNickname(data.nickname || '')
      setColor(data.color || '')
    })
  }, [id])

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

      let photoUrl = car?.photo_url || null

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

      const { error: updateError } = await supabase.from('cars').update({
        brand: brand.trim(),
        model: model.trim(),
        year: parseInt(year),
        nickname: nickname.trim() || null,
        color: color.trim() || null,
        photo_url: photoUrl,
      }).eq('id', id)

      if (updateError) throw updateError
      router.push(`/car/${id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  if (!car) return <div className="p-8 text-center text-slate-400">Carregando...</div>

  const currentPhoto = photoPreview || car.photo_url

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700 text-sm">
          ← Voltar
        </button>
        <h1 className="text-2xl font-extrabold text-slate-900">Editar carro</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo */}
        <div className="card overflow-hidden">
          {currentPhoto ? (
            <div className="relative h-48 w-full">
              <Image src={currentPhoto} alt="Foto do carro" fill className="object-cover" />
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                <span className="bg-white text-slate-800 text-sm font-semibold px-3 py-2 rounded-lg">
                  📷 Trocar foto
                </span>
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" capture="environment" />
              </label>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-36 cursor-pointer hover:bg-slate-50 transition-colors">
              <span className="text-3xl mb-2">📷</span>
              <span className="text-sm font-medium text-slate-600">Adicionar foto do carro</span>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" capture="environment" />
            </label>
          )}
        </div>

        {currentPhoto && !photoPreview && (
          <button
            type="button"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = (e) => handlePhoto(e as unknown as React.ChangeEvent<HTMLInputElement>)
              input.click()
            }}
            className="btn-outline w-full text-sm"
          >
            📷 Trocar foto
          </button>
        )}

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
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
