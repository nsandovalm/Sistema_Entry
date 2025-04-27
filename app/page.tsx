import { RegistroVisitantes } from "@/components/registro-visitantes"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Registro de Visitantes</h1>
          <p className="mt-2 text-lg text-gray-600">Bienvenido al sistema de registro de visitantes</p>
        </div>
        <RegistroVisitantes />
      </div>
    </main>
  )
}
