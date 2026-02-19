"use client";
import { useState } from "react";

const BASE_URL =
  process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

export default function XmlUploader({
  id,
  onUploaded,
}: {
  id: string;
  onUploaded: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      alert("Apenas arquivos .xml são aceitos");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BASE_URL}/api/ctes/${id}/xml`, {
        method: "PATCH",
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      onUploaded();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro no upload de XML";
      alert(message);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-sm shadow-sm bg-white">
      <input
        type="file"
        accept=".xml"
        className="hidden"
        onChange={handleFileChange}
      />
      {loading ? "Enviando..." : "Importar XML"}
    </label>
  );
}
