import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  alepAdapter,
  authorMatchesDeputy,
  clearAlepCaches,
  mapAlepProposition,
} from "./alep";
import { clearHttpCache } from "@/lib/cache/http-cache";

describe("ALEP adapter", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearAlepCaches();
    clearHttpCache("alep:");
    delete process.env.ALEP_REQUIRE_LIVE;
  });

  it("authorMatchesDeputy reconhece autor parlamentar vs nome civil", () => {
    expect(
      authorMatchesDeputy(
        "DEPUTADO ADEMAR TRAIANO",
        "ADEMAR LUIZ TRAIANO",
      ),
    ).toBe(true);
    expect(
      authorMatchesDeputy(
        "DEPUTADA ANA JÚLIA, DEPUTADO ADEMAR TRAIANO",
        "ADEMAR LUIZ TRAIANO",
      ),
    ).toBe(true);
    expect(
      authorMatchesDeputy("DEPUTADO TIAGO AMARAL", "ADEMAR LUIZ TRAIANO"),
    ).toBe(false);
  });

  it("mapAlepProposition normaliza tipo e datas", () => {
    const mapped = mapAlepProposition(
      {
        codigo: 117734,
        numero: 810,
        ano: 2024,
        autor: "DEPUTADO X",
        tipoProposicao: "REQUERIMENTO",
        ementa: "Teste",
        status: "ARQUIVADA",
        dataRecebimento: "2024-04-08T13:46:26.000+0000",
      },
      "7000394",
    );
    expect(mapped).toMatchObject({
      externalId: "117734",
      siglaTipo: "REQ",
      numero: 810,
      ano: 2024,
      dataApresentacao: "2024-04-08",
      authorExternalId: "7000394",
    });
  });

  it("lista parlamentares via remuneração", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/remuneracao")) {
        return new Response(
          JSON.stringify({
            remuneracoes: [
              {
                id: 1,
                matricula: "7000394",
                nome: "ADEMAR LUIZ TRAIANO",
                data_exoneracao: null,
              },
              {
                id: 2,
                matricula: "7000999",
                nome: "EXONERADO",
                data_exoneracao: "01/01/2024",
              },
            ],
            last_page: 1,
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const rows = await alepAdapter.listParliamentarians();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      externalId: "7000394",
      nome: "ADEMAR LUIZ TRAIANO",
    });
    expect(alepAdapter.info.coverage.propositions).toBe(true);
  });

  it("indexa proposições por autor com cache HTTP", async () => {
    process.env.ALEP_PROP_YEARS = "2024";
    let filtrarCalls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/remuneracao")) {
        return new Response(
          JSON.stringify({
            remuneracoes: [
              {
                matricula: "7000394",
                nome: "ADEMAR LUIZ TRAIANO",
                data_exoneracao: null,
              },
            ],
            last_page: 1,
          }),
          { status: 200 },
        );
      }
      if (String(url).includes("/proposicao/filtrar")) {
        filtrarCalls += 1;
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            sucesso: true,
            lista: [
              {
                codigo: 1,
                numero: 905,
                ano: 2024,
                autor: "DEPUTADO ADEMAR TRAIANO",
                tipoProposicao: "REQUERIMENTO",
                ementa: "Solo",
                status: "ARQUIVADA",
                dataRecebimento: "2024-01-02T00:00:00.000+0000",
              },
              {
                codigo: 2,
                numero: 10,
                ano: 2024,
                autor: "DEPUTADO OUTRO",
                tipoProposicao: "PROJETO DE LEI",
                ementa: "Outro",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await alepAdapter.listPropositions!("7000394");
    const second = await alepAdapter.listPropositions!("7000394");
    expect(first).toHaveLength(1);
    expect(first[0]?.externalId).toBe("1");
    expect(second).toHaveLength(1);
    expect(filtrarCalls).toBe(1);
    delete process.env.ALEP_PROP_YEARS;
  });
});
