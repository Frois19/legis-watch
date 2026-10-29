import { describe, expect, it } from "vitest";
import { parliamentarianId, parseParliamentarianId } from "./types";

describe("parliamentarianId", () => {
  it("compõe id namespaced", () => {
    expect(parliamentarianId("alepe", "joao-paulo")).toBe("alepe:joao-paulo");
  });
});

describe("parseParliamentarianId", () => {
  it("separa source e externalId", () => {
    expect(parseParliamentarianId("alepe:joao-paulo")).toEqual({
      source: "alepe",
      externalId: "joao-paulo",
    });
  });

  it("rejeita ids inválidos", () => {
    expect(parseParliamentarianId("sem-namespace")).toBeNull();
    expect(parseParliamentarianId(":x")).toBeNull();
    expect(parseParliamentarianId("x:")).toBeNull();
  });
});
