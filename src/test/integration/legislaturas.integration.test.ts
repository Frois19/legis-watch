import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/legislaturas/route";
import { resetDatabase, seedCoreFixtures } from "./db";

describe("integration GET /api/legislaturas", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedCoreFixtures();
  });

  it("lista legislaturas persistidas com labels", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({
      id: 57,
      label: "57ª (2023–2027)",
    });
    expect(body.items[1].id).toBe(56);
  });
});
