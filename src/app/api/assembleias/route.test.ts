import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    stateDeputy: {
      groupBy: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { GET } from "./route";

describe("GET /api/assembleias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista casas registradas com contagem sync", async () => {
    prisma.stateDeputy.groupBy.mockResolvedValue([
      { source: "alepe", _count: { _all: 8 } },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "alepe",
          uf: "PE",
          syncedCount: 8,
        }),
      ]),
    );
  });
});
