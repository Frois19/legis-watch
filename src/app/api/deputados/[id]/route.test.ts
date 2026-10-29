import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getDeputy } = vi.hoisted(() => ({
  getDeputy: vi.fn(),
}));

vi.mock("@/lib/api/server", () => ({
  getDeputy: (...args: unknown[]) => getDeputy(...args),
}));

import { GET } from "./route";

describe("GET /api/deputados/[id]", () => {
  it("valida id", async () => {
    const res = await GET(new NextRequest("http://localhost/api/deputados/x"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(res.status).toBe(400);
  });

  it("retorna detalhe", async () => {
    getDeputy.mockResolvedValue({ id: 1, nome: "A" });
    const res = await GET(
      new NextRequest("http://localhost/api/deputados/1?legislaturaId=57"),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
    expect(getDeputy).toHaveBeenCalledWith(1, 57);
  });

  it("retorna 404", async () => {
    getDeputy.mockRejectedValue(new Error("not_found"));
    const res = await GET(new NextRequest("http://localhost/api/deputados/9"), {
      params: Promise.resolve({ id: "9" }),
    });
    expect(res.status).toBe(404);
  });
});
