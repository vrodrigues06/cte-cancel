"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

const BASE_URL =
  process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3333";

export default function XmlBatchUploader({ enabled }: { enabled: boolean }) {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onDrop = (acceptedFiles: File[]) => {
    setFileNames(acceptedFiles.map((f) => f.name));
    setSelected(acceptedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "text/xml": [".xml"],
      "application/xml": [".xml"],
    },
    disabled: !enabled || loading,
  });

  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size));
    }
    return out;
  }

  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [updatedSoFar, setUpdatedSoFar] = useState(0);

  async function handleUpload() {
    if (!selected.length) {
      alert("Selecione arquivos XML");
      return;
    }
    setLoading(true);
    try {
      const parts = chunk(selected, 100);
      setTotalBatches(parts.length);
      setCurrentBatch(0);
      let updated = 0;
      for (const group of parts) {
        setCurrentBatch((prev) => prev + 1);
        const fd = new FormData();
        for (const f of group) {
          fd.append("file", f);
        }
        const res = await fetch(`${BASE_URL}/api/ctes/import-xml`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt);
        }
        const json = await res.json();
        updated += Number(json.updated ?? 0);
        setUpdatedSoFar(updated);
      }
      alert(`Atualizados: ${updated}`);
      setFileNames([]);
      setSelected([]);
      setCurrentBatch(0);
      setTotalBatches(0);
      setUpdatedSoFar(0);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro no upload de XML";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-md border border-indigo-300 px-2 py-1 shadow-sm shrink-0 max-w-[240px] transition ${
          isDragActive
            ? "ring-2 ring-indigo-300 bg-indigo-50"
            : enabled
              ? "bg-white hover:shadow-md hover:ring-1 hover:ring-indigo-200"
              : "bg-gray-100 opacity-60 cursor-not-allowed"
        }`}
      >
        <input {...getInputProps()} />
        <span className="text-sm text-slate-700">
          Soltar XMLs ou selecionar
        </span>
      </div>
      <button
        onClick={handleUpload}
        disabled={!enabled || !selected.length || loading}
        className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1 text-sm text-white shadow-sm disabled:opacity-50 hover:bg-amber-700 active:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition"
      >
        {loading
          ? `Importando XML (${currentBatch}/${totalBatches})`
          : "Importar XML"}
      </button>
      {selected.length > 0 && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          Selecionados: {selected.length}
        </span>
      )}
      {loading && (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          Atualizados até agora: {updatedSoFar}
        </span>
      )}
    </div>
  );
}
