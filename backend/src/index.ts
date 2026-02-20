import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { ctesRoutes } from "./routes/ctes";
import { getLogs } from "./logs";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: process.env["ALLOWED_ORIGIN"] ?? true,
});

await app.register(multipart, {
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 200,
  },
});

await app.register(ctesRoutes, { prefix: "/api/ctes" });

app.get("/logs", async () => {
  return { logs: getLogs() };
});
const port = Number(process.env["PORT"] ?? 3333);
try {
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`Backend listening on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
