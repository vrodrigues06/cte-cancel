import { fetchAuthorizations } from '../../lib/api'
import AuthorizationTable from '../../components/AuthorizationTable'
import SpreadsheetUploader from '../../components/SpreadsheetUploader'

export default async function AuthorizationsPage({ searchParams }: { searchParams?: { q?: string; status?: string; page?: string } }) {
  const page = Number(searchParams?.page ?? '1')
  const offset = (page - 1) * 50
  const q = searchParams?.q
  const status = searchParams?.status

  const data = await fetchAuthorizations({ q, status, offset, limit: 50 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Autorizações</h1>
        <SpreadsheetUploader />
      </div>
      <AuthorizationTable data={data} />
    </div>
  )
}
