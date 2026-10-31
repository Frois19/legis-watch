import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getParlamentar } from "@/app/api/parlamentares/[source]/[id]/route";
import { syncStateAssembly, syncStateDeputyProfile } from "@/lib/sync";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "./db";

describe("integration ALEP (PR)", () => {
  beforeAll(async () => {
    process.env.ALEP_TIMEOUT_MS = "25000";
    process.env.ALEP_PROP_YEARS = String(new Date().getUTCFullYear());
    process.env.ALEP_ATTENDANCE_YEARS = process.env.ALEP_PROP_YEARS;
    process.env.ALEP_VOTE_YEARS = process.env.ALEP_PROP_YEARS;
    process.env.ALEP_VOTE_SESSION_LIMIT = "3";
    process.env.ESTADUAL_VOTE_LIMIT = "40";
    process.env.ESTADUAL_ATTENDANCE_LIMIT = "40";
    process.env.ESTADUAL_MATTER_LIMIT = "20";
    delete process.env.ALEP_REQUIRE_LIVE;
    await resetDatabase();
    const listed = await syncStateAssembly("alep");
    expect(listed.parliamentarians).toBeGreaterThanOrEqual(10);
  }, 120_000);

  it("persiste deputados do Paraná", async () => {
    const count = await prisma.stateDeputy.count({ where: { source: "alep" } });
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it("enriquece perfil com proposições e presença (votos se ZIP disponível)", async () => {
    const deputy = await prisma.stateDeputy.findFirst({
      where: { source: "alep" },
      orderBy: { nome: "asc" },
    });
    expect(deputy).toBeTruthy();

    const result = await syncStateDeputyProfile("alep", deputy!.externalId);
    expect(result.propositions + result.attendance + result.votes).toBeGreaterThan(0);

    const res = await getParlamentar(new NextRequest("http://localhost"), {
      params: Promise.resolve({
        source: "alep",
        id: deputy!.externalId,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("alep");
    expect(body.coverage.propositions).toBe(true);
    expect(body.coverage.attendance).toBe(true);
    expect(body.coverage.votes).toBe(true);
    expect(Array.isArray(body.propositions)).toBe(true);
    expect(Array.isArray(body.attendance)).toBe(true);
    expect(Array.isArray(body.votes)).toBe(true);
  }, 180_000);
});
