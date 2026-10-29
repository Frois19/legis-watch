import { prisma } from "@/lib/db/prisma";

export async function resetDatabase() {
  // Ordem segura para FKs (SQLite).
  await prisma.vote.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.propositionAuthor.deleteMany();
  await prisma.voteSession.deleteMany();
  await prisma.event.deleteMany();
  await prisma.deputyMandate.deleteMany();
  await prisma.proposition.deleteMany();
  await prisma.deputy.deleteMany();
  await prisma.party.deleteMany();
  await prisma.legislature.deleteMany();
  await prisma.syncRun.deleteMany();
}

export async function seedCoreFixtures() {
  await prisma.legislature.createMany({
    data: [
      {
        id: 57,
        dataInicio: "2023-02-01",
        dataFim: "2027-01-31",
        uri: "https://dadosabertos.camara.leg.br/api/v2/legislaturas/57",
      },
      {
        id: 56,
        dataInicio: "2019-02-01",
        dataFim: "2023-01-31",
        uri: "https://dadosabertos.camara.leg.br/api/v2/legislaturas/56",
      },
    ],
  });

  await prisma.party.createMany({
    data: [
      { id: 36837, sigla: "REDE", nome: "Rede Sustentabilidade", legislaturaId: 57 },
      { id: 36898, sigla: "AVANTE", nome: "Avante", legislaturaId: 56 },
      { id: 37906, sigla: "PL", nome: "Partido Liberal", legislaturaId: 57 },
    ],
  });

  await prisma.deputy.createMany({
    data: [
      {
        id: 204515,
        nome: "André Janones",
        nomeEleitoral: "ANDRÉ JANONES",
        siglaPartido: "REDE",
        partyId: 36837,
        siglaUf: "MG",
        legislaturaId: 57,
        email: "dep.andrejanones@camara.leg.br",
        situacao: "Exercício",
        condicaoEleitoral: "Titular",
        redesSociais: JSON.stringify(["https://x.com/andrejanones"]),
        urlFoto: null,
      },
      {
        id: 209787,
        nome: "Nikolas Ferreira",
        nomeEleitoral: "NIKOLAS FERREIRA",
        siglaPartido: "PL",
        partyId: 37906,
        siglaUf: "MG",
        legislaturaId: 57,
        situacao: "Exercício",
        condicaoEleitoral: "Titular",
        redesSociais: "[]",
      },
    ],
  });

  await prisma.deputyMandate.createMany({
    data: [
      {
        deputyId: 204515,
        legislaturaId: 57,
        siglaPartido: "REDE",
        partyId: 36837,
        siglaUf: "MG",
        situacao: "Exercício",
        nomeEleitoral: "ANDRÉ JANONES",
      },
      {
        deputyId: 204515,
        legislaturaId: 56,
        siglaPartido: "AVANTE",
        partyId: 36898,
        siglaUf: "MG",
        situacao: "FIM_MANDATO",
        nomeEleitoral: "ANDRÉ JANONES",
      },
      {
        deputyId: 209787,
        legislaturaId: 57,
        siglaPartido: "PL",
        partyId: 37906,
        siglaUf: "MG",
        situacao: "Exercício",
        nomeEleitoral: "NIKOLAS FERREIRA",
      },
    ],
  });

  await prisma.proposition.createMany({
    data: [
      {
        id: 1001,
        siglaTipo: "PL",
        numero: 1,
        ano: 2022,
        ementa: "Projeto do mandato 56",
        dataApresentacao: "2022-05-10T00:00:00",
        statusResumo: "Transformado em Norma Jurídica",
      },
      {
        id: 1002,
        siglaTipo: "PL",
        numero: 2,
        ano: 2026,
        ementa: "Projeto do mandato 57",
        dataApresentacao: "2026-03-01T00:00:00",
        statusResumo: "Aguardando Parecer",
      },
      {
        id: 1003,
        siglaTipo: "PEC",
        numero: 3,
        ano: 2021,
        ementa: "Arquivada no mandato 56",
        dataApresentacao: "2021-08-01T00:00:00",
        statusResumo: "Arquivada",
      },
    ],
  });

  await prisma.propositionAuthor.createMany({
    data: [
      { propositionId: 1001, deputyId: 204515, proponente: true },
      { propositionId: 1002, deputyId: 204515, proponente: true },
      { propositionId: 1003, deputyId: 204515, proponente: false },
      { propositionId: 1002, deputyId: 209787, proponente: false },
    ],
  });

  await prisma.voteSession.createMany({
    data: [
      {
        id: "vot-2022-1",
        descricao: "Votação 2022",
        dataHoraRegistro: "2022-06-01T15:00:00",
        aprovacao: true,
        siglaOrgao: "PLEN",
        year: 2022,
        propositionId: 1001,
      },
      {
        id: "vot-2026-1",
        descricao: "Votação 2026",
        dataHoraRegistro: "2026-04-01T15:00:00",
        aprovacao: false,
        siglaOrgao: "PLEN",
        year: 2026,
        propositionId: 1002,
      },
    ],
  });

  await prisma.vote.createMany({
    data: [
      {
        voteSessionId: "vot-2022-1",
        deputyId: 204515,
        tipoVoto: "Sim",
        dataRegistro: "2022-06-01T15:01:00",
        year: 2022,
      },
      {
        voteSessionId: "vot-2026-1",
        deputyId: 204515,
        tipoVoto: "Não",
        dataRegistro: "2026-04-01T15:01:00",
        year: 2026,
      },
      {
        voteSessionId: "vot-2026-1",
        deputyId: 209787,
        tipoVoto: "Sim",
        dataRegistro: "2026-04-01T15:01:00",
        year: 2026,
      },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        id: 501,
        dataHoraInicio: "2022-06-10T14:00:00",
        descricaoTipo: "Sessão Deliberativa",
        descricao: "Sessão 2022",
        situacao: "Encerrada",
        localCamara: "Plenário da Câmara dos Deputados",
        year: 2022,
      },
      {
        id: 502,
        dataHoraInicio: "2022-06-11T14:00:00",
        descricaoTipo: "Sessão Deliberativa",
        descricao: "Sessão 2022 falta",
        situacao: "Encerrada",
        localCamara: "Plenário da Câmara dos Deputados",
        year: 2022,
      },
      {
        id: 601,
        dataHoraInicio: "2026-05-10T14:00:00",
        descricaoTipo: "Sessão Deliberativa",
        descricao: "Sessão 2026",
        situacao: "Encerrada",
        localCamara: "Plenário da Câmara dos Deputados",
        year: 2026,
      },
    ],
  });

  await prisma.attendance.createMany({
    data: [
      { eventId: 501, deputyId: 204515, presente: true, year: 2022 },
      { eventId: 601, deputyId: 204515, presente: true, year: 2026 },
      { eventId: 601, deputyId: 209787, presente: true, year: 2026 },
    ],
  });

  await prisma.syncRun.create({
    data: {
      domain: "deputies",
      status: "success",
      finishedAt: new Date(),
      countsJson: JSON.stringify({ deputies: 2 }),
    },
  });
}
