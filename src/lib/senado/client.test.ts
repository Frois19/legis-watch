import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchSenatorProfileBundle,
  listSenadoresAtual,
  mapAffiliations,
  mapMandates,
  mapMatters,
} from "./client";

describe("listSenadoresAtual", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SENADO_REQUIRE_LIVE;
  });

  it("mapeia lista live do Senado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ListaParlamentarEmExercicio: {
            Parlamentares: {
              Parlamentar: [
                {
                  IdentificacaoParlamentar: {
                    CodigoParlamentar: "5672",
                    NomeParlamentar: "Alan Rick",
                    NomeCompletoParlamentar: "Alan Rick Miranda",
                    SiglaPartidoParlamentar: "REPUBLICANOS",
                    UfParlamentar: "AC",
                    EmailParlamentar: "sen.alanrick@senado.leg.br",
                    UrlFotoParlamentar:
                      "http://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg",
                    UrlPaginaParlamentar:
                      "http://www25.senado.leg.br/web/senadores/senador/-/perfil/5672",
                  },
                  Mandato: { DescricaoParticipacao: "Titular" },
                },
              ],
            },
          },
        }),
      ),
    );

    const rows = await listSenadoresAtual();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      externalId: "5672",
      nome: "Alan Rick",
      siglaPartido: "REPUBLICANOS",
      siglaUf: "AC",
      urlFoto:
        "https://www.senado.leg.br/senadores/img/fotos-oficiais/senador5672.jpg",
      participacao: "Titular",
    });
  });

  it("cai no fixture quando a API falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );

    const rows = await listSenadoresAtual();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.externalId && r.nome)).toBe(true);
  });
});

describe("mappers de perfil", () => {
  it("mapAffiliations lê Partido aninhado", () => {
    const rows = mapAffiliations({
      FiliacaoParlamentar: {
        Parlamentar: {
          Filiacoes: {
            Filiacao: {
              Partido: {
                CodigoPartido: "521",
                SiglaPartido: "REPUBLICANOS",
                NomePartido: "Republicanos",
              },
              DataFiliacao: "2025-11-12",
            },
          },
        },
      },
    });
    expect(rows).toEqual([
      {
        codigoPartido: "521",
        siglaPartido: "REPUBLICANOS",
        nomePartido: "Republicanos",
        dataFiliacao: "2025-11-12",
        dataDesfiliacao: null,
      },
    ]);
  });

  it("mapMandates lê legislaturas do mandato", () => {
    const rows = mapMandates({
      MandatoParlamentar: {
        Parlamentar: {
          Mandatos: {
            Mandato: {
              CodigoMandato: "596",
              UfParlamentar: "AC",
              DescricaoParticipacao: "Titular",
              PrimeiraLegislaturaDoMandato: {
                NumeroLegislatura: 57,
                DataInicio: "2023-02-01",
                DataFim: "2027-01-31",
              },
              SegundaLegislaturaDoMandato: {
                NumeroLegislatura: 58,
                DataInicio: "2027-02-01",
                DataFim: "2031-01-31",
              },
            },
          },
        },
      },
    });
    expect(rows[0]).toMatchObject({
      codigoMandato: "596",
      siglaUf: "AC",
      legislaturaInicio: 57,
      legislaturaFim: 58,
      dataInicio: "2023-02-01",
      dataFim: "2031-01-31",
    });
  });

  it("mapMatters limita e monta URL pública", () => {
    const payload = {
      MateriasAutoriaParlamentar: {
        Parlamentar: {
          Autorias: {
            Autoria: [
              {
                IndicadorAutorPrincipal: "Sim",
                Materia: {
                  Codigo: "1",
                  Sigla: "PLS",
                  Numero: 10,
                  Ano: 2024,
                  Ementa: "Teste",
                  Data: "2024-01-01",
                  DescricaoIdentificacao: "PLS 10/2024",
                },
              },
              {
                IndicadorAutorPrincipal: "Não",
                Materia: {
                  Codigo: "2",
                  Sigla: "PEC",
                  Numero: 1,
                  Ano: 2023,
                },
              },
            ],
          },
        },
      },
    };
    const rows = mapMatters(payload, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      externalId: "1",
      autorPrincipal: true,
      urlPublica:
        "https://www25.senado.leg.br/web/atividade/materias/-/materia/1",
    });
  });
});

describe("fetchSenatorProfileBundle", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SENADO_REQUIRE_LIVE;
  });

  it("agrega filiações, mandatos e autorias live", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/filiacoes")) {
          return Response.json({
            FiliacaoParlamentar: {
              Parlamentar: {
                Filiacoes: {
                  Filiacao: {
                    Partido: { SiglaPartido: "REPUBLICANOS" },
                    DataFiliacao: "2025-11-12",
                  },
                },
              },
            },
          });
        }
        if (url.includes("/mandatos")) {
          return Response.json({
            MandatoParlamentar: {
              Parlamentar: {
                Mandatos: {
                  Mandato: {
                    CodigoMandato: "596",
                    UfParlamentar: "AC",
                    DescricaoParticipacao: "Titular",
                    PrimeiraLegislaturaDoMandato: {
                      NumeroLegislatura: 57,
                      DataInicio: "2023-02-01",
                    },
                  },
                },
              },
            },
          });
        }
        if (url.includes("/autorias")) {
          return Response.json({
            MateriasAutoriaParlamentar: {
              Parlamentar: {
                Autorias: {
                  Autoria: {
                    IndicadorAutorPrincipal: "Não",
                    Materia: {
                      Codigo: "155808",
                      Sigla: "RQS",
                      Numero: 41,
                      Ano: 2023,
                      DescricaoIdentificacao: "RQS 41/2023",
                    },
                  },
                },
              },
            },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const bundle = await fetchSenatorProfileBundle("5672");
    expect(bundle.affiliations[0]?.siglaPartido).toBe("REPUBLICANOS");
    expect(bundle.mandates[0]?.codigoMandato).toBe("596");
    expect(bundle.matters[0]?.externalId).toBe("155808");
  });

  it("cai no fixture de perfil quando a API falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const bundle = await fetchSenatorProfileBundle("5672");
    expect(bundle.affiliations.length).toBeGreaterThan(0);
    expect(bundle.mandates.length).toBeGreaterThan(0);
    expect(bundle.matters.length).toBeGreaterThan(0);
  });
});
