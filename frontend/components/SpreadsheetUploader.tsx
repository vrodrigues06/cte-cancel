"use client";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import Papa from "papaparse";

type PreviewRow = { [key: string]: string | number | null };

const BASE_URL =
  process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

export default function SpreadsheetUploader() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      let rows: PreviewRow[] = [];
      if (ext === "csv") {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true });
        rows = (parsed.data as Record<string, unknown>[])
          .slice(0, 5)
          .map(normalizeRow);
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          alert("Planilha vazia");
          return;
        }
        const sheet = wb.Sheets[firstSheetName]!;
        rows = (XLSX.utils.sheet_to_json(sheet)! as Record<string, unknown>[])
          .slice(0, 5)
          .map(normalizeRow);
      } else {
        alert("Formato não suportado. Use .xlsx, .xls ou .csv");
        return;
      }
      const hasNumero = rows[0] && "numeroAutorizacao" in rows[0];
      const hasExternal = rows[0] && "externalId" in rows[0];
      if (!hasNumero || !hasExternal) {
        alert("Colunas obrigatórias ausentes: numeroAutorizacao e externalId");
        return;
      }
      setPreview(rows);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Erro ao processar arquivo";
      alert(message);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
  });

  async function handleUpload() {
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    const file = input?.files?.[0];
    if (!file) {
      alert("Selecione um arquivo");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BASE_URL}/api/authorizations/import`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const json = await res.json();
      alert(`Importados: ${json.imported}`);
      setPreview([]);
      setFileName(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro no upload";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-md border-2 border-dashed p-3 ${isDragActive ? "border-primary bg-blue-50" : "border-gray-300 bg-white"}`}
      >
        <input {...getInputProps()} />
        <span className="text-sm text-gray-700">
          Importar Planilha (.xlsx, .xls, .csv)
        </span>
      </div>
      <button
        onClick={handleUpload}
        disabled={!fileName || loading}
        className="rounded-md bg-primary px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Importando..." : "Enviar"}
      </button>
      {fileName && (
        <span className="text-sm text-gray-600">Selecionado: {fileName}</span>
      )}
      {preview.length > 0 && (
        <div className="ml-4">
          <div className="text-xs font-medium text-gray-700">
            Preview (5 linhas)
          </div>
          <table className="mt-1 min-w-[300px] text-xs">
            <thead>
              <tr>
                {Object.keys(preview[0]!).map((k) => (
                  <th key={k} className="border px-2 py-1 text-left">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="border px-2 py-1">
                      {String(v ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function normalizeRow(r: Record<string, unknown>): PreviewRow {
  const out: PreviewRow = {};
  for (const [k, v] of Object.entries(r)) {
    out[k] =
      typeof v === "string" || typeof v === "number"
        ? v
        : v === null
          ? null
          : String(v);
  }
  return out;
}
