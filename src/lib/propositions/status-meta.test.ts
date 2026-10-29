import { describe, expect, it } from "vitest";
import {
  categorizePropositionStatus,
  categoriesPresentIn,
  explainPropositionStatus,
  getStatusCategoryMeta,
} from "./status-meta";

describe("categorizePropositionStatus", () => {
  it("classifica status comuns", () => {
    expect(categorizePropositionStatus(null)).toBe("sem_status");
    expect(
      categorizePropositionStatus("Transformado em Norma Jurídica"),
    ).toBe("aprovado");
    expect(categorizePropositionStatus("Arquivada")).toBe("arquivado");
    expect(categorizePropositionStatus("Devolvida ao(à) Autor(a)")).toBe(
      "devolvido",
    );
    expect(
      categorizePropositionStatus("Aguardando Apreciação pelo Senado Federal"),
    ).toBe("no_senado");
    expect(categorizePropositionStatus("Pronta para Pauta")).toBe(
      "pronta_para_pauta",
    );
    expect(categorizePropositionStatus("Aguardando Parecer")).toBe(
      "aguardando",
    );
    expect(categorizePropositionStatus("Tramitando em Conjunto")).toBe(
      "em_tramitacao",
    );
    expect(categorizePropositionStatus("Tramitação Finalizada")).toBe(
      "finalizado",
    );
  });
});

describe("explainPropositionStatus", () => {
  it("retorna texto de ajuda da categoria", () => {
    const text = explainPropositionStatus("Arquivada");
    expect(text.toLowerCase()).toContain("arquiv");
  });
});

describe("categoriesPresentIn", () => {
  it("sempre inclui Todos e só categorias presentes", () => {
    const cats = categoriesPresentIn(["Arquivada", "Aguardando Parecer"]);
    expect(cats[0]?.id).toBe("todos");
    expect(cats.some((c) => c.id === "arquivado")).toBe(true);
    expect(cats.some((c) => c.id === "aguardando")).toBe(true);
    expect(cats.some((c) => c.id === "aprovado")).toBe(false);
  });
});

describe("getStatusCategoryMeta", () => {
  it("explica o filtro Todos", () => {
    expect(getStatusCategoryMeta("todos").description.length).toBeGreaterThan(
      20,
    );
  });
});
