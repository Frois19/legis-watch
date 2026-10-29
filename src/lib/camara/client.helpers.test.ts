import { afterEach, describe, expect, it, vi } from "vitest";
import { currentLegislatura, partyIdFromUri } from "./client";

describe("partyIdFromUri", () => {
  it("extrai id do partido da uri", () => {
    expect(
      partyIdFromUri("https://dadosabertos.camara.leg.br/api/v2/partidos/36898"),
    ).toBe(36898);
  });

  it("retorna null sem uri válida", () => {
    expect(partyIdFromUri(null)).toBeNull();
    expect(partyIdFromUri(undefined)).toBeNull();
    expect(partyIdFromUri("https://exemplo.com/outro")).toBeNull();
  });
});

describe("currentLegislatura", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa LEGISLATURA_ATUAL ou 57", () => {
    vi.stubEnv("LEGISLATURA_ATUAL", "56");
    expect(currentLegislatura()).toBe(56);
    vi.stubEnv("LEGISLATURA_ATUAL", "");
    expect(currentLegislatura()).toBe(57);
  });
});
