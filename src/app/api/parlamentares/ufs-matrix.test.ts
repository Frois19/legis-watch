import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BRAZIL_UFS } from "@/lib/parliament/ufs";
import { getCatalogEntryByUf } from "@/lib/parliament/ufs";
import { slugifyExternalId } from "@/lib/parliament/slug";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    deputyMandate: { findMany: vi.fn() },
    deputy: { findMany: vi.fn() },
    stateDeputy: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { searchCache } from "@/lib/cache/memory-cache";
import { GET as listParlamentares } from "./route";
import { GET as getParlamentar } from "./[source]/[id]/route";

function seedStateDeputies() {
  const rows = BRAZIL_UFS.flatMap((uf) => {
    const entry = getCatalogEntryByUf(uf)!;
    return [1, 2].map((n) => {
      const nome = `Deputado Teste ${uf} ${n}`;
      const externalId = slugifyExternalId(nome);
      return {
        id: `${entry.source}:${externalId}`,
        source: entry.source,
        externalId,
        uf,
        nome,
        nomeEleitoral: nome,
        siglaPartido: n === 1 ? "PT" : "PL",
        urlFoto: null,
        email: `teste.${uf.toLowerCase()}.${n}@fixture.legis.watch`,
        situacao: "Exercício",
        syncedAt: new Date(),
      };
    });
  });

  prisma.stateDeputy.findMany.mockImplementation(async (args?: {
    where?: {
      AND?: Array<{
        uf?: string;
        siglaPartido?: string;
        OR?: unknown;
      }>;
    };
  }) => {
    let filtered = rows;
    const and = args?.where?.AND ?? [];
    for (const clause of and) {
      if (clause.uf) filtered = filtered.filter((r) => r.uf === clause.uf);
      if (clause.siglaPartido) {
        filtered = filtered.filter((r) => r.siglaPartido === clause.siglaPartido);
      }
    }
    return filtered;
  });

  prisma.stateDeputy.findUnique.mockImplementation(async (args: {
    where: { id: string };
  }) => rows.find((r) => r.id === args.where.id) ?? null);

  return rows;
}

describe("matriz estadual — busca e perfil por UF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchCache.clear();
    prisma.deputy.findMany.mockResolvedValue([]);
    prisma.deputyMandate.findMany.mockResolvedValue([]);
    seedStateDeputies();
  });

  it.each([...BRAZIL_UFS])(
    "lista deputados estaduais de %s",
    async (uf) => {
      const res = await listParlamentares(
        new NextRequest(
          `http://localhost/api/parlamentares?esfera=estadual_deputado&siglaUf=${uf}`,
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.total).toBeGreaterThanOrEqual(2);
      expect(
        body.items.every(
          (i: { sphere: string; siglaUf: string }) =>
            i.sphere === "estadual_deputado" && i.siglaUf === uf,
        ),
      ).toBe(true);
    },
  );

  it.each([...BRAZIL_UFS])(
    "abre perfil namespaced de %s",
    async (uf) => {
      const entry = getCatalogEntryByUf(uf)!;
      const nome = `Deputado Teste ${uf} 1`;
      const externalId = slugifyExternalId(nome);
      const res = await getParlamentar(new Request("http://localhost"), {
        params: Promise.resolve({ source: entry.source, id: externalId }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        sphere: "estadual_deputado",
        source: entry.source,
        siglaUf: uf,
        nome,
      });
      expect(body.href).toBe(`/parlamentares/${entry.source}/${externalId}`);
    },
  );

  it("busca nacional estadual retorna ao menos 1 por UF", async () => {
    const res = await listParlamentares(
      new NextRequest(
        "http://localhost/api/parlamentares?esfera=estadual_deputado&pageSize=100",
      ),
    );
    const body = await res.json();
    const ufs = new Set(
      body.items.map((i: { siglaUf: string }) => i.siglaUf),
    );
    for (const uf of BRAZIL_UFS) {
      expect(ufs.has(uf)).toBe(true);
    }
  });
});
