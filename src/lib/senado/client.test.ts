import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSenadoresAtual } from "./client";

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
