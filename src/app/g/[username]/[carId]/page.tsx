import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ username: string; carId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username, carId } = await params
  return {
    title: `Book de Viagens · @${username} · CarPassport`,
    description: `Viagens do carro de @${username}`,
  }
}

export default async function PublicTripBookPage({ params }: Props) {
  const { username, carId } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles_public')
    .select('id, username, full_name, avatar_url')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [{ data: car }, { data: logs }] = await Promise.all([
    supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .eq('owner_id', profile.id)
      .eq('is_public', true)
      .eq('active', true)
      .single(),
    supabase
      .from('trip_logs')
      .select('*')
      .eq('car_id', carId)
      .order('created_at', { ascending: false }),
  ])

  if (!car) notFound()

  const cities = [...new Set((logs || []).map((l: { city: string | null }) => l.city).filter(Boolean))].length
  const states = [...new Set((logs || []).map((l: { state: string | null }) => l.state).filter(Boolean))].length
  const countries = [...new Set((logs || []).map((l: { country: string }) => l.country).filter(Boolean))].length

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Back */}
        <Link href={`/g/${username}`} className="text-sm text-slate-500 hover:text-primary">
          ← Garagem de @{username}
        </Link>

        {/* Car header */}
        <div className="card overflow-hidden">
          {car.photo_url && (
            <div className="relative h-52 w-full bg-slate-100">
              <Image src={car.photo_url} alt={car.nickname || `${car.brand} ${car.model}`} fill className="object-cover" />
            </div>
          )}
          <div className="p-4">
            <h1 className="text-xl font-extrabold text-slate-900">
              {car.nickname || `${car.brand} ${car.model}`}
            </h1>
            <p className="text-slate-500 text-sm">{car.brand} {car.model} · {car.year}</p>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { label: 'Viagens', value: car.trip_count },
                { label: 'Cidades', value: cities },
                { label: 'Estados', value: states },
                { label: 'Países', value: countries },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-extrabold text-primary">{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trips */}
        <h2 className="font-bold text-slate-900">Histórico de viagens</h2>

        {!logs || logs.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm">Nenhuma viagem registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: {
              id: string
              place_name: string
              city: string | null
              state: string | null
              country: string
              photo_url: string | null
              notes: string | null
              created_at: string
            }) => (
              <div key={log.id} className="card overflow-hidden">
                {log.photo_url && (
                  <div className="relative h-40 w-full bg-slate-100">
                    <Image src={log.photo_url} alt={log.place_name} fill className="object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{log.place_name}</p>
                      <p className="text-sm text-slate-500">
                        📍 {[log.city, log.state].filter(Boolean).join(', ') || log.country}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">
                      {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {log.notes && (
                    <p className="text-sm text-slate-600 mt-2 italic">&ldquo;{log.notes}&rdquo;</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pt-4">
          <Link href="/login" className="text-primary font-medium">CarPassport</Link>
          {' '}— Registre as viagens dos seus carros
        </p>
      </div>
    </div>
  )
}
