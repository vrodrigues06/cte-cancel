import { fetchStats, fetchCtes } from "../lib/api";
import CteTable from "../components/CteTable";
import SpreadsheetUploader from "../components/SpreadsheetUploader";
import XmlBatchUploader from "../components/XmlBatchUploader";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ offset?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const stats = await fetchStats();
  const offset = Number(params?.offset ?? 0) || 0;
  const limit = Number(params?.limit ?? 50) || 50;
  const data = await fetchCtes({ offset, limit });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard CT-e</h1>
      </div>
      <div className="flex items-center justify-between">
        <SpreadsheetUploader />
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <StatCard
              label="Pendentes"
              value={stats.pendentes}
              color="bg-warning"
            />
            <StatCard
              label="Enviados"
              value={stats.enviados}
              color="bg-success"
            />
            <StatCard label="Erros" value={stats.erros} color="bg-error" />
          </div>
          <XmlBatchUploader enabled={data.total >= 2} />
        </div>
      </div>
      <CteTable data={data} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-md border bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-2 w-2 rounded-full ${color}`}></span>
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
