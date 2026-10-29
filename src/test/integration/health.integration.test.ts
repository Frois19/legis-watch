import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { resetDatabase, seedCoreFixtures } from "./db";

describe("integration GET /api/health", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedCoreFixtures();
  });

  it("reflete contagens reais do banco", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.counts.deputies).toBe(2);
    expect(body.counts.parties).toBe(3);
    expect(body.lastSync?.domain).toBe("deputies");
  });
});
