import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listLegislatures,
  listParties,
  listDeputies,
  getDeputyHistorico,
  partyIdFromUri,
  currentLegislatura,
  prisma,
} = vi.hoisted(() => ({
  listLegislatures: vi.fn(),
  listParties: vi.fn(),
  listDeputies: vi.fn(),
  getDeputyHistorico: vi.fn(),
  partyIdFromUri: vi.fn(),
  currentLegislatura: vi.fn(() => 57),
  prisma: {
    legislature: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    party: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    deputy: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deputyMandate: {
      upsert: vi.fn(),
    },
    syncRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/camara/client", () => ({
  listLegislatures,
  listParties,
  listDeputies,
  getDeputyHistorico,
  partyIdFromUri,
  currentLegislatura,
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import {
  syncDeputiesForLegislature,
  syncLegislatures,
  syncMandatesForDeputy,
  syncMandatesForDeputies,
  upsertDeputyMandate,
} from "./legislatures";

describe("sync legislatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.syncRun.create.mockResolvedValue({ id: 1 });
    prisma.syncRun.update.mockResolvedValue({ id: 1 });
    partyIdFromUri.mockReturnValue(null);
  });

  it("syncLegislatures ignora itens incompletos", async () => {
    listLegislatures.mockResolvedValue([
      { id: 57, dataInicio: "2023-02-01", dataFim: "2027-01-31", uri: "u" },
      { id: 0, dataInicio: "x", dataFim: "y" },
      { id: 56, dataInicio: "", dataFim: "2023-01-31" },
    ]);
    prisma.legislature.upsert.mockResolvedValue({});

    const result = await syncLegislatures();
    expect(result.legislatures).toBe(1);
    expect(prisma.legislature.upsert).toHaveBeenCalledTimes(1);
  });

  it("upsertDeputyMandate exige legislatura e resolve partido", async () => {
    prisma.legislature.findUnique.mockResolvedValue(null);
    await expect(
      upsertDeputyMandate({ deputyId: 1, legislaturaId: 56 }),
    ).rejects.toThrow("não sincronizada");

    prisma.legislature.findUnique.mockResolvedValue({ id: 56 });
    partyIdFromUri.mockReturnValue(null);
    prisma.party.findFirst.mockResolvedValue({ id: 9 });
    prisma.deputyMandate.upsert.mockResolvedValue({});

    await upsertDeputyMandate({
      deputyId: 1,
      legislaturaId: 56,
      siglaPartido: "AVANTE",
      siglaUf: "MG",
    });
    expect(prisma.deputyMandate.upsert).toHaveBeenCalled();
  });

  it("syncMandatesForDeputy consolida histórico por legislatura", async () => {
    getDeputyHistorico.mockResolvedValue([
      {
        idLegislatura: 56,
        siglaPartido: "AVANTE",
        siglaUf: "MG",
        dataHora: "2019-02-01T00:00:00",
        nome: "A",
      },
      {
        idLegislatura: 56,
        siglaPartido: "AVANTE",
        siglaUf: "MG",
        situacao: "FIM_MANDATO",
        dataHora: "2023-01-31T23:59:00",
        nomeEleitoral: "A",
      },
      { idLegislatura: 99, siglaPartido: "X" },
      { nome: "sem leg" },
    ]);
    prisma.legislature.findUnique.mockImplementation(async ({ where }) =>
      where.id === 56 ? { id: 56 } : null,
    );
    prisma.deputy.findUnique.mockResolvedValue({ id: 204515 });
    prisma.deputyMandate.upsert.mockResolvedValue({});

    const result = await syncMandatesForDeputy(204515);
    expect(result.mandates).toBe(1);
    expect(result.historyEvents).toBe(4);
  });

  it("syncDeputiesForLegislature cria stubs e mandatos", async () => {
    listParties.mockResolvedValue([
      { id: 1, sigla: "AVANTE", nome: "Avante", uri: "u", idLegislatura: 56 },
    ]);
    listDeputies.mockResolvedValue([
      {
        id: 204515,
        nome: "André Janones",
        siglaPartido: "AVANTE",
        uriPartido: "https://dadosabertos.camara.leg.br/api/v2/partidos/1",
        siglaUf: "MG",
        urlFoto: null,
        email: null,
      },
      {
        id: 2,
        nome: "Novo",
        siglaPartido: "PL",
        siglaUf: "MG",
      },
    ]);
    partyIdFromUri.mockReturnValue(1);
    prisma.party.upsert.mockResolvedValue({});
    prisma.deputy.findUnique
      .mockResolvedValueOnce({ id: 204515 })
      .mockResolvedValueOnce(null);
    prisma.deputy.create.mockResolvedValue({});
    prisma.legislature.findUnique.mockResolvedValue({ id: 56 });
    prisma.deputyMandate.upsert.mockResolvedValue({});
    currentLegislatura.mockReturnValue(57);

    const result = await syncDeputiesForLegislature(56);
    expect(result.parties).toBe(1);
    expect(result.listed).toBe(2);
    expect(result.mandates).toBe(2);
    expect(prisma.deputy.create).toHaveBeenCalledTimes(1);
  });

  it("syncMandatesForDeputies processa lista", async () => {
    getDeputyHistorico.mockResolvedValue([]);
    const results = await syncMandatesForDeputies([1]);
    expect(results).toHaveLength(1);
    expect(results[0]?.deputyId).toBe(1);
  });

  it("atualiza cadastro quando a legislatura sincronizada é a atual", async () => {
    currentLegislatura.mockReturnValue(57);
    listParties.mockResolvedValue([]);
    listDeputies.mockResolvedValue([
      {
        id: 10,
        nome: "Atual",
        siglaPartido: "PL",
        siglaUf: "MG",
        urlFoto: "https://foto",
        email: "a@b.c",
      },
    ]);
    prisma.deputy.findUnique.mockResolvedValue({ id: 10 });
    prisma.deputy.update.mockResolvedValue({});
    prisma.legislature.findUnique.mockResolvedValue({ id: 57 });
    prisma.deputyMandate.upsert.mockResolvedValue({});
    partyIdFromUri.mockReturnValue(null);
    prisma.party.findFirst.mockResolvedValue(null);

    const result = await syncDeputiesForLegislature(57);
    expect(result.deputies).toBe(1);
    expect(prisma.deputy.update).toHaveBeenCalled();
  });

  it("upsertMandate usa partyId da uri quando disponível", async () => {
    prisma.legislature.findUnique.mockResolvedValue({ id: 56 });
    partyIdFromUri.mockReturnValue(77);
    prisma.deputyMandate.upsert.mockResolvedValue({});
    await upsertDeputyMandate({
      deputyId: 1,
      legislaturaId: 56,
      uriPartido: "https://dadosabertos.camara.leg.br/api/v2/partidos/77",
    });
    expect(prisma.party.findFirst).not.toHaveBeenCalled();
  });
});

