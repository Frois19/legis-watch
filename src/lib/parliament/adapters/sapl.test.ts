import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSaplAdapter } from "./sapl";

describe("SAPL adapter", () => {
  const adapter = createSaplAdapter({
    source: "aleac",
    uf: "AC",
    name: "Assembleia Legislativa do Acre",
    baseUrl: "https://sapl.al.ac.leg.br",
  });

  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SAPL_REQUIRE_LIVE;
  });

  it("lista parlamentares ativos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/parlamentares/parlamentar/")) {
          return Response.json({
            pagination: { next_page: null, total_entries: 1 },
            results: [
              {
                id: 248,
                nome_parlamentar: "ADAILTON CRUZ",
                nome_completo: "José Adailton Cruz Pereira",
                ativo: true,
                email: "dep@al.ac.leg.br",
                fotografia:
                  "http://sapl.al.ac.leg.br/media/sapl/public/parlamentar/248/foto.jpg",
              },
            ],
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const rows = await adapter.listParliamentarians();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      externalId: "248",
      nome: "ADAILTON CRUZ",
      urlFoto:
        "https://sapl.al.ac.leg.br/media/sapl/public/parlamentar/248/foto.jpg",
    });
    expect(adapter.info.coverage.propositions).toBe(true);
  });

  it("monta perfil com filiação, mandato e matéria", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/base/autor/")) {
          return Response.json({
            pagination: { next_page: null },
            results: [{ id: 146, nome: "ADAILTON CRUZ" }],
          });
        }
        if (url.includes("/parlamentares/filiacao/")) {
          return Response.json({
            pagination: { next_page: null },
            results: [
              {
                data: "2022-04-01",
                data_desfiliacao: null,
                partido: 57,
                parlamentar: 248,
              },
            ],
          });
        }
        if (url.includes("/parlamentares/partido/57")) {
          return Response.json({
            id: 57,
            sigla: "UNIÃO",
            nome: "União Brasil",
          });
        }
        if (url.includes("/parlamentares/mandato/")) {
          return Response.json({
            pagination: { next_page: null },
            results: [
              {
                id: 426,
                data_inicio_mandato: "2023-02-01",
                data_fim_mandato: "2027-01-31",
                titular: true,
                legislatura: 17,
              },
            ],
          });
        }
        if (url.includes("/materia/autoria/")) {
          return Response.json({
            pagination: { next_page: null },
            results: [{ materia: 13914, primeiro_autor: true, autor: 146 }],
          });
        }
        if (url.includes("/materia/materialegislativa/13914")) {
          return Response.json({
            id: 13914,
            numero: 144,
            ano: 2023,
            ementa: "Indicação teste",
            data_apresentacao: "2023-05-30",
            tipo: 8,
            em_tramitacao: true,
            __str__: "Indicação nº 144 de 2023",
          });
        }
        if (url.includes("/materia/tipomaterialegislativa/8")) {
          return Response.json({ id: 8, sigla: "IND", descricao: "Indicação" });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const bundle = await adapter.fetchProfileBundle!("248");
    expect(bundle.affiliations[0]?.siglaPartido).toBe("UNIÃO");
    expect(bundle.mandates[0]?.codigoMandato).toBe("426");
    expect(bundle.propositions[0]).toMatchObject({
      externalId: "13914",
      siglaTipo: "IND",
      numero: 144,
      ano: 2023,
    });
  });
});
