import { beforeEach, describe, expect, it, vi } from "vitest";

const { enrichPropositions } = vi.hoisted(() => ({
  enrichPropositions: vi.fn(),
}));

vi.mock("@/lib/propositions/enrich", () => ({
  enrichPropositions: (...args: unknown[]) => enrichPropositions(...args),
}));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/proposicoes/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/proposicoes/enrich", () => {
  beforeEach(() => {
    enrichPropositions.mockReset();
  });

  it("rejeita body inválido", async () => {
    const res = await POST(req({ ids: ["x"] }) as never);
    expect(res.status).toBe(400);
  });

  it("enriquece ids válidos", async () => {
    enrichPropositions.mockResolvedValue([{ id: 1, authors: [] }]);
    const res = await POST(req({ ids: [1, 2] }) as never);
    expect(res.status).toBe(200);
    expect(enrichPropositions).toHaveBeenCalledWith([1, 2]);
    await expect(res.json()).resolves.toEqual({
      items: [{ id: 1, authors: [] }],
    });
  });

  it("trata erro interno", async () => {
    enrichPropositions.mockRejectedValue(new Error("camara down"));
    const res = await POST(req({ ids: [1] }) as never);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "camara down" });
  });
});
