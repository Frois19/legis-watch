import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    deputyMandate: { findMany: vi.fn() },
    deputy: { findMany: vi.fn() },
    stateDeputy: { findMany: vi.fn(), findUnique: vi.fn() },
    senator: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

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

  it("retorna perfil de senador com disclaimer de presença", async () => {
    prisma.senator.findUnique.mockResolvedValue({
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
      syncedAt: new Date("2026-10-29T12:00:00Z"),
    });

    const res = await getParlamentar(new Request("http://localhost"), {
      params: Promise.resolve({ source: "senado", id: "5672" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sphere).toBe("senador");
    expect(body.coverage.attendance).toBe(false);
    expect(body.attendanceDisclaimer).toMatch(/Diário do Senado/i);
  });
});
