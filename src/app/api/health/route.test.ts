import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    deputy: { count: vi.fn() },
    party: { count: vi.fn() },
    syncRun: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna ok com contagens", async () => {
    prisma.deputy.count.mockResolvedValue(10);
    prisma.party.count.mockResolvedValue(3);
    prisma.syncRun.findFirst.mockResolvedValue({ id: 1, domain: "deputies" });

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      counts: { deputies: 10, parties: 3 },
    });
  });

  it("retorna 500 em falha", async () => {
    prisma.deputy.count.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: "db down",
    });
  });

  it("serializa erro não-Error", async () => {
    prisma.deputy.count.mockRejectedValue("offline");
    const res = await GET();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: "offline" });
  });
});

