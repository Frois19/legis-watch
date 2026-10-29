import { beforeEach, describe, expect, it, vi } from "vitest";
import { almgAdapter } from "./almg";

describe("ALMG adapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ALMG_REQUIRE_LIVE;
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

  it("extrai filiações e mandatos do detalhe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
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
        }),
      ),
    );

    const detail = await almgAdapter.getParliamentarian!("12193");
    expect(detail?.email).toBe("dep.adalclever.lopes@almg.gov.br");

    const bundle = await almgAdapter.fetchProfileBundle!("12193");
    expect(bundle.affiliations[0]).toMatchObject({
      siglaPartido: "PV",
      dataDesfiliacao: null,
    });
    expect(bundle.mandates[0]?.legislaturaInicio).toBe(20);
    expect(bundle.propositions).toEqual([]);
    expect(almgAdapter.info.coverage.propositions).toBe(false);
  });
});
