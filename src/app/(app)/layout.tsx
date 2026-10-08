import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const needsOnboarding = !profile?.username

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/garage" className="text-lg font-extrabold text-slate-900">
            🚗 CarPassport
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/garage" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors">
              Garagem
            </Link>
            <Link href="/profile" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors">
              Perfil
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      {/* Onboarding banner */}
      {needsOnboarding && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-800">
              ⚠️ Complete seu perfil para compartilhar sua garagem
            </p>
            <Link href="/onboarding" className="text-sm font-semibold text-amber-700 underline shrink-0">
              Completar agora
            </Link>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
