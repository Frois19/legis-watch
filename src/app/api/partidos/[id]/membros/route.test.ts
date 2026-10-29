import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    party: { findUnique: vi.fn() },
    deputy: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { GET } from "./route";

describe("GET /api/partidos/[id]/membros", () => {
  beforeEach(() => vi.clearAllMocks());

  it("valida id e 404", async () => {
    const bad = await GET(
      new NextRequest("http://localhost/api/partidos/x/membros"),
      { params: Promise.resolve({ id: "x" }) },
    );
    expect(bad.status).toBe(400);

    prisma.party.findUnique.mockResolvedValue(null);
    const missing = await GET(
      new NextRequest("http://localhost/api/partidos/1/membros"),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(missing.status).toBe(404);
  });

  it("lista membros filtrando legislatura", async () => {
    prisma.party.findUnique.mockResolvedValue({ id: 1, sigla: "PL" });
    prisma.deputy.findMany.mockResolvedValue([
      { id: 2, nome: "B", siglaUf: "MG", urlFoto: null, situacao: null, legislaturaId: 57 },
    ]);
    const res = await GET(
      new NextRequest(
        "http://localhost/api/partidos/1/membros?legislaturaId=57",
      ),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toHaveLength(1);
  });
});
