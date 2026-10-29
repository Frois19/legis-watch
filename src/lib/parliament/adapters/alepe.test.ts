import { beforeEach, describe, expect, it, vi } from "vitest";
import { alepeAdapter } from "./alepe";

describe("alepeAdapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ALEPE_REQUIRE_LIVE;
  });

  it("expõe metadados da ALEPE", () => {
    expect(alepeAdapter.info).toMatchObject({
      source: "alepe",
      uf: "PE",
      sphere: "estadual_deputado",
      coverage: expect.objectContaining({ search: true, profile: true }),
    });
  });

  it("mapeia resposta da API ao modelo do adapter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json([
          {
            nomeParlamentar: "João Paulo",
            partido: "PT",
            email: "joao@alepe.pe.gov.br",
          },
        ]),
      ),
    );

    const rows = await alepeAdapter.listParliamentarians();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      externalId: "joao-paulo",
      nome: "João Paulo",
      siglaPartido: "PT",
      email: "joao@alepe.pe.gov.br",
    });
  });

  it("cai no fixture quando a API falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );

    const rows = await alepeAdapter.listParliamentarians();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.nome && r.externalId)).toBe(true);
  });
});
