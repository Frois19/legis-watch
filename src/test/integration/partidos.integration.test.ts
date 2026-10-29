import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/partidos/[id]/membros/route";
import { resetDatabase, seedCoreFixtures } from "./db";

describe("integration GET /api/partidos/[id]/membros", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedCoreFixtures();
  });

  it("lista membros do partido na legislatura", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost/api/partidos/37906/membros?legislaturaId=57",
      ),
      { params: Promise.resolve({ id: "37906" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.party.sigla).toBe("PL");
    expect(body.members.some((m: { id: number }) => m.id === 209787)).toBe(
      true,
    );
  });

  it("retorna 404 para partido inexistente", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/partidos/1/membros"),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(404);
  });
});
