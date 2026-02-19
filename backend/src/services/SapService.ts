import { request } from "undici";

export type AuthorizationToSend = {
  id: string;
  numeroAutorizacao: string;
  externalId: string;
  xml: string;
};

export type SapResponse = {
  success: boolean;
  xmlEvent?: string;
  error?: string;
};

export class SapService {
  private readonly sapBaseUrl: string;

  constructor() {
    const base = process.env["SAP_BASE_URL"];
    if (!base) {
      throw new Error("SAP_BASE_URL não configurado");
    }
    this.sapBaseUrl = base;
  }

  async sendAuthorization(
    authorization: AuthorizationToSend,
  ): Promise<SapResponse> {
    const url = `${this.sapBaseUrl}`;
    const body = {
      numeroAutorizacao: authorization.numeroAutorizacao,
      externalId: authorization.externalId,
      xml: authorization.xml,
    };

    const res = await request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.body.text();
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const data = JSON.parse(text) as { xmlEvent?: string };
        return { success: true, xmlEvent: data.xmlEvent };
      } catch {
        return { success: true, xmlEvent: text };
      }
    }
    return { success: false, error: text };
  }
}
