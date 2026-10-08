import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import type { Car } from '@/types'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return {
    title: `@${username} · CarPassport`,
    description: `Garagem pública de @${username}`,
  }
}

export default async function PublicGaragePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles_public')
    .select('id, username, full_name, avatar_url, bio')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: cars } = await supabase
    .from('cars')
    .select('*')
    .eq('owner_id', profile.id)
    .eq('is_public', true)
    .eq('active', true)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
              <Image src={profile.avatar_url} alt={profile.full_name || username} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl shrink-0">
              👤
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{profile.full_name || `@${username}`}</h1>
            <p className="text-slate-500 text-sm">@{username}</p>
            {profile.bio && <p className="text-slate-600 text-sm mt-1">{profile.bio}</p>}
          </div>
        </div>

        {/* Branding */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-700">Garagem</h2>
          <Link href="/login" className="text-xs text-primary font-medium">
            🚗 CarPassport
          </Link>
        </div>

        {/* Cars */}
        {!cars || cars.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            <div className="text-3xl mb-2">🚗</div>
            <p className="text-sm">Nenhum carro na garagem ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(cars as Car[]).map(car => (
              <div key={car.id} className="card overflow-hidden">
                {car.photo_url ? (
                  <div className="relative h-44 w-full bg-slate-100">
                    <Image src={car.photo_url} alt={car.nickname || `${car.brand} ${car.model}`} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-28 bg-slate-100 flex items-center justify-center text-4xl">🚗</div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900">{car.nickname || `${car.brand} ${car.model}`}</h3>
                      <p className="text-slate-500 text-sm">{car.brand} {car.model} · {car.year}</p>
                    </div>
                    <span className="text-slate-500 text-sm font-medium shrink-0">
                      📍 {car.trip_count}
                    </span>
                  </div>
                  <Link
                    href={`/g/${username}/${car.id}`}
                    className="block mt-3 text-center text-sm font-semibold text-primary border border-primary/30 rounded-xl py-2 hover:bg-blue-50 transition-colors"
                  >
                    Ver viagens →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pt-4">
          Feito com{' '}
          <Link href="/login" className="text-primary font-medium">CarPassport</Link>
        </p>
      </div>
    </div>
  )
}
