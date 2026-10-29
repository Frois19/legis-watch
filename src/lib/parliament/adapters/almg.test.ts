import { beforeEach, describe, expect, it, vi } from "vitest";
import { almgAdapter, clearAlmgPropositionCache } from "./almg";

describe("ALMG adapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearAlmgPropositionCache();
    delete process.env.ALMG_REQUIRE_LIVE;
    delete process.env.ALMG_PROP_YEARS;
  });

  it("lista deputados em exercício", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          list: [{ id: 12193, nome: "Adalclever Lopes", partido: "PV" }],
        }),
      ),
    );
    const rows = await almgAdapter.listParliamentarians();
    expect(rows[0]).toMatchObject({
      externalId: "12193",
      nome: "Adalclever Lopes",
      siglaPartido: "PV",
    });
  });

  it("extrai filiações, mandatos e proposições do CSV anual", async () => {
    process.env.ALMG_PROP_YEARS = "2026";
    const csv = `Codigo,TipoProposicao,SiglaTipoProposicao,Numero,Ano,Ementa,Indexacao,Situacao,DataPublicacao,DataAtualizacao,DataUltimaAcao,Regime,Resumo,Origem,Local,NomeFaseAtual,Legislatura,Autores,LinkTextos
"PL 10/2026","Projeto de Lei","PL","10","2026","Ementa teste","","Tramitando","01/03/2026","","","","","","","",20,"[{""id"":12193,""nome"":""Adalclever Lopes"",""partido"":""PV""}]","https://example.com/pl"
`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/arquivo/proposicoes/download")) {
          return new Response(csv, { status: 200 });
        }
        return Response.json({
          deputado: {
            id: 12193,
            nome: "Adalclever Lopes",
            partido: "PV",
            situacao: "Em exercício",
            emails: [{ endereco: "dep.adalclever.lopes" }],
            filiacoes: [
              {
                dataInicio: { $: "2026-03-19" },
                dataTermino: { $: "2999-12-31" },
                partido: { id: 43, sigla: "PV" },
              },
            ],
            legislaturas: [
              {
                numeroLegislatura: 20,
                inicioLegislatura: { $: "2023-02-01" },
                terminoLegislatura: { $: "2027-01-31" },
                tipoMandato: "Efetivo",
              },
            ],
          },
        });
      }),
    );

    const detail = await almgAdapter.getParliamentarian!("12193");
    expect(detail?.email).toBe("dep.adalclever.lopes@almg.gov.br");

    const bundle = await almgAdapter.fetchProfileBundle!("12193");
    expect(bundle.affiliations[0]).toMatchObject({
      siglaPartido: "PV",
      dataDesfiliacao: null,
    });
    expect(bundle.mandates[0]?.legislaturaInicio).toBe(20);
    expect(bundle.propositions[0]).toMatchObject({
      externalId: "PL 10/2026",
      siglaTipo: "PL",
      numero: 10,
      ano: 2026,
      dataApresentacao: "2026-03-01",
    });
    expect(almgAdapter.info.coverage.propositions).toBe(true);
  });
});
