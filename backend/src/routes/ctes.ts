import type { FastifyInstance } from "fastify";
import * as controller from "../controllers/authorizationController";

export async function ctesRoutes(app: FastifyInstance) {
  app.get("/", controller.list);
  app.get("/stats", controller.stats);
  app.post("/import", controller.importSpreadsheet);
  app.post("/import-xml", controller.importXmlBatch);
  app.patch("/:id/xml", controller.uploadXml);
  app.post("/:id/send-to-sap", controller.sendToSap);
}
