export type Cte = {
  id: string;
  numeroAutorizacao: string;
  externalId: string;
  xml: string | null;
  xmlEvent: string | null;
  status: "PENDENTE" | "ENVIADO" | "ERRO";
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListResponse = {
  items: Cte[];
  total: number;
  skip: number;
  take: number;
};

const BASE_URL =
  process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

export async function fetchStats(): Promise<{
  pendentes: number;
  enviados: number;
  erros: number;
}> {
  const res = await fetch(`${BASE_URL}/api/ctes/stats`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Falha ao buscar estatísticas");
  }
  return res.json();
}

export async function fetchCtes(params: {
  q?: string;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<ListResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  qs.set("offset", String(params.offset ?? 0));
  qs.set("limit", String(params.limit ?? 50));
  const res = await fetch(`${BASE_URL}/api/ctes?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Falha ao buscar CT-e");
  }
  return res.json();
}
