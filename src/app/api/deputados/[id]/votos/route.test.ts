import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getDeputyVotes } = vi.hoisted(() => ({
  getDeputyVotes: vi.fn(),
}));

vi.mock("@/lib/api/server", () => ({
  getDeputyVotes: (...args: unknown[]) => getDeputyVotes(...args),
}));

import { GET } from "./route";

describe("GET /api/deputados/[id]/votos", () => {
  it("valida id e legislatura", async () => {
    const bad = await GET(new NextRequest("http://localhost/api/deputados/x/votos"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(bad.status).toBe(400);

    getDeputyVotes.mockResolvedValue({ total: 0, items: [] });
    const ok = await GET(
      new NextRequest("http://localhost/api/deputados/2/votos?legislaturaId=57"),
      { params: Promise.resolve({ id: "2" }) },
    );
    expect(ok.status).toBe(200);
    expect(getDeputyVotes).toHaveBeenCalledWith(2, 20, 57);
  });

  it("retorna 404 quando legislatura não existe", async () => {
    getDeputyVotes.mockRejectedValue(new Error("legislature_not_found"));
    const res = await GET(new NextRequest("http://localhost/api/deputados/2/votos"), {
      params: Promise.resolve({ id: "2" }),
    });
    expect(res.status).toBe(404);
  });

  it("relança erros inesperados", async () => {
    getDeputyVotes.mockRejectedValue("x");
    await expect(
      GET(new NextRequest("http://localhost/api/deputados/2/votos"), {
        params: Promise.resolve({ id: "2" }),
      }),
    ).rejects.toBe("x");
  });
});

