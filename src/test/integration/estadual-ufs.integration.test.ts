import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listParlamentares } from "@/app/api/parlamentares/route";
import { GET as getParlamentar } from "@/app/api/parlamentares/[source]/[id]/route";
import { GET as listAssembleias } from "@/app/api/assembleias/route";
import { BRAZIL_UFS, getCatalogEntryByUf } from "@/lib/parliament/ufs";
import { syncAllStateAssemblies } from "@/lib/sync";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "./db";

describe("integration estadual — 27 UFs", () => {
  beforeAll(async () => {
    process.env.ALEPE_TIMEOUT_MS = "800";
    delete process.env.ALEPE_REQUIRE_LIVE;
    await resetDatabase();
    const result = await syncAllStateAssemblies();
    expect(result.assemblies).toBe(27);
    expect(result.failures).toBe(0);
    expect(result.parliamentarians).toBeGreaterThanOrEqual(54);
  });

  it("catálogo /api/assembleias cobre as 27 UFs com sync", async () => {
    const res = await listAssembleias();
    const body = await res.json();
    expect(body.items).toHaveLength(27);
    const ufs = new Set(body.items.map((i: { uf: string }) => i.uf));
    for (const uf of BRAZIL_UFS) {
      expect(ufs.has(uf)).toBe(true);
    }
    expect(
      body.items.every((i: { syncedCount: number }) => i.syncedCount >= 2),
    ).toBe(true);
  });

  it.each([...BRAZIL_UFS])(
    "GET /api/parlamentares?esfera=estadual&siglaUf=%s",
    async (uf) => {
      const res = await listParlamentares(
        new NextRequest(
          `http://localhost/api/parlamentares?esfera=estadual_deputado&siglaUf=${uf}&pageSize=50`,
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.total).toBeGreaterThanOrEqual(2);
      expect(
        body.items.every(
          (i: { siglaUf: string; sphere: string; href: string }) =>
            i.siglaUf === uf &&
            i.sphere === "estadual_deputado" &&
            i.href.startsWith("/parlamentares/"),
        ),
      ).toBe(true);

      const first = body.items[0];
      const entry = getCatalogEntryByUf(uf)!;
      const detail = await getParlamentar(new Request("http://localhost"), {
        params: Promise.resolve({
          source: entry.source,
          id: first.id.toString().includes(":")
            ? String(first.id).split(":").slice(1).join(":")
            : first.href.split("/").pop()!,
        }),
      });
      expect(detail.status).toBe(200);
      const profile = await detail.json();
      expect(profile.siglaUf).toBe(uf);
      expect(profile.source).toBe(entry.source);
    },
  );

  it("persiste ao menos 2 deputados por UF no SQLite", async () => {
    const grouped = await prisma.stateDeputy.groupBy({
      by: ["uf"],
      _count: { _all: true },
    });
    expect(grouped).toHaveLength(27);
    for (const row of grouped) {
      expect(row._count._all).toBeGreaterThanOrEqual(2);
    }
  });
});
