import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEventAta } = vi.hoisted(() => ({
  getEventAta: vi.fn(),
}));

vi.mock("@/lib/api/server", () => ({
  getEventAta: (...args: unknown[]) => getEventAta(...args),
}));

import { GET } from "./route";

describe("GET /api/eventos/[id]/ata", () => {
  beforeEach(() => {
    getEventAta.mockReset();
  });

  it("rejeita id inválido", async () => {
    const res = await GET(new Request("http://localhost/api/eventos/x/ata"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(res.status).toBe(400);
  });

  it("retorna ata", async () => {
    getEventAta.mockResolvedValue({
      eventId: 1,
      pauta: [],
      votacoes: [],
    });
    const res = await GET(new Request("http://localhost/api/eventos/1/ata"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
    expect(getEventAta).toHaveBeenCalledWith(1);
  });

  it("404 quando evento não existe", async () => {
    getEventAta.mockRejectedValue(new Error("event_not_found"));
    const res = await GET(new Request("http://localhost/api/eventos/9/ata"), {
      params: Promise.resolve({ id: "9" }),
    });
    expect(res.status).toBe(404);
  });
});
