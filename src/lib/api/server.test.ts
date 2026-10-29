import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    legislature: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    deputy: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    deputyMandate: {
      findUnique: vi.fn(),
    },
    party: {
      findFirst: vi.fn(),
    },
    proposition: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    vote: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    attendance: {
      findMany: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    voteSession: {
      findMany: vi.fn(),
    },
  },
}));

const { getEvent, listEventPauta } = vi.hoisted(() => ({
  getEvent: vi.fn(),
  listEventPauta: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/lib/camara/client", () => ({
  getEvent: (...args: unknown[]) => getEvent(...args),
  listEventPauta: (...args: unknown[]) => listEventPauta(...args),
}));

import {
  getDeputy,
  getDeputyAttendance,
  getDeputyProfileBundle,
  getDeputyPropositions,
  getDeputyVotes,
  getEventAta,
  listLegislatures,
} from "./server";

describe("api/server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista legislaturas com label", async () => {
    prisma.legislature.findMany.mockResolvedValue([
      { id: 57, dataInicio: "2023-02-01", dataFim: "2027-01-31" },
    ]);
    await expect(listLegislatures()).resolves.toEqual([
      {
        id: 57,
        dataInicio: "2023-02-01",
        dataFim: "2027-01-31",
        label: "57ª (2023–2027)",
      },
    ]);
  });

  it("getDeputy lança not_found", async () => {
    prisma.deputy.findUnique.mockResolvedValue(null);
    await expect(getDeputy(1)).rejects.toThrow("not_found");
  });

  it("getDeputy aplica mandato selecionado e membros", async () => {
    prisma.deputy.findUnique.mockResolvedValue({
      id: 204515,
      nome: "André Janones",
      nomeCivil: "André",
      nomeEleitoral: "ANDRÉ JANONES",
      siglaPartido: "REDE",
      siglaUf: "MG",
      legislaturaId: 57,
      urlFoto: null,
      email: "a@b.com",
      situacao: "Exercício",
      condicaoEleitoral: "Titular",
      dataNascimento: null,
      municipioNascimento: null,
      escolaridade: null,
      redesSociais: '["https://x.com/a"]',
      gabineteJson: '{"nome":"Gab"}',
      syncedAt: new Date("2026-01-01"),
      partyId: 1,
      party: { id: 1, sigla: "REDE", nome: "Rede", uri: null, legislaturaId: 57 },
      mandates: [
        {
          legislaturaId: 57,
          siglaPartido: "REDE",
          siglaUf: "MG",
          situacao: "Exercício",
          condicaoEleitoral: "Titular",
          nomeEleitoral: "ANDRÉ JANONES",
          legislature: { dataInicio: "2023-02-01", dataFim: "2027-01-31" },
        },
        {
          legislaturaId: 56,
          siglaPartido: "AVANTE",
          siglaUf: "MG",
          situacao: null,
          condicaoEleitoral: null,
          nomeEleitoral: "ANDRÉ JANONES",
          legislature: { dataInicio: "2019-02-01", dataFim: "2023-01-31" },
        },
      ],
    });
    prisma.deputyMandate.findUnique.mockResolvedValue({ partyId: 9 });
    prisma.deputy.findMany.mockResolvedValue([
      { id: 2, nome: "Colega", siglaUf: "MG", urlFoto: null },
    ]);
    prisma.party.findFirst.mockResolvedValue({
      id: 9,
      sigla: "AVANTE",
      nome: "Avante",
      uri: null,
      legislaturaId: 56,
    });

    const deputy = await getDeputy(204515, 56);
    expect(deputy.siglaPartido).toBe("AVANTE");
    expect(deputy.selectedLegislaturaId).toBe(56);
    expect(deputy.partyMembers).toHaveLength(1);
    expect(deputy.redesSociais).toEqual(["https://x.com/a"]);
    expect(deputy.gabinete).toEqual({ nome: "Gab" });
  });

  it("getDeputyPropositions calcula aprovados no período", async () => {
    prisma.legislature.findUnique.mockResolvedValue({
      id: 56,
      dataInicio: "2019-02-01",
      dataFim: "2023-01-31",
    });
    prisma.proposition.count.mockResolvedValue(2);
    prisma.proposition.findMany
      .mockResolvedValueOnce([
        {
          id: 1,
          uri: null,
          siglaTipo: "PL",
          numero: 1,
          ano: 2022,
          ementa: "x",
          dataApresentacao: "2022-01-01",
          statusResumo: "Transformado em Norma Jurídica",
          authors: [{ proponente: true }],
        },
      ])
      .mockResolvedValueOnce([
        { statusResumo: "Transformado em Norma Jurídica" },
        { statusResumo: "Arquivada" },
      ]);

    const result = await getDeputyPropositions(204515, 20, 56);
    expect(result.stats).toEqual({ apresentados: 2, aprovados: 1 });
    expect(result.items[0]?.proponente).toBe(true);
  });

  it("getDeputyVotes filtra por anos da legislatura", async () => {
    prisma.legislature.findUnique.mockResolvedValue({
      id: 57,
      dataInicio: "2023-02-01",
      dataFim: "2027-01-31",
    });
    prisma.vote.count.mockResolvedValue(1);
    prisma.vote.findMany.mockResolvedValue([
      {
        id: 1,
        tipoVoto: "Sim",
        dataRegistro: "2026-01-01",
        year: 2026,
        voteSession: {
          id: "v1",
          descricao: "desc",
          dataHoraRegistro: "2026-01-01",
          aprovacao: true,
          siglaOrgao: "PLEN",
          proposition: {
            id: 10,
            uri: null,
            siglaTipo: "PL",
            numero: 1,
            ano: 2026,
            ementa: "e",
            dataApresentacao: "2026-01-01",
            statusResumo: "Aguardando",
            authorsResumo: null,
            authors: [
              {
                proponente: true,
                deputy: {
                  id: 9,
                  nome: "Autor",
                  nomeEleitoral: "Autor",
                  siglaPartido: "PL",
                  siglaUf: "SP",
                },
              },
            ],
          },
        },
      },
    ]);

    const votes = await getDeputyVotes(1, 20, 57);
    expect(votes.total).toBe(1);
    expect(votes.items[0]?.votacao.id).toBe("v1");
    expect(votes.items[0]?.proposicao?.siglaTipo).toBe("PL");
    expect(votes.items[0]?.proposicao?.urlCamara).toContain("idProposicao=10");
    expect(votes.items[0]?.proposicao?.authors[0]?.siglaPartido).toBe("PL");
    expect(votes.items[0]?.votacao.aprovacao).toBe(true);
  });

  it("getDeputyAttendance resume presença e faltas", async () => {
    prisma.legislature.findUnique.mockResolvedValue({
      id: 57,
      dataInicio: "2023-02-01",
      dataFim: "2027-01-31",
    });
    prisma.attendance.findMany.mockResolvedValue([{ eventId: 1 }]);
    prisma.event.findMany.mockResolvedValue([
      {
        id: 1,
        dataHoraInicio: "2026-01-01",
        dataHoraFim: null,
        descricaoTipo: "Sessão Deliberativa",
        descricao: "x",
        localCamara: "Plenário da Câmara",
        situacao: "Encerrada",
      },
      {
        id: 2,
        dataHoraInicio: "2026-01-02",
        dataHoraFim: null,
        descricaoTipo: "Sessão Deliberativa",
        descricao: "y",
        localCamara: "Plenário da Câmara",
        situacao: "Encerrada",
      },
    ]);

    const attendance = await getDeputyAttendance(1, 57);
    expect(attendance.summary.presentes).toBe(1);
    expect(attendance.summary.faltas).toBe(1);
    expect(attendance.items[0]?.status).toBe("presente");
    expect(attendance.items[1]?.status).toBe("falta");
  });

  it("getDeputyProfileBundle agrega seções", async () => {
    prisma.deputy.findUnique.mockResolvedValue({
      id: 1,
      nome: "A",
      nomeCivil: null,
      nomeEleitoral: "A",
      siglaPartido: "PL",
      siglaUf: "MG",
      legislaturaId: 57,
      urlFoto: null,
      email: null,
      situacao: null,
      condicaoEleitoral: null,
      dataNascimento: null,
      municipioNascimento: null,
      escolaridade: null,
      redesSociais: null,
      gabineteJson: "bad-json",
      syncedAt: null,
      partyId: null,
      party: null,
      mandates: [
        {
          legislaturaId: 57,
          siglaPartido: "PL",
          siglaUf: "MG",
          situacao: null,
          condicaoEleitoral: null,
          nomeEleitoral: "A",
          legislature: { dataInicio: "2023-02-01", dataFim: "2027-01-31" },
        },
      ],
    });
    prisma.deputyMandate.findUnique.mockResolvedValue({ partyId: null });
    prisma.party.findFirst.mockResolvedValue(null);
    prisma.legislature.findUnique.mockResolvedValue({
      id: 57,
      dataInicio: "2023-02-01",
      dataFim: "2027-01-31",
    });
    prisma.proposition.count.mockResolvedValue(0);
    prisma.proposition.findMany.mockResolvedValue([]);
    prisma.vote.count.mockResolvedValue(0);
    prisma.vote.findMany.mockResolvedValue([]);
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.event.findMany.mockResolvedValue([]);

    const bundle = await getDeputyProfileBundle(1, 57);
    expect(bundle.deputy.id).toBe(1);
    expect(bundle.deputy.gabinete).toBeNull();
    expect(bundle.propositions.total).toBe(0);
    expect(bundle.votes.total).toBe(0);
  });

  it("getDeputyPropositions sem legislatura e legislature_not_found", async () => {
    prisma.proposition.count.mockResolvedValue(0);
    prisma.proposition.findMany.mockResolvedValue([]);
    await expect(getDeputyPropositions(1)).resolves.toMatchObject({
      total: 0,
      stats: { apresentados: 0, aprovados: 0 },
    });

    prisma.legislature.findUnique.mockResolvedValue(null);
    await expect(getDeputyVotes(1, 20, 99)).rejects.toThrow(
      "legislature_not_found",
    );
  });

  it("getDeputyVotes sem proposição vinculada", async () => {
    prisma.vote.count.mockResolvedValue(1);
    prisma.vote.findMany.mockResolvedValue([
      {
        id: 2,
        tipoVoto: "Não",
        dataRegistro: null,
        year: 2026,
        voteSession: {
          id: "v2",
          descricao: null,
          dataHoraRegistro: null,
          aprovacao: null,
          siglaOrgao: null,
          proposition: null,
        },
      },
    ]);
    const votes = await getDeputyVotes(1);
    expect(votes.items[0]?.proposicao).toBeNull();
  });

  it("getDeputyAttendance sem legislatura usa ano corrente", async () => {
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.event.findMany.mockResolvedValue([]);
    const attendance = await getDeputyAttendance(1);
    expect(attendance.years).toEqual([new Date().getFullYear()]);
  });

  it("getEventAta monta pauta e votações do dia", async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 10,
      dataHoraInicio: "2026-05-21T10:41:00",
      descricao: "Sessão local",
      situacao: "Encerrada",
    });
    getEvent.mockResolvedValue({
      id: 10,
      descricao: "Sessão remota",
      urlRegistro: "https://www.youtube.com/watch?v=x",
    });
    listEventPauta.mockResolvedValue([
      {
        ordem: 1,
        titulo: "PL 1/2026",
        topico: "Ordem do Dia",
        situacaoItem: "Aprovado",
        proposicao_: {
          id: 99,
          ementa: "Ementa",
          siglaTipo: "PL",
          numero: 1,
          ano: 2026,
        },
      },
    ]);
    prisma.voteSession.findMany.mockResolvedValue([
      {
        id: "v-1",
        descricao: "Aprovado o projeto",
        dataHoraRegistro: "2026-05-21T15:00:00",
        aprovacao: true,
        proposition: {
          id: 99,
          siglaTipo: "PL",
          numero: 1,
          ano: 2026,
        },
      },
    ]);

    const ata = await getEventAta(10);
    expect(ata.urlEvento).toContain("/evento-legislativo/10");
    expect(ata.urlRegistro).toContain("youtube");
    expect(ata.pauta[0]?.titulo).toBe("PL 1/2026");
    expect(ata.pauta[0]?.urlCamara).toContain("idProposicao=99");
    expect(ata.votacoes).toHaveLength(1);
    expect(ata.votacoes[0]?.aprovacao).toBe(true);
  });

  it("getEventAta lança se evento não existe", async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await expect(getEventAta(404)).rejects.toThrow("event_not_found");
  });

  it("getDeputy usa fallbacks de mandato e JSON inválido em redes", async () => {
    prisma.deputy.findUnique.mockResolvedValue({
      id: 5,
      nome: "Sem mandato listado",
      nomeCivil: null,
      nomeEleitoral: null,
      siglaPartido: "PT",
      siglaUf: "RJ",
      legislaturaId: 57,
      urlFoto: null,
      email: null,
      situacao: null,
      condicaoEleitoral: null,
      dataNascimento: null,
      municipioNascimento: null,
      escolaridade: null,
      redesSociais: "{",
      gabineteJson: null,
      syncedAt: null,
      partyId: null,
      party: null,
      mandates: [],
    });
    const deputy = await getDeputy(5);
    expect(deputy.nomeEleitoral).toBe("Sem mandato listado");
    expect(deputy.selectedLegislaturaId).toBe(57);
    expect(deputy.redesSociais).toEqual([]);
  });
});

