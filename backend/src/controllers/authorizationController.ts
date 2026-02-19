import { PrismaClient, Status } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { XMLParser } from "fast-xml-parser";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { SapService } from "../services/SapService";
import { z } from "zod";
import { appendLog } from "../logs";

const prisma = new PrismaClient();
const sapService = new SapService();

type ListQuery = {
  q?: string;
  status?: keyof typeof Status;
  offset?: string;
  limit?: string;
};

export async function list(
  req: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply,
) {
  const { q, status, offset = "0", limit = "50" } = req.query;
  const skip = Number(offset) || 0;
  const take = Number(limit) || 50;

  const where: any = {};
  if (status && Status[status]) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { numeroAutorizacao: { contains: q } },
      { externalId: { contains: q } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.cteCancel.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.cteCancel.count({ where }),
    ]);
    return reply.send({ items, total, skip, take });
  } catch {
    return reply.send({ items: [], total: 0, skip, take });
  }
}

export async function stats(_req: FastifyRequest, reply: FastifyReply) {
  try {
    const [pendentes, enviados, erros] = await Promise.all([
      prisma.cteCancel.count({ where: { status: "PENDENTE" } }),
      prisma.cteCancel.count({ where: { status: "ENVIADO" } }),
      prisma.cteCancel.count({ where: { status: "ERRO" } }),
    ]);
    return reply.send({ pendentes, enviados, erros });
  } catch {
    return reply.send({ pendentes: 0, enviados: 0, erros: 0 });
  }
}

export async function importSpreadsheet(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const file = await req.file();

  if (!file) {
    return reply.code(400).send({ error: "Nenhum arquivo enviado" });
  }

  const filename: string = file.filename ?? "upload";
  const ext: string | undefined = filename.split(".").pop()?.toLowerCase();
  const buf: Buffer = await file.toBuffer();

  let rows: Record<string, unknown>[] = [];

  if (ext === "csv") {
    const parsed = Papa.parse<Record<string, unknown>>(buf.toString("utf-8"), {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return reply.code(400).send({
        error: "CSV inválido",
        details: parsed.errors,
      });
    }

    rows = parsed.data;
  } else if (ext === "xlsx" || ext === "xls") {
    const wb = XLSX.read(buf, { type: "buffer" });
    const firstSheetName: string | undefined = wb.SheetNames[0];
    if (!firstSheetName) {
      return reply.code(400).send({ error: "Planilha vazia" });
    }
    const sheet = wb.Sheets[firstSheetName];
    if (!sheet) {
      return reply.code(400).send({ error: "Aba da planilha não encontrada" });
    }
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
    });
    if (raw.length < 2) {
      return reply.code(400).send({ error: "Planilha sem linhas de dados" });
    }
    const header = raw[0] as unknown[];
    const dataRows = raw.slice(1) as unknown[][];
    function norm(value: string): string {
      return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }
    const headerNorms = header.map((h) =>
      typeof h === "string" ? norm(h) : "",
    );
    const idxNum = headerNorms.findIndex(
      (v) => v === "ordemautorizacao" || v === "numeroautorizacao",
    );
    const idxExt = headerNorms.findIndex(
      (v) => v === "id" || v === "externalid",
    );
    appendLog("import.resolve_indices", {
      header,
      headerNorms,
      idxNum,
      idxExt,
    });
    if (idxNum === -1 || idxExt === -1) {
      return reply.code(400).send({
        error: "Colunas obrigatórias não encontradas",
        hint: header,
      });
    }
    const normalizedRows = dataRows.map((arr) => {
      const ordemAutorizacao = String(arr[idxNum] ?? "").trim();
      const id = String(arr[idxExt] ?? "").trim();
      return { ordemAutorizacao, id };
    });
    appendLog("import.sample_rows", { sample: normalizedRows.slice(0, 5) });
    const Stringish = z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s.length > 0, { message: "vazio" });
    const RowSchema = z.object({
      ordemAutorizacao: Stringish,
      id: Stringish,
    });
    const data = normalizedRows.flatMap((row, index) => {
      const parsed = RowSchema.safeParse(row);
      if (!parsed.success) {
        appendLog("import.row_invalid", { index, row });
        return [];
      }
      const value = parsed.data;
      return [
        {
          numeroAutorizacao: value.ordemAutorizacao,
          externalId: value.id,
          xml: null,
          xmlEvent: null,
          status: "PENDENTE" as const,
        },
      ];
    });
    appendLog("import.summary", {
      totalRows: normalizedRows.length,
      valid: data.length,
    });
    if (data.length === 0) {
      return reply.code(400).send({
        error: "Nenhuma linha válida encontrada",
      });
    }
    try {
      const created = await prisma.cteCancel.createMany({
        data,
        skipDuplicates: true,
      });
      return reply.send({ imported: created.count, persisted: true });
    } catch (error) {
      req.log.error(error);
      return reply.send({ imported: data.length, persisted: false });
    }
  } else {
    return reply.code(400).send({
      error: `Formato não suportado (${ext}). Use .xlsx, .xls ou .csv`,
    });
  }

  if (rows.length === 0) {
    return reply.code(400).send({
      error: "Planilha sem linhas de dados",
    });
  }

  const firstRow: Record<string, unknown> | undefined = rows[0];

  if (!firstRow) {
    return reply.code(400).send({
      error: "Planilha sem linhas válidas",
    });
  }

  function norm(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  const aliasNum: string[] = ["ordemautorizacao"];
  const aliasExt: string[] = ["id"];

  const firstKeys: string[] = Object.keys(firstRow);

  const numKey: string | null =
    firstKeys.find((k) => aliasNum.includes(norm(k))) ?? null;

  const extKey: string | null =
    firstKeys.find((k) => aliasExt.includes(norm(k))) ?? null;

  appendLog("import.resolve_keys", { numKey, extKey, firstKeys });

  if (!numKey || !extKey) {
    return reply.code(400).send({
      error: "Colunas obrigatórias não encontradas",
      hint: firstKeys,
    });
  }

  const normalizedRows: {
    ordemAutorizacao: string;
    id: string;
  }[] = rows.map((row) => {
    const n = row[numKey];
    const i = row[extKey];
    const ordemAutorizacao =
      typeof n === "string" || typeof n === "number" || typeof n === "boolean"
        ? String(n).trim()
        : "";
    const id =
      typeof i === "string" || typeof i === "number" || typeof i === "boolean"
        ? String(i).trim()
        : "";
    return { ordemAutorizacao, id };
  });

  appendLog("import.sample_rows", { sample: normalizedRows.slice(0, 5) });

  const Stringish = z
    .union([z.string(), z.number(), z.boolean()])
    .transform((v) => String(v).trim())
    .refine((s) => s.length > 0, { message: "vazio" });

  const RowSchema = z.object({
    ordemAutorizacao: Stringish,
    id: Stringish,
  });

  const data = normalizedRows.flatMap((row, index) => {
    const parsed = RowSchema.safeParse(row);

    if (!parsed.success) {
      appendLog("import.row_invalid", { index, row });
      return [];
    }

    const value = parsed.data;

    return [
      {
        numeroAutorizacao: value.ordemAutorizacao,
        externalId: value.id,
        xml: null,
        xmlEvent: null,
        status: "PENDENTE" as const,
      },
    ];
  });

  appendLog("import.summary", { totalRows: rows.length, valid: data.length });

  if (data.length === 0) {
    return reply.code(400).send({
      error: "Nenhuma linha válida encontrada",
    });
  }

  try {
    const created = await prisma.cteCancel.createMany({
      data,
      skipDuplicates: true,
    });

    return reply.send({
      imported: created.count,
      persisted: true,
    });
  } catch (error) {
    req.log.error(error);

    return reply.send({
      imported: data.length,
      persisted: false,
    });
  }
}

export async function uploadXml(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const file = await req.file();
  if (!file) {
    return reply.code(400).send({ error: "Nenhum arquivo XML enviado" });
  }

  const buf = await file.toBuffer();
  const xmlStr = buf.toString("utf-8");

  const parser = new XMLParser();
  try {
    parser.parse(xmlStr);
  } catch {
    return reply.code(400).send({ error: "XML inválido" });
  }

  const updated = await prisma.cteCancel.update({
    where: { id: req.params.id },
    data: { xml: xmlStr },
  });
  return reply.send(updated);
}

export async function sendToSap(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const auth = await prisma.cteCancel.findUnique({
    where: { id: req.params.id },
  });
  if (!auth) {
    return reply.code(404).send({ error: "Autorização não encontrada" });
  }
  if (!auth.xml) {
    return reply.code(400).send({ error: "XML não importado" });
  }

  try {
    const sapResp = await sapService.sendAuthorization({
      id: auth.id,
      numeroAutorizacao: auth.numeroAutorizacao,
      externalId: auth.externalId,
      xml: auth.xml,
    });

    const updated = await prisma.cteCancel.update({
      where: { id: auth.id },
      data: {
        status: "ENVIADO",
        sentAt: new Date(),
        xmlEvent: sapResp.xmlEvent ?? null,
        errorMessage: null,
      },
    });
    return reply.send(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    const updated = await prisma.cteCancel.update({
      where: { id: auth.id },
      data: {
        status: "ERRO",
        errorMessage: message,
      },
    });
    return reply.code(500).send(updated);
  }
}
