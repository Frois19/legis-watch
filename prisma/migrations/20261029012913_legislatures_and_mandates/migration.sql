-- CreateTable
CREATE TABLE "Legislature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uri" TEXT,
    "dataInicio" TEXT NOT NULL,
    "dataFim" TEXT NOT NULL,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeputyMandate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deputyId" INTEGER NOT NULL,
    "legislaturaId" INTEGER NOT NULL,
    "siglaPartido" TEXT,
    "partyId" INTEGER,
    "siglaUf" TEXT,
    "situacao" TEXT,
    "condicaoEleitoral" TEXT,
    "nomeEleitoral" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeputyMandate_deputyId_fkey" FOREIGN KEY ("deputyId") REFERENCES "Deputy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeputyMandate_legislaturaId_fkey" FOREIGN KEY ("legislaturaId") REFERENCES "Legislature" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeputyMandate_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeputyMandate_legislaturaId_idx" ON "DeputyMandate"("legislaturaId");

-- CreateIndex
CREATE INDEX "DeputyMandate_siglaPartido_idx" ON "DeputyMandate"("siglaPartido");

-- CreateIndex
CREATE INDEX "DeputyMandate_siglaUf_idx" ON "DeputyMandate"("siglaUf");

-- CreateIndex
CREATE UNIQUE INDEX "DeputyMandate_deputyId_legislaturaId_key" ON "DeputyMandate"("deputyId", "legislaturaId");

-- CreateIndex
CREATE INDEX "Party_legislaturaId_sigla_idx" ON "Party"("legislaturaId", "sigla");
