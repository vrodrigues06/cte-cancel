import { fetchStats } from '../lib/api'

export default async function Page() {
  const stats = await fetchStats()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pendentes" value={stats.pendentes} color="bg-warning" />
        <StatCard label="Enviados" value={stats.enviados} color="bg-success" />
        <StatCard label="Erros" value={stats.erros} color="bg-error" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`inline-flex h-2 w-2 rounded-full ${color}`}></span>
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  )
}
