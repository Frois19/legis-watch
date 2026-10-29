import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listParlamentares } from "@/app/api/parlamentares/route";
import { GET as getParlamentar } from "@/app/api/parlamentares/[source]/[id]/route";
import { syncSenatorProfile, syncSenadores } from "@/lib/sync";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "./db";

describe("integration senadores", () => {
  beforeAll(async () => {
    process.env.SENADO_TIMEOUT_MS = "800";
    delete process.env.SENADO_REQUIRE_LIVE;
    await resetDatabase();
    const result = await syncSenadores();
    expect(result.senators).toBeGreaterThanOrEqual(10);
  });

  it("persiste senadores no SQLite", async () => {
    const count = await prisma.senator.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it("busca por esfera=senador", async () => {
    const res = await listParlamentares(
      new NextRequest(
        "http://localhost/api/parlamentares?esfera=senador&pageSize=50",
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBeGreaterThanOrEqual(10);
    expect(
      body.items.every(
        (i: { sphere: string; source: string }) =>
          i.sphere === "senador" && i.source === "senado",
      ),
    ).toBe(true);
  });

  it("abre perfil namespaced senado:{codigo}", async () => {
    const first = await prisma.senator.findFirst({ orderBy: { nome: "asc" } });
    expect(first).toBeTruthy();
    const res = await getParlamentar(new Request("http://localhost"), {
      params: Promise.resolve({
        source: "senado",
        id: first!.externalId,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      sphere: "senador",
      externalId: first!.externalId,
      coverage: expect.objectContaining({
        attendance: false,
        propositions: true,
      }),
    });
    expect(body.attendanceDisclaimer).toMatch(/Diário do Senado/i);
    expect(Array.isArray(body.affiliations)).toBe(true);
    expect(Array.isArray(body.mandates)).toBe(true);
    expect(Array.isArray(body.matters)).toBe(true);
  });

  it("syncSenatorProfile persiste filiações/mandatos/matérias", async () => {
    const target =
      (await prisma.senator.findUnique({ where: { id: "senado:5672" } })) ??
      (await prisma.senator.findFirst({ orderBy: { nome: "asc" } }));
    expect(target).toBeTruthy();
    const result = await syncSenatorProfile(target!.externalId);
    expect(result.affiliations + result.mandates + result.matters).toBeGreaterThan(
      0,
    );
    const enriched = await prisma.senator.findUnique({
      where: { id: target!.id },
      include: {
        affiliations: true,
        mandates: true,
        matters: true,
      },
    });
    expect(enriched?.profileSyncedAt).toBeTruthy();
    expect(
      (enriched?.affiliations.length ?? 0) +
        (enriched?.mandates.length ?? 0) +
        (enriched?.matters.length ?? 0),
    ).toBeGreaterThan(0);
  });
});
