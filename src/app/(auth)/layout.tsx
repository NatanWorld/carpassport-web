export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚗</div>
          <h1 className="text-2xl font-extrabold text-slate-900">CarPassport</h1>
          <p className="text-slate-500 text-sm mt-1">Registre cada viagem dos seus carros</p>
        </div>
        {children}
      </div>
    </div>
  )
}
