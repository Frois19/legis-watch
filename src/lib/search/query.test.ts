import { describe, expect, it } from "vitest";
import {
  buildSearchQuery,
  parseSearchQuery,
  searchQueryHasFilters,
} from "./query";

describe("search query deep-link", () => {
  it("parseia querystring com aliases", () => {
    const params = new URLSearchParams(
      "esfera=estadual_deputado&uf=PR&partido=pt&nome=Ademar",
    );
    expect(parseSearchQuery(params)).toEqual({
      esfera: "estadual_deputado",
      nome: "Ademar",
      siglaUf: "PR",
      siglaPartido: "PT",
      legislaturaId: "",
    });
  });

  it("serializa omitindo vazios e mantém esfera federal explícita", () => {
    const qs = buildSearchQuery({
      esfera: "federal_deputado",
      nome: "Janones",
      siglaUf: "",
      siglaPartido: "",
      legislaturaId: 56,
    });
    expect(qs.get("esfera")).toBe("federal_deputado");
    expect(qs.get("nome")).toBe("Janones");
    expect(qs.get("legislaturaId")).toBe("56");
  });

  it("detecta filtros ativos", () => {
    expect(
      searchQueryHasFilters({
        esfera: "federal_deputado",
        nome: "",
        siglaUf: "",
        siglaPartido: "",
        legislaturaId: "",
      }),
    ).toBe(false);
    expect(
      searchQueryHasFilters({
        esfera: "senador",
        nome: "",
        siglaUf: "AC",
        siglaPartido: "",
        legislaturaId: "",
      }),
    ).toBe(true);
  });
});
