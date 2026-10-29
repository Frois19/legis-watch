import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prisma,
  listSenadoresAtual,
  fetchSenatorProfileBundle,
  withSyncRun,
} = vi.hoisted(() => ({
  prisma: {
    senator: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    senatorAffiliation: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    senatorMandate: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    senatorMatter: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    senatorVote: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        senatorAffiliation: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        senatorMandate: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        senatorMatter: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        senatorVote: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        senator: { update: vi.fn() },
      }),
    ),
  },
  listSenadoresAtual: vi.fn(),
  fetchSenatorProfileBundle: vi.fn(),
  withSyncRun: vi.fn(
    async (_domain: string, fn: () => Promise<Record<string, number>>) => fn(),
  ),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/lib/senado/client", () => ({
  listSenadoresAtual,
  fetchSenatorProfileBundle,
}));
vi.mock("./run", () => ({ withSyncRun }));

import { ensureSenatorProfile, syncSenatorProfile, syncSenadores } from "./senado";

describe("sync senado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SENADO_PROFILE_TTL_MS;
  });

  it("syncSenadores faz upsert da lista", async () => {
    listSenadoresAtual.mockResolvedValue([
      {
        externalId: "5672",
        nome: "Alan Rick",
        nomeCivil: "Alan Rick Miranda",
        nomeEleitoral: "Alan Rick",
        siglaPartido: "REPUBLICANOS",
        siglaUf: "AC",
        email: null,
        urlFoto: null,
        urlPagina: null,
        situacao: "Exercício",
        participacao: "Titular",
      },
    ]);
    prisma.senator.upsert.mockResolvedValue({});

    const result = await syncSenadores();
    expect(result).toEqual({ senators: 1 });
    expect(prisma.senator.upsert).toHaveBeenCalledOnce();
  });

  it("syncSenatorProfile grava filiações, mandatos e matérias", async () => {
    prisma.senator.findUnique.mockResolvedValue({
      id: "senado:5672",
      externalId: "5672",
    });
    fetchSenatorProfileBundle.mockResolvedValue({
      affiliations: [
        {
          codigoPartido: "521",
          siglaPartido: "REPUBLICANOS",
          nomePartido: "Republicanos",
          dataFiliacao: "2025-11-12",
          dataDesfiliacao: null,
        },
      ],
      mandates: [
        {
          codigoMandato: "596",
          siglaUf: "AC",
          participacao: "Titular",
          legislaturaInicio: 57,
          legislaturaFim: 58,
          dataInicio: "2023-02-01",
          dataFim: "2031-01-31",
        },
      ],
      matters: [
        {
          externalId: "155808",
          siglaTipo: "RQS",
          numero: 41,
          ano: 2023,
          ementa: "x",
          dataApresentacao: "2023-02-02",
          identificacao: "RQS 41/2023",
          autorPrincipal: false,
          urlPublica: "https://example.com/155808",
        },
      ],
      votes: [
        {
          externalId: "999",
          tipoVoto: "Sim",
          descricaoVotacao: "Mérito",
          descricaoResultado: "Aprovado",
          dataSessao: "2023-10-24",
          materiaExternalId: "1",
          materiaIdentificacao: "PL 1/2023",
          materiaEmenta: null,
          urlPublica: null,
        },
      ],
    });

    const result = await syncSenatorProfile("5672");
    expect(result).toEqual({
      affiliations: 1,
      mandates: 1,
      matters: 1,
      votes: 1,
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(fetchSenatorProfileBundle).toHaveBeenCalledWith("5672");
  });

  it("ensureSenatorProfile sincroniza quando profileSyncedAt é nulo", async () => {
    const loaded = {
      id: "senado:5672",
      externalId: "5672",
      nome: "Alan Rick",
      nomeCivil: null,
      nomeEleitoral: "Alan Rick",
      siglaPartido: "REPUBLICANOS",
      siglaUf: "AC",
      urlFoto: null,
      urlPagina: null,
      email: null,
      situacao: "Exercício",
      participacao: "Titular",
      profileSyncedAt: new Date(),
      syncedAt: new Date(),
      affiliations: [],
      mandates: [],
      matters: [],
      votes: [],
    };
    prisma.senator.findUnique
      .mockResolvedValueOnce({
        id: "senado:5672",
        externalId: "5672",
        profileSyncedAt: null,
      })
      .mockResolvedValueOnce({
        id: "senado:5672",
        externalId: "5672",
        profileSyncedAt: null,
      })
      .mockResolvedValueOnce(loaded);
    fetchSenatorProfileBundle.mockResolvedValue({
      affiliations: [],
      mandates: [],
      matters: [],
      votes: [],
    });

    const row = await ensureSenatorProfile("5672");
    expect(row?.id).toBe("senado:5672");
    expect(row?.votes).toEqual([]);
    expect(fetchSenatorProfileBundle).toHaveBeenCalled();
  });
});
