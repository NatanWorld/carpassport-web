import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="text-5xl mb-4">🗺️</div>
      <h1 className="text-2xl font-extrabold text-slate-900">Página não encontrada</h1>
      <p className="text-slate-500 mt-2">Este endereço não existe</p>
      <Link href="/" className="btn-primary mt-6 inline-block">
        Ir para o início
      </Link>
    </div>
  )
}
