import { describe, expect, it } from "vitest";
import { camaraBandepUrl, resolveDeputyPhotoUrl } from "./photo";

describe("camaraBandepUrl", () => {
  it("monta URL estável por id", () => {
    expect(camaraBandepUrl(204515)).toBe(
      "https://www.camara.leg.br/internet/deputado/bandep/204515.jpg",
    );
  });
});

describe("resolveDeputyPhotoUrl", () => {
  it("prioriza urlFoto não vazia", () => {
    expect(resolveDeputyPhotoUrl(1, " https://cdn/foto.jpg ")).toBe(
      "https://cdn/foto.jpg",
    );
  });

  it("faz fallback para bandep quando url ausente/em branco", () => {
    expect(resolveDeputyPhotoUrl(99, null)).toBe(camaraBandepUrl(99));
    expect(resolveDeputyPhotoUrl(99, "   ")).toBe(camaraBandepUrl(99));
    expect(resolveDeputyPhotoUrl(99, undefined)).toBe(camaraBandepUrl(99));
  });
});
