"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cte, ListResponse } from "../lib/api";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";

const BASE_URL =
  process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3333";

export default function CteTable({ data }: { data: ListResponse }) {
  const [items, setItems] = useState<Cte[]>(data.items);
  const router = useRouter();
  const columns = useMemo<ColumnDef<Cte>[]>(
    () => [
      { header: "Número de CT-e", accessorKey: "numeroAutorizacao" },
      { header: "ID Externo", accessorKey: "externalId" },
      {
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: "XML",
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center ${row.original.xml ? "text-success" : "text-error"}`}
          >
            {row.original.xml ? "OK" : "Não"}
          </span>
        ),
      },
      {
        header: "Ações",
        cell: ({ row }) => {
          const cte = row.original;
          const disabled = !cte.xml || cte.status !== "PENDENTE";
          return (
            <div className="flex items-center gap-2">
              <button
                className="rounded-md bg-primary px-2 py-1 text-sm text-white disabled:opacity-50"
                disabled={disabled}
                title={
                  disabled
                    ? "Importe o XML e status deve estar PENDENTE"
                    : "Enviar para SAP"
                }
                onClick={() => sendToSap(cte.id)}
              >
                Enviar SAP
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    setItems(data.items);
  }, [data.items, data.skip, data.take]);

  async function refresh() {
    const res = await fetch(
      `${BASE_URL}/api/ctes?offset=${data.skip}&limit=${data.take}`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const json: ListResponse = await res.json();
      setItems(json.items);
    }
  }

  async function sendToSap(id: string) {
    const res = await fetch(`${BASE_URL}/api/ctes/${id}/send-to-sap`, {
      method: "POST",
    });
    if (!res.ok) {
      const txt = await res.text();
      alert(txt);
    }
    await refresh();
  }

  const canPrev = data.skip > 0;
  const canNext = data.skip + data.take < data.total;
  function goPrev() {
    const newOffset = Math.max(0, data.skip - data.take);
    router.push(`/?offset=${newOffset}&limit=${data.take}`);
  }
  function goNext() {
    const newOffset = data.skip + data.take;
    router.push(`/?offset=${newOffset}&limit=${data.take}`);
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="px-4 py-2 text-left text-sm font-medium text-gray-700"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2 text-sm text-gray-800">
                  {flexRender(
                    cell.column.columnDef.cell ??
                      ((ctx) => String(ctx.getValue() ?? "")),
                    cell.getContext(),
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between p-2 text-sm text-gray-600">
        <span>Total: {data.total}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className="rounded-md border bg-white px-2 py-1 text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          <span>Página: {Math.floor(data.skip / data.take) + 1}</span>
          <button
            onClick={goNext}
            disabled={!canNext}
            className="rounded-md border bg-white px-2 py-1 text-sm disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Cte["status"] }) {
  const conf = {
    PENDENTE: { label: "PENDENTE", cls: "bg-warning text-white" },
    ENVIADO: { label: "ENVIADO", cls: "bg-success text-white" },
    ERRO: { label: "ERRO", cls: "bg-error text-white" },
  }[status];
  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs ${conf.cls}`}>
      {conf.label}
    </span>
  );
}
