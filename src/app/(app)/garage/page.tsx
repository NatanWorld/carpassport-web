import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Car } from '@/types'
import ShareButton from '@/components/ShareButton'
import DeleteCarButton from '@/components/DeleteCarButton'

export default async function GaragePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: cars }, { data: profile }] = await Promise.all([
    supabase
      .from('cars')
      .select('*')
      .eq('owner_id', user!.id)
      .eq('active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', user!.id)
      .single(),
  ])

  const garageUrl = profile?.username
    ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/g/${profile.username}`
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Minha Garagem</h1>
        <div className="flex gap-2">
          {garageUrl && <ShareButton url={garageUrl} />}
          <Link href="/car/add" className="btn-primary text-sm px-3 py-2">
            + Carro
          </Link>
        </div>
      </div>

      {!cars || cars.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="text-5xl">🚗</div>
          <h2 className="text-lg font-bold text-slate-900">Garagem vazia</h2>
          <p className="text-slate-500 text-sm">Adicione seu primeiro carro para começar a registrar viagens</p>
          <Link href="/car/add" className="btn-primary inline-block mt-2">
            Adicionar carro
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(cars as Car[]).map(car => (
            <div key={car.id} className="card overflow-hidden">
              {car.photo_url ? (
                <div className="relative h-44 w-full bg-slate-100">
                  <Image src={car.photo_url} alt={car.nickname || `${car.brand} ${car.model}`} fill className="object-cover" />
                  {car.is_primary && (
                    <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      ⭐ Principal
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-32 bg-slate-100 flex items-center justify-center">
                  <span className="text-4xl">🚗</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">
                      {car.nickname || `${car.brand} ${car.model}`}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      {car.brand} {car.model} · {car.year}
                    </p>
                  </div>
                  <span className="text-slate-500 text-sm font-medium shrink-0">
                    📍 {car.trip_count} viagens
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Link
                    href={`/car/${car.id}`}
                    className="btn-outline text-sm px-3 py-2"
                  >
                    Ver viagens
                  </Link>
                  <Link
                    href={`/log/add?car=${car.id}`}
                    className="btn-primary text-sm px-3 py-2"
                  >
                    + Registrar viagem
                  </Link>
                  <Link
                    href={`/car/${car.id}/edit`}
                    className="btn-outline text-sm px-3 py-2"
                  >
                    Editar
                  </Link>
                  <DeleteCarButton carId={car.id} carName={car.nickname || `${car.brand} ${car.model}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
