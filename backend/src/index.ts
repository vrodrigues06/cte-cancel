import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { authorizationsRoutes } from "./routes/authorizations";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: process.env["ALLOWED_ORIGIN"] ?? true,
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

await app.register(authorizationsRoutes, { prefix: "/api/authorizations" });

const port = Number(process.env["PORT"] ?? 3001);
try {
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`Backend listening on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
