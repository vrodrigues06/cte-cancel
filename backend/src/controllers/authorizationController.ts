import { PrismaClient, Status } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { XMLParser } from "fast-xml-parser";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { SapService } from "../services/SapService";
import { z } from "zod";

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

  const filename = file.filename ?? "upload";
  const ext = filename.split(".").pop()?.toLowerCase();
  const buf = await file.toBuffer();

  let rows: Array<Record<string, unknown>> = [];
  if (ext === "csv") {
    const parsed = Papa.parse(buf.toString("utf-8"), { header: true });
    if (parsed.errors.length) {
      return reply
        .code(400)
        .send({ error: "CSV inválido", details: parsed.errors });
    }
    rows = parsed.data as Array<Record<string, unknown>>;
  } else if (ext === "xlsx" || ext === "xls") {
    const wb = XLSX.read(buf, { type: "buffer" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      return reply.code(400).send({ error: "Planilha vazia" });
    }
    const sheet = wb.Sheets[firstSheetName];
    if (!sheet) {
      return reply.code(400).send({ error: "Aba da planilha não encontrada" });
    }
    rows = XLSX.utils.sheet_to_json(sheet) as Array<Record<string, unknown>>;
  } else {
    return reply
      .code(400)
      .send({ error: "Formato não suportado. Use .xlsx, .xls ou .csv" });
  }

  const RowSchema = z
    .object({
      numeroAutorizacao: z.string().min(1),
      externalId: z.string().min(1),
    })
    .passthrough();

  const data = rows.flatMap((r) => {
    const parsed = RowSchema.safeParse(r);
    if (!parsed.success) return [];
    const v = parsed.data;
    return [
      {
        numeroAutorizacao: v.numeroAutorizacao,
        externalId: v.externalId,
        xml: null,
        xmlEvent: null,
        status: "PENDENTE" as const,
      },
    ];
  });

  if (!data.length) {
    return reply.code(400).send({ error: "Nenhuma linha válida encontrada" });
  }

  const created = await prisma.cteCancel.createMany({
    data,
    skipDuplicates: true,
  });
  return reply.send({ imported: created.count });
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
