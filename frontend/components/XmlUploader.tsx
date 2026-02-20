"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

const BASE_URL =
  process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

export default function XmlUploader({
  id,
  onUploaded,
}: {
  id: string;
  onUploaded: () => Promise<void>;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onDrop = (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    setFileName(f ? f.name : null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/xml": [".xml"],
      "application/xml": [".xml"],
    },
  });

  async function handleUpload() {
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    const file = input?.files?.[0];
    if (!file) {
      alert("Selecione um XML");
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
      await onUploaded();
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro no upload de XML";
      alert(message);
    } finally {
      setLoading(false);
      setFileName(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-md border px-2 py-1 text-sm shadow-sm ${
          isDragActive
            ? "border-primary bg-blue-50"
            : "border-gray-300 bg-white"
        }`}
      >
        <input {...getInputProps()} />
        <span className="text-gray-700">XML</span>
      </div>
      <button
        onClick={handleUpload}
        disabled={loading || !fileName}
        className="rounded-md bg-primary px-2 py-1 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Importando..." : "Importar"}
      </button>
    </div>
  );
}
