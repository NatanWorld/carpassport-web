import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import DeleteTripButton from '@/components/DeleteTripButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CarPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: car }, { data: logs }] = await Promise.all([
    supabase.from('cars').select('*').eq('id', id).eq('owner_id', user!.id).single(),
    supabase
      .from('trip_logs')
      .select('*')
      .eq('car_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!car) notFound()

  const stats = {
    trips: car.trip_count,
    cities: [...new Set((logs || []).map((l: { city: string | null }) => l.city).filter(Boolean))].length,
    states: [...new Set((logs || []).map((l: { state: string | null }) => l.state).filter(Boolean))].length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/garage" className="text-slate-500 hover:text-slate-700 text-sm">← Garagem</Link>
        <Link href={`/car/${id}/edit`} className="btn-outline text-sm px-3 py-1.5">Editar</Link>
      </div>

      {/* Car card */}
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
          <p className="text-slate-500 text-sm mt-0.5">{car.brand} {car.model} · {car.year}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Viagens', value: stats.trips },
              { label: 'Cidades', value: stats.cities },
              { label: 'Estados', value: stats.states },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-extrabold text-primary">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add trip */}
      <Link href={`/log/add?car=${car.id}`} className="btn-primary w-full text-center block">
        + Registrar viagem
      </Link>

      {/* Trips list */}
      <div className="space-y-3">
        <h2 className="font-bold text-slate-900">Viagens</h2>

        {!logs || logs.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-sm">Nenhuma viagem registrada ainda</p>
          </div>
        ) : (
          logs.map((log: {
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
                <div className="relative h-36 w-full bg-slate-100">
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
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <DeleteTripButton logId={log.id} />
                  </div>
                </div>
                {log.notes && (
                  <p className="text-sm text-slate-600 mt-2 italic">&ldquo;{log.notes}&rdquo;</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
