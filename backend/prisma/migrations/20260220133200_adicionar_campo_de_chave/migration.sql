-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDENTE', 'ENVIADO', 'ERRO');

-- CreateTable
CREATE TABLE "ctes" (
    "id" TEXT NOT NULL,
    "numero_autorizacao" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "chave" TEXT,
    "xml" TEXT,
    "xml_event" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PENDENTE',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ctes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ctes_status_idx" ON "ctes"("status");

-- CreateIndex
CREATE INDEX "ctes_numero_autorizacao_idx" ON "ctes"("numero_autorizacao");

-- CreateIndex
CREATE INDEX "ctes_chave_idx" ON "ctes"("chave");
