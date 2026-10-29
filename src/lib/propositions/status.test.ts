import { describe, expect, it } from "vitest";
import { isApprovedPropositionStatus } from "./status";

describe("isApprovedPropositionStatus", () => {
  it("retorna false para vazio/nulo", () => {
    expect(isApprovedPropositionStatus(null)).toBe(false);
    expect(isApprovedPropositionStatus(undefined)).toBe(false);
    expect(isApprovedPropositionStatus("")).toBe(false);
  });

  it("reconhece transformado em norma / norma jurídica", () => {
    expect(isApprovedPropositionStatus("Transformado em Norma Jurídica")).toBe(
      true,
    );
    expect(isApprovedPropositionStatus("Norma Juridica")).toBe(true);
  });

  it("reconhece sancionado, aprovado e promulgado com acentos", () => {
    expect(isApprovedPropositionStatus("Sancionada")).toBe(true);
    expect(isApprovedPropositionStatus("Aprovado pelo Plenário")).toBe(true);
    expect(isApprovedPropositionStatus("Promulgada")).toBe(true);
  });

  it("rejeita arquivadas e rejeitadas mesmo com palavra aprovado", () => {
    expect(isApprovedPropositionStatus("Arquivada")).toBe(false);
    expect(isApprovedPropositionStatus("Rejeitada")).toBe(false);
    expect(
      isApprovedPropositionStatus("Aprovado e depois Arquivada"),
    ).toBe(false);
  });

  it("retorna false para tramitação comum", () => {
    expect(isApprovedPropositionStatus("Aguardando Parecer")).toBe(false);
    expect(isApprovedPropositionStatus("Pronta para Pauta")).toBe(false);
  });

  it("normaliza acentos antes de comparar", () => {
    expect(isApprovedPropositionStatus("APROVADO")).toBe(true);
    expect(isApprovedPropositionStatus("Norma Jurídica")).toBe(true);
  });
});

