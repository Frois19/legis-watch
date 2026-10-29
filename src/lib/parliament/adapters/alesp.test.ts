import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  alespAdapter,
  buildAlespPropositionIndex,
  clearAlespCaches,
  parseDeputadosXml,
  parseNaturezasXml,
} from "./alesp";

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
    clearAlespCaches();
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
    expect(alespAdapter.info.coverage.propositions).toBe(true);
  });

  it("indexa proposições por id/nome do autor", () => {
    const deputies = parseDeputadosXml(SAMPLE_XML);
    const naturezas = parseNaturezasXml(
      `<natureza><idNatureza>1</idNatureza><nmNatureza>Projeto de lei</nmNatureza><sgNatureza>PL</sgNatureza></natureza>`,
    );
    expect(naturezas["1"]).toBe("PL");
    const index = buildAlespPropositionIndex({
      deputies,
      naturezas,
      years: [2026],
      limit: 10,
      autoresXml: `
        <documentos_autores>
          <DocumentoAutor><IdAutor>999</IdAutor><IdDocumento>55</IdDocumento><NomeAutor>Agente Federal Danilo Balas</NomeAutor></DocumentoAutor>
          <DocumentoAutor><IdAutor>42</IdAutor><IdDocumento>66</IdDocumento><NomeAutor>Outro</NomeAutor></DocumentoAutor>
        </documentos_autores>`,
      propositurasXml: `
        <proposituras>
          <propositura>
            <AnoLegislativo>2026</AnoLegislativo>
            <Ementa>Teste A</Ementa>
            <DtEntradaSistema>2026-02-01T00:00:00-03:00</DtEntradaSistema>
            <IdDocumento>55</IdDocumento>
            <IdNatureza>1</IdNatureza>
            <NroLegislativo>10</NroLegislativo>
          </propositura>
          <propositura>
            <AnoLegislativo>2026</AnoLegislativo>
            <Ementa>Teste B</Ementa>
            <IdDocumento>66</IdDocumento>
            <IdNatureza>1</IdNatureza>
            <NroLegislativo>11</NroLegislativo>
          </propositura>
        </proposituras>`,
    });
    expect(index.byDeputy["1139"]?.[0]).toMatchObject({
      externalId: "55",
      siglaTipo: "PL",
      numero: 10,
      ano: 2026,
    });
    expect(index.byDeputy["42"]?.[0]?.externalId).toBe("66");
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
