import { beforeEach, describe, expect, it, vi } from "vitest";
import { alespAdapter, parseDeputadosXml } from "./alesp";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Deputados>
  <Deputado>
    <IdDeputado>1139</IdDeputado>
    <IdSPL>1000000335</IdSPL>
    <Situacao>EXE</Situacao>
    <Email>dep@al.sp.gov.br</Email>
    <NomeParlamentar>Agente Federal Danilo Balas</NomeParlamentar>
    <Partido>PL</Partido>
  </Deputado>
  <Deputado>
    <IdDeputado>42</IdDeputado>
    <Situacao>LIC</Situacao>
    <NomeParlamentar>Exemplo Licenciado</NomeParlamentar>
    <Partido>PT</Partido>
  </Deputado>
</Deputados>`;

describe("ALESP adapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ALESP_REQUIRE_LIVE;
  });

  it("parseDeputadosXml mapeia cadastro", () => {
    const rows = parseDeputadosXml(SAMPLE_XML);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      externalId: "1139",
      nome: "Agente Federal Danilo Balas",
      siglaPartido: "PL",
      email: "dep@al.sp.gov.br",
      situacao: "Exercício",
    });
    expect(rows[1]?.situacao).toBe("Licenciado");
  });

  it("lista parlamentares via XML live", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(SAMPLE_XML, { status: 200 })),
    );
    const rows = await alespAdapter.listParliamentarians();
    expect(rows[0]?.externalId).toBe("1139");
    expect(alespAdapter.info.coverage.search).toBe(true);
  });

  it("cai no fixture quando a API falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );
    const rows = await alespAdapter.listParliamentarians();
    expect(rows.length).toBeGreaterThan(0);
  });
});
