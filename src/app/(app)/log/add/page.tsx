'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Car } from '@/types'
import type { LocationResult } from '@/components/LocationPicker'

// Leaflet is browser-only — disable SSR
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 animate-pulse" style={{ height: 312 }} />
  ),
})

export default function AddLogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedCarId = searchParams.get('car')

  const [cars, setCars] = useState<Car[]>([])
  const [selectedCarId, setSelectedCarId] = useState<string | null>(preselectedCarId)
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [placeName, setPlaceName] = useState('')
  const [placeNameTouched, setPlaceNameTouched] = useState(false)
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('cars').select('*').eq('owner_id', user.id).eq('active', true).then(({ data }) => {
        if (!data) return
        setCars(data)
        if (!preselectedCarId && data.length > 0) {
          const primary = data.find((c: Car) => c.is_primary) || data[0]
          setSelectedCarId(primary.id)
        }
      })
    })
  }, [preselectedCarId])

  const handleLocationChange = (result: LocationResult) => {
    setLocation(result)
    // Auto-fill place name only if user hasn't typed anything yet
    if (!placeNameTouched && result.display) {
      setPlaceName(result.display)
    }
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const canSave = !!location && !!selectedCarId && placeName.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave || !location) return
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
          .from('trip-photos')
          .upload(path, photoFile, { contentType: photoFile.type, upsert: false })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('trip-photos').getPublicUrl(path)
        photoUrl = data.publicUrl
      }

      const { error: insertError } = await supabase.from('trip_logs').insert({
        car_id: selectedCarId,
        owner_id: user.id,
        place_name: placeName.trim(),
        city: location.city,
        state: location.state,
        country: location.country,
        latitude: location.lat,
        longitude: location.lng,
        altitude: null,
        photo_url: photoUrl,
        notes: notes.trim() || null,
      })

      if (insertError) throw insertError
      router.push(selectedCarId ? `/car/${selectedCarId}` : '/garage')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar viagem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700 text-sm">
          ← Voltar
        </button>
        <h1 className="text-2xl font-extrabold text-slate-900">Registrar viagem</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Map location picker */}
        <LocationPicker onLocationChange={handleLocationChange} />

        {/* Car selector */}
        {cars.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Carro</p>
            <div className="flex gap-2 flex-wrap">
              {cars.map(car => (
                <button
                  type="button"
                  key={car.id}
                  onClick={() => setSelectedCarId(car.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    selectedCarId === car.id
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {car.nickname || `${car.brand} ${car.model}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Place name */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Nome do local *
          </label>
          <input
            className="input mt-1"
            placeholder="Ex: Restaurante da Praia, Pico do Jaraguá..."
            value={placeName}
            onChange={e => { setPlaceName(e.target.value); setPlaceNameTouched(true) }}
            required
          />
        </div>

        {/* Photo */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Foto <span className="font-normal normal-case text-slate-400">— opcional</span></p>
          <div className="card overflow-hidden">
            {photoPreview ? (
              <div className="relative h-52 w-full">
                <Image src={photoPreview} alt="Preview" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 cursor-pointer hover:bg-slate-50 transition-colors gap-1">
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium text-slate-600">Adicionar foto</span>
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" capture="environment" />
              </label>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Notas <span className="font-normal normal-case text-slate-400">— opcional</span>
          </label>
          <textarea
            className="input mt-1 min-h-[80px] resize-none"
            placeholder="Conte como foi..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={!canSave || loading}
          className="btn-primary w-full"
        >
          {loading ? 'Salvando...' : 'Salvar viagem'}
        </button>
      </form>
    </div>
  )
}
