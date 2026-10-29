import { beforeEach, describe, expect, it, vi } from "vitest";
import { alepeAdapter, parseAlepePropositionsXml } from "./alepe";

describe("alepeAdapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ALEPE_REQUIRE_LIVE;
    delete process.env.ALEPE_PROP_YEARS;
  });

  it("expõe metadados da ALEPE", () => {
    expect(alepeAdapter.info).toMatchObject({
      source: "alepe",
      uf: "PE",
      sphere: "estadual_deputado",
      coverage: expect.objectContaining({
        search: true,
        profile: true,
        propositions: true,
      }),
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

  it("filtra proposições XML pelo autor", () => {
    const xml = `
      <projetos>
        <projeto><numero>1</numero><ano>2024</ano><ementa>A</ementa><autor>João Paulo</autor></projeto>
        <projeto><numero>2</numero><ano>2024</ano><ementa>B</ementa><autor>Outra Pessoa</autor></projeto>
      </projetos>`;
    const rows = parseAlepePropositionsXml(xml, {
      siglaTipo: "PL",
      authorSlug: "joao-paulo",
      authorName: "João Paulo",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ numero: 1, ementa: "A", siglaTipo: "PL" });
  });

  it("usa fixture de proposições quando a API de matérias falha", async () => {
    process.env.ALEPE_PROP_YEARS = "2024";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/proposicoes/")) {
          throw new Error("timeout");
        }
        return Response.json([
          {
            nomeParlamentar: "João Paulo",
            partido: "PT",
            email: "joao@alepe.pe.gov.br",
          },
        ]);
      }),
    );
    const bundle = await alepeAdapter.fetchProfileBundle!("joao-paulo");
    expect(bundle.propositions.length).toBeGreaterThan(0);
    expect(bundle.propositions[0]?.siglaTipo).toBeTruthy();
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
