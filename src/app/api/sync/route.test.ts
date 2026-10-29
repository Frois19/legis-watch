import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  syncParties,
  syncDeputies,
  syncPropositionsForDeputy,
  syncVotesForYear,
  syncAttendanceForYear,
} = vi.hoisted(() => ({
  syncParties: vi.fn(async () => ({ parties: 1 })),
  syncDeputies: vi.fn(async () => ({ deputies: 1 })),
  syncPropositionsForDeputy: vi.fn(async () => ({ propositions: 1 })),
  syncVotesForYear: vi.fn(async () => ({ votes: 1 })),
  syncAttendanceForYear: vi.fn(async () => ({ attendances: 1 })),
}));

vi.mock("@/lib/sync", () => ({
  syncParties,
  syncDeputies,
  syncPropositionsForDeputy,
  syncVotesForYear,
  syncAttendanceForYear,
}));

import { POST } from "./route";

function post(body: unknown, headers?: Record<string, string>) {
  return POST(
    new NextRequest("http://localhost/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SYNC_SECRET;
  });

  afterEach(() => {
    delete process.env.SYNC_SECRET;
  });

  it("exige secret quando configurado", async () => {
    process.env.SYNC_SECRET = "segredo";
    const res = await post({ domain: "parties" });
    expect(res.status).toBe(401);
  });

  it("rejeita JSON/payload inválido", async () => {
    const badJson = await POST(
      new NextRequest("http://localhost/api/sync", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(badJson.status).toBe(400);

    const badPayload = await post({ domain: "nope" });
    expect(badPayload.status).toBe(400);
  });

  it("dispara domains principais", async () => {
    process.env.SYNC_SECRET = "segredo";
    const headers = { "x-sync-secret": "segredo" };

    expect((await post({ domain: "parties" }, headers)).status).toBe(200);
    expect(
      (await post({ domain: "deputies" }, headers)).status,
    ).toBe(200);
    expect(
      (await post({ domain: "propositions" }, headers)).status,
    ).toBe(400);
    expect(
      (await post({ domain: "propositions", deputyId: 1 }, headers)).status,
    ).toBe(200);
    expect(
      (await post({ domain: "votes", year: 2026 }, headers)).status,
    ).toBe(200);
    expect(
      (await post({ domain: "attendance", year: 2026 }, headers)).status,
    ).toBe(200);
    expect(
      (await post({ domain: "bootstrap" }, headers)).status,
    ).toBe(200);
  });

  it("retorna 500 quando sync falha", async () => {
    syncParties.mockRejectedValueOnce(new Error("falha"));
    const res = await post({ domain: "parties" });
    expect(res.status).toBe(500);
  });

  it("serializa erro não-Error no 500", async () => {
    syncParties.mockRejectedValueOnce("x");
    const res = await post({ domain: "parties" });
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: "x" });
  });
});

