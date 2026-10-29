import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getDeputyPropositions } = vi.hoisted(() => ({
  getDeputyPropositions: vi.fn(),
}));

vi.mock("@/lib/api/server", () => ({
  getDeputyPropositions: (...args: unknown[]) => getDeputyPropositions(...args),
}));

import { GET } from "./route";

function req(url: string) {
  return new NextRequest(url);
}

describe("GET /api/deputados/[id]/proposicoes", () => {
  it("valida id", async () => {
    const res = await GET(req("http://localhost/api/deputados/x/proposicoes"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(res.status).toBe(400);
  });

  it("retorna proposições com legislatura", async () => {
    getDeputyPropositions.mockResolvedValue({
      total: 1,
      stats: { aprovados: 0, apresentados: 1 },
      items: [],
    });
    const res = await GET(
      req("http://localhost/api/deputados/1/proposicoes?legislaturaId=56&pageSize=5"),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
    expect(getDeputyPropositions).toHaveBeenCalledWith(1, 5, 56);
  });

  it("mapeia legislature_not_found para 404", async () => {
    getDeputyPropositions.mockRejectedValue(new Error("legislature_not_found"));
    const res = await GET(req("http://localhost/api/deputados/1/proposicoes"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(404);
  });

  it("relança erros inesperados", async () => {
    getDeputyPropositions.mockRejectedValue(new Error("boom"));
    await expect(
      GET(req("http://localhost/api/deputados/1/proposicoes"), {
        params: Promise.resolve({ id: "1" }),
      }),
    ).rejects.toThrow("boom");
  });
});

