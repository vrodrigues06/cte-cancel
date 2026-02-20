import { PrismaClient } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";

export type XmlImportResult = {
  filename: string;
  chave: string | null;
  updated: number;
  error?: string;
};

export class XmlImportService {
  private prisma: PrismaClient;
  private parser: XMLParser;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
  }

  extractChave(xmlString: string): string | null {
    try {
      const doc = this.parser.parse(xmlString);
      const infCte = doc?.CTe?.infCte;
      const idAttr: unknown = infCte?.["@_Id"];
      if (typeof idAttr !== "string") {
        // fallback regex
        const m = xmlString.match(/Id=["']CTe(\d+)["']/i);
        return m && typeof m[1] === "string" ? m[1] : null;
      }
      if (idAttr.startsWith("CTe")) {
        return idAttr.slice(3);
      }
      return null;
    } catch {
      const m = xmlString.match(/Id=["']CTe(\d+)["']/i);
      return m && typeof m[1] === "string" ? m[1] : null;
    }
  }

  async importMany(
    files: { filename: string; content: string }[],
  ): Promise<XmlImportResult[]> {
    const results: XmlImportResult[] = [];
    for (const f of files) {
      const chave = this.extractChave(f.content);
      if (!chave) {
        results.push({
          filename: f.filename,
          chave: null,
          updated: 0,
          error: "Chave não encontrada no XML",
        });
        continue;
      }
      try {
        const res = await this.prisma.cteCancel.updateMany({
          where: { chave },
          data: { xml: f.content },
        });
        results.push({ filename: f.filename, chave, updated: res.count });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erro ao atualizar";
        results.push({
          filename: f.filename,
          chave,
          updated: 0,
          error: message,
        });
      }
    }
    return results;
  }
}
