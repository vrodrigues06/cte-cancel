'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';

const BASE_URL =
  process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3001';

export default function XmlBatchUploader({ enabled }: { enabled: boolean }) {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onDrop = (acceptedFiles: File[]) => {
    setFileNames(acceptedFiles.map((f) => f.name));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
    },
    disabled: !enabled,
  });

  async function handleUpload() {
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    const files = Array.from(input?.files ?? []);
    if (!files.length) {
      alert('Selecione arquivos XML');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      for (const f of files) {
        fd.append('file', f);
      }
      const res = await fetch(`${BASE_URL}/api/ctes/import-xml`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const json = await res.json();
      alert(`Atualizados: ${json.updated}`);
      setFileNames([]);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro no upload de XML';
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-md border-2 border-dashed p-3 shadow-sm ${
          isDragActive
            ? 'border-primary bg-blue-50'
            : enabled
            ? 'border-gray-300 bg-white'
            : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
        }`}
      >
        <input {...getInputProps()} />
        <span className="text-sm text-gray-700">
          Importar XMLs (.xml)
        </span>
      </div>
      <button
        onClick={handleUpload}
        disabled={!enabled || !fileNames.length || loading}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-white shadow-sm disabled:opacity-50 hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition"
      >
        {loading ? 'Importando XML...' : 'Importar XML'}
      </button>
      {fileNames.length > 0 && (
        <span className="text-sm text-gray-600">
          Selecionados: {fileNames.length}
        </span>
      )}
    </div>
  );
}
