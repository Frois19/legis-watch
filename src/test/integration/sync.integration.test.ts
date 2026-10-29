import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/sync/route";
import { resetDatabase, seedCoreFixtures } from "./db";

function post(body: unknown, headers?: Record<string, string>) {
  return POST(
    new NextRequest("http://localhost/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("integration POST /api/sync", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedCoreFixtures();
    delete process.env.SYNC_SECRET;
  });

  afterEach(() => {
    delete process.env.SYNC_SECRET;
  });

  it("bloqueia sem secret quando SYNC_SECRET está definido", async () => {
    process.env.SYNC_SECRET = "interno";
    const res = await post({ domain: "parties" });
    expect(res.status).toBe(401);
  });

  it("rejeita payload inválido sem chamar Câmara", async () => {
    const res = await post({ domain: "propositions" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/deputyId|payload/i);
  });

  it("aceita secret correto e exige deputyId em proposições", async () => {
    process.env.SYNC_SECRET = "interno";
    const res = await post(
      { domain: "propositions" },
      { "x-sync-secret": "interno" },
    );
    expect(res.status).toBe(400);
  });
});
