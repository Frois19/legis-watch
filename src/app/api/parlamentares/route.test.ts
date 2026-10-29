import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    deputyMandate: { findMany: vi.fn() },
    deputy: { findMany: vi.fn() },
    stateDeputy: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { searchCache } from "@/lib/cache/memory-cache";
import { GET } from "./route";

describe("GET /api/parlamentares", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchCache.clear();
    prisma.deputy.findMany.mockResolvedValue([]);
    prisma.deputyMandate.findMany.mockResolvedValue([]);
    prisma.stateDeputy.findMany.mockResolvedValue([]);
  });

  it("lista estaduais com esfera=estadual_deputado", async () => {
    prisma.stateDeputy.findMany.mockResolvedValue([
      {
        id: "alepe:joao-paulo",
        source: "alepe",
        externalId: "joao-paulo",
        uf: "PE",
        nome: "João Paulo",
        nomeEleitoral: "João Paulo",
        siglaPartido: "PT",
        urlFoto: null,
        email: "joao@alepe.pe.gov.br",
        situacao: "Exercício",
      },
    ]);

    const res = await GET(
      new NextRequest(
        "http://localhost/api/parlamentares?esfera=estadual_deputado&siglaUf=PE",
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Cache")).toBe("MISS");
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0]).toMatchObject({
      sphere: "estadual_deputado",
      source: "alepe",
      siglaUf: "PE",
      href: "/parlamentares/alepe/joao-paulo",
    });

    const cached = await GET(
      new NextRequest(
        "http://localhost/api/parlamentares?esfera=estadual_deputado&siglaUf=PE",
      ),
    );
    expect(cached.headers.get("X-Cache")).toBe("HIT");
    expect(prisma.stateDeputy.findMany).toHaveBeenCalledTimes(1);
  });

  it("mistura federal e estadual em esfera=todos", async () => {
    prisma.deputy.findMany.mockResolvedValue([
      {
        id: 1,
        nome: "Federal A",
        nomeEleitoral: null,
        siglaPartido: "PL",
        siglaUf: "PE",
        legislaturaId: 57,
        urlFoto: null,
        email: null,
        situacao: null,
      },
    ]);
    prisma.stateDeputy.findMany.mockResolvedValue([
      {
        id: "alepe:x",
        source: "alepe",
        externalId: "x",
        uf: "PE",
        nome: "Estadual B",
        nomeEleitoral: null,
        siglaPartido: "PT",
        urlFoto: null,
        email: null,
        situacao: null,
      },
    ]);

    const res = await GET(
      new NextRequest("http://localhost/api/parlamentares?esfera=todos"),
    );
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.items.map((i: { sphere: string }) => i.sphere).sort()).toEqual([
      "estadual_deputado",
      "federal_deputado",
    ]);
  });
});
