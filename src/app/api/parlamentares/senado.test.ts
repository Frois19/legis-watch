import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma, ensureSenatorProfile } = vi.hoisted(() => ({
  prisma: {
    deputyMandate: { findMany: vi.fn() },
    deputy: { findMany: vi.fn() },
    stateDeputy: { findMany: vi.fn(), findUnique: vi.fn() },
    senator: { findMany: vi.fn(), findUnique: vi.fn() },
  },
  ensureSenatorProfile: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/lib/sync/senado", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sync/senado")>();
  return { ...actual, ensureSenatorProfile };
});

import { searchCache } from "@/lib/cache/memory-cache";
import { GET as listParlamentares } from "./route";
import { GET as getParlamentar } from "./[source]/[id]/route";

describe("API senadores via /api/parlamentares", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchCache.clear();
    prisma.deputy.findMany.mockResolvedValue([]);
    prisma.deputyMandate.findMany.mockResolvedValue([]);
    prisma.stateDeputy.findMany.mockResolvedValue([]);
    prisma.senator.findMany.mockResolvedValue([]);
  });

  it("lista senadores com esfera=senador", async () => {
    prisma.senator.findMany.mockResolvedValue([
      {
        id: "senado:5672",
        source: "senado",
        externalId: "5672",
        nome: "Alan Rick",
        nomeEleitoral: "Alan Rick",
        siglaPartido: "REPUBLICANOS",
        siglaUf: "AC",
        urlFoto: "https://www.senado.leg.br/foto.jpg",
        email: "sen.alanrick@senado.leg.br",
        situacao: "Exercício",
      },
    ]);

    const res = await listParlamentares(
      new NextRequest(
        "http://localhost/api/parlamentares?esfera=senador&siglaUf=AC",
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0]).toMatchObject({
      sphere: "senador",
      source: "senado",
      href: "/parlamentares/senado/5672",
      assemblyName: "Senado Federal",
    });
  });

  it("retorna perfil enriquecido com disclaimer de presença", async () => {
    ensureSenatorProfile.mockResolvedValue({
      id: "senado:5672",
      source: "senado",
      externalId: "5672",
      nome: "Alan Rick",
      nomeCivil: "Alan Rick Miranda",
      nomeEleitoral: "Alan Rick",
      siglaPartido: "REPUBLICANOS",
      siglaUf: "AC",
      urlFoto: null,
      urlPagina: "https://www25.senado.leg.br/web/senadores/senador/-/perfil/5672",
      email: "sen.alanrick@senado.leg.br",
      situacao: "Exercício",
      participacao: "Titular",
      profileSyncedAt: new Date("2026-10-29T12:00:00Z"),
      syncedAt: new Date("2026-10-29T12:00:00Z"),
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
          id: "senado:5672:materia:155808",
          externalId: "155808",
          siglaTipo: "RQS",
          numero: 41,
          ano: 2023,
          ementa: "Desarquivamento",
          dataApresentacao: "2023-02-02",
          identificacao: "RQS 41/2023",
          autorPrincipal: false,
          urlPublica:
            "https://www25.senado.leg.br/web/atividade/materias/-/materia/155808",
        },
      ],
      votes: [
        {
          id: "senado:5672:votacao:365429-1",
          externalId: "365429-1",
          tipoVoto: "Sim",
          descricaoVotacao: "Votação do mérito",
          descricaoResultado: "Aprovado",
          dataSessao: "2023-10-24",
          materiaExternalId: "159365",
          materiaIdentificacao: "PL 5384/2020",
          materiaEmenta: "Altera a Lei nº 12.711/2012.",
          urlPublica:
            "https://www25.senado.leg.br/web/atividade/materias/-/materia/159365",
        },
      ],
    });

    const res = await getParlamentar(new Request("http://localhost"), {
      params: Promise.resolve({ source: "senado", id: "5672" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sphere).toBe("senador");
    expect(body.coverage.attendance).toBe(false);
    expect(body.coverage.propositions).toBe(true);
    expect(body.coverage.votes).toBe(true);
    expect(body.attendanceDisclaimer).toMatch(/Diário do Senado/i);
    expect(body.affiliations).toHaveLength(1);
    expect(body.mandates[0].codigoMandato).toBe("596");
    expect(body.matters[0].identificacao).toBe("RQS 41/2023");
    expect(body.votes[0].tipoVoto).toBe("Sim");
    expect(body.votes[0].materiaIdentificacao).toBe("PL 5384/2020");
    expect(ensureSenatorProfile).toHaveBeenCalledWith("5672");
  });
});
