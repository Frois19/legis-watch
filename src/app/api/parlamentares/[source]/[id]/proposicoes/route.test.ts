import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma, ensureStateDeputyProfile } = vi.hoisted(() => ({
  prisma: {
    stateDeputy: { findUnique: vi.fn() },
    stateProposition: { count: vi.fn(), findMany: vi.fn() },
  },
  ensureStateDeputyProfile: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/lib/sync/estadual", () => ({ ensureStateDeputyProfile }));

import { GET } from "./route";

function req(url: string) {
  return new NextRequest(url);
}

describe("GET /api/parlamentares/[source]/[id]/proposicoes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita senado e parâmetros vazios", async () => {
    const senado = await GET(
      req("http://localhost/api/parlamentares/senado/5672/proposicoes"),
      { params: Promise.resolve({ source: "senado", id: "5672" }) },
    );
    expect(senado.status).toBe(400);

    const empty = await GET(
      req("http://localhost/api/parlamentares//proposicoes"),
      { params: Promise.resolve({ source: "", id: "" }) },
    );
    expect(empty.status).toBe(400);
  });

  it("retorna 404 quando o parlamentar não existe", async () => {
    ensureStateDeputyProfile.mockResolvedValue(null);
    prisma.stateDeputy.findUnique.mockResolvedValue(null);

    const res = await GET(
      req("http://localhost/api/parlamentares/aleac/999/proposicoes"),
      { params: Promise.resolve({ source: "aleac", id: "999" }) },
    );
    expect(res.status).toBe(404);
    expect(ensureStateDeputyProfile).toHaveBeenCalledWith("aleac", "999");
  });

  it("lista proposições paginadas do estadual", async () => {
    ensureStateDeputyProfile.mockResolvedValue({ id: "aleac:248" });
    prisma.stateDeputy.findUnique.mockResolvedValue({
      id: "aleac:248",
      source: "aleac",
      externalId: "248",
    });
    prisma.stateProposition.count.mockResolvedValue(1);
    prisma.stateProposition.findMany.mockResolvedValue([
      {
        id: "aleac:prop:1",
        externalId: "1",
        siglaTipo: "PL",
        numero: 10,
        ano: 2024,
        ementa: "Dispõe sobre teste",
        dataApresentacao: "2024-03-01",
        statusResumo: "Em tramitação",
        urlPublica: "https://example.com/1",
      },
    ]);

    const res = await GET(
      req(
        "http://localhost/api/parlamentares/aleac/248/proposicoes?page=1&pageSize=20",
      ),
      { params: Promise.resolve({ source: "aleac", id: "248" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
    });
    expect(body.items[0]).toMatchObject({
      externalId: "1",
      siglaTipo: "PL",
      numero: 10,
      ano: 2024,
    });
    expect(prisma.stateProposition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stateDeputyId: "aleac:248" },
        skip: 0,
        take: 20,
      }),
    );
  });
});
