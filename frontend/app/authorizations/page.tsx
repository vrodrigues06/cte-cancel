import { fetchCtes, fetchStats } from "../../lib/api";
import CteTable from "../../components/CteTable";
import SpreadsheetUploader from "../../components/SpreadsheetUploader";
import XmlBatchUploader from "../../components/XmlBatchUploader";

export default async function AuthorizationsPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; page?: string };
}) {
  const page = Number(searchParams?.page ?? "1");
  const offset = (page - 1) * 50;
  const q = searchParams?.q;
  const status = searchParams?.status;

  const data = await fetchCtes({ q, status, offset, limit: 50 });
  const stats = await fetchStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">CT-e</h1>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SpreadsheetUploader />
          <XmlBatchUploader enabled={data.total >= 2} />
        </div>
        <div className="flex gap-2">
          <SmallStat
            label="Pendentes"
            value={stats.pendentes}
            color="bg-warning"
          />
          <SmallStat
            label="Enviados"
            value={stats.enviados}
            color="bg-success"
          />
          <SmallStat label="Erros" value={stats.erros} color="bg-error" />
        </div>
      </div>
      <CteTable data={data} />
    </div>
  );
}

function SmallStat({
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
