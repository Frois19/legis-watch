import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prisma,
  getStateAdapter,
  withSyncRun,
} = vi.hoisted(() => ({
  prisma: {
    stateDeputy: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stateDeputyAffiliation: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    stateDeputyMandate: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    stateProposition: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    stateAttendance: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    stateVote: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        stateDeputy: { update: vi.fn() },
        stateDeputyAffiliation: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        stateDeputyMandate: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        stateProposition: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        stateAttendance: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        stateVote: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      }),
    ),
  },
  getStateAdapter: vi.fn(),
  withSyncRun: vi.fn(
    async (_domain: string, fn: () => Promise<Record<string, number>>) => fn(),
  ),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/lib/parliament/adapters", () => ({ getStateAdapter }));
vi.mock("./run", () => ({ withSyncRun }));

import {
  ensureStateDeputyProfile,
  syncStateDeputyProfile,
} from "./estadual";

describe("sync estadual perfil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ESTADUAL_PROFILE_TTL_MS;
  });

  it("syncStateDeputyProfile grava filiações, mandatos e proposições", async () => {
    getStateAdapter.mockReturnValue({
      info: { uf: "AC", source: "aleac" },
      getParliamentarian: vi.fn().mockResolvedValue({
        nome: "Ney Amorim",
        nomeEleitoral: "Ney Amorim",
        siglaPartido: "PT",
        email: null,
        urlFoto: null,
        situacao: "Exercício",
      }),
      fetchProfileBundle: vi.fn().mockResolvedValue({
        affiliations: [
          {
            codigoPartido: "13",
            siglaPartido: "PT",
            nomePartido: "Partido dos Trabalhadores",
            dataFiliacao: "2023-01-01",
            dataDesfiliacao: null,
          },
        ],
        mandates: [
          {
            codigoMandato: "1",
            siglaUf: "AC",
            participacao: "Titular",
            legislaturaInicio: 19,
            legislaturaFim: 20,
            dataInicio: "2023-02-01",
            dataFim: "2027-01-31",
          },
        ],
        propositions: [
          {
            externalId: "100",
            siglaTipo: "PL",
            numero: 5,
            ano: 2024,
            ementa: "Teste",
            dataApresentacao: "2024-01-10",
            statusResumo: "Tramitando",
            urlPublica: "https://example.com/100",
          },
        ],
      }),
    });
    prisma.stateDeputy.findUnique.mockResolvedValue({
      id: "aleac:248",
      source: "aleac",
      externalId: "248",
      siglaPartido: "PT",
      email: null,
      urlFoto: null,
      situacao: "Exercício",
    });

    const result = await syncStateDeputyProfile("aleac", "248");
    expect(result).toEqual({
      affiliations: 1,
      mandates: 1,
      propositions: 1,
      attendance: 0,
      votes: 0,
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("ensureStateDeputyProfile sincroniza quando o perfil está stale", async () => {
    const loaded = {
      id: "aleac:248",
      source: "aleac",
      externalId: "248",
      nome: "Ney Amorim",
      affiliations: [],
      mandates: [],
      propositions: [],
      profileSyncedAt: new Date(),
    };
    getStateAdapter.mockReturnValue({
      info: { uf: "AC", source: "aleac" },
      getParliamentarian: vi.fn().mockResolvedValue(null),
      fetchProfileBundle: vi.fn().mockResolvedValue({
        affiliations: [],
        mandates: [],
        propositions: [],
      }),
    });
    prisma.stateDeputy.findUnique
      .mockResolvedValueOnce({
        id: "aleac:248",
        externalId: "248",
        profileSyncedAt: null,
      })
      .mockResolvedValueOnce({
        id: "aleac:248",
        externalId: "248",
        siglaPartido: null,
        email: null,
        urlFoto: null,
        situacao: null,
      })
      .mockResolvedValueOnce(loaded);

    const row = await ensureStateDeputyProfile("aleac", "248");
    expect(row?.id).toBe("aleac:248");
    expect(withSyncRun).toHaveBeenCalled();
  });

  it("ensureStateDeputyProfile não força sync sem fetchProfileBundle", async () => {
    getStateAdapter.mockReturnValue({
      info: { uf: "PE", source: "alepe" },
    });
    prisma.stateDeputy.findUnique
      .mockResolvedValueOnce({
        id: "alepe:joao-paulo",
        profileSyncedAt: null,
      })
      .mockResolvedValueOnce({
        id: "alepe:joao-paulo",
        affiliations: [],
        mandates: [],
        propositions: [],
      });

    const row = await ensureStateDeputyProfile("alepe", "joao-paulo");
    expect(row?.id).toBe("alepe:joao-paulo");
    expect(withSyncRun).not.toHaveBeenCalled();
  });
});
