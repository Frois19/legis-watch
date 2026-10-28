-- CreateTable
CREATE TABLE "Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sigla" TEXT NOT NULL,
    "nome" TEXT,
    "uri" TEXT,
    "legislaturaId" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Deputy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uri" TEXT,
    "nome" TEXT NOT NULL,
    "nomeCivil" TEXT,
    "nomeEleitoral" TEXT,
    "siglaPartido" TEXT,
    "partyId" INTEGER,
    "siglaUf" TEXT,
    "legislaturaId" INTEGER,
    "urlFoto" TEXT,
    "email" TEXT,
    "situacao" TEXT,
    "condicaoEleitoral" TEXT,
    "redesSociais" TEXT,
    "dataNascimento" TEXT,
    "municipioNascimento" TEXT,
    "escolaridade" TEXT,
    "gabineteJson" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deputy_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uri" TEXT,
    "siglaTipo" TEXT,
    "numero" INTEGER,
    "ano" INTEGER,
    "ementa" TEXT,
    "dataApresentacao" TEXT,
    "statusResumo" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PropositionAuthor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "propositionId" INTEGER NOT NULL,
    "deputyId" INTEGER NOT NULL,
    "proponente" BOOLEAN NOT NULL DEFAULT false,
    "ordemAssinatura" INTEGER,
    CONSTRAINT "PropositionAuthor_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PropositionAuthor_deputyId_fkey" FOREIGN KEY ("deputyId") REFERENCES "Deputy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoteSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataHoraRegistro" TEXT,
    "descricao" TEXT,
    "aprovacao" BOOLEAN,
    "uriProposicaoPrincipal" TEXT,
    "propositionId" INTEGER,
    "siglaOrgao" TEXT,
    "year" INTEGER,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VoteSession_propositionId_fkey" FOREIGN KEY ("propositionId") REFERENCES "Proposition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "voteSessionId" TEXT NOT NULL,
    "deputyId" INTEGER NOT NULL,
    "tipoVoto" TEXT NOT NULL,
    "dataRegistro" TEXT,
    "year" INTEGER,
    CONSTRAINT "Vote_voteSessionId_fkey" FOREIGN KEY ("voteSessionId") REFERENCES "VoteSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_deputyId_fkey" FOREIGN KEY ("deputyId") REFERENCES "Deputy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dataHoraInicio" TEXT,
    "dataHoraFim" TEXT,
    "situacao" TEXT,
    "descricaoTipo" TEXT,
    "descricao" TEXT,
    "localCamara" TEXT,
    "year" INTEGER,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "deputyId" INTEGER NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "year" INTEGER,
    CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_deputyId_fkey" FOREIGN KEY ("deputyId") REFERENCES "Deputy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "message" TEXT,
    "countsJson" TEXT
);

-- CreateIndex
CREATE INDEX "Party_sigla_idx" ON "Party"("sigla");

-- CreateIndex
CREATE INDEX "Deputy_nome_idx" ON "Deputy"("nome");

-- CreateIndex
CREATE INDEX "Deputy_siglaPartido_idx" ON "Deputy"("siglaPartido");

-- CreateIndex
CREATE INDEX "Deputy_siglaUf_idx" ON "Deputy"("siglaUf");

-- CreateIndex
CREATE INDEX "Deputy_legislaturaId_idx" ON "Deputy"("legislaturaId");

-- CreateIndex
CREATE INDEX "Proposition_siglaTipo_numero_ano_idx" ON "Proposition"("siglaTipo", "numero", "ano");

-- CreateIndex
CREATE INDEX "Proposition_ano_idx" ON "Proposition"("ano");

-- CreateIndex
CREATE INDEX "PropositionAuthor_deputyId_idx" ON "PropositionAuthor"("deputyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropositionAuthor_propositionId_deputyId_key" ON "PropositionAuthor"("propositionId", "deputyId");

-- CreateIndex
CREATE INDEX "VoteSession_year_idx" ON "VoteSession"("year");

-- CreateIndex
CREATE INDEX "VoteSession_propositionId_idx" ON "VoteSession"("propositionId");

-- CreateIndex
CREATE INDEX "Vote_deputyId_year_idx" ON "Vote"("deputyId", "year");

-- CreateIndex
CREATE INDEX "Vote_tipoVoto_idx" ON "Vote"("tipoVoto");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_voteSessionId_deputyId_key" ON "Vote"("voteSessionId", "deputyId");

-- CreateIndex
CREATE INDEX "Event_year_idx" ON "Event"("year");

-- CreateIndex
CREATE INDEX "Event_dataHoraInicio_idx" ON "Event"("dataHoraInicio");

-- CreateIndex
CREATE INDEX "Attendance_deputyId_year_idx" ON "Attendance"("deputyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_eventId_deputyId_key" ON "Attendance"("eventId", "deputyId");

-- CreateIndex
CREATE INDEX "SyncRun_domain_startedAt_idx" ON "SyncRun"("domain", "startedAt");
