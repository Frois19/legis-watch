import { describe, expect, it } from "vitest";
import { slugifyExternalId } from "./slug";

describe("slugifyExternalId", () => {
  it("remove acentos e normaliza", () => {
    expect(slugifyExternalId("Delegado Gleide Ângelo")).toBe(
      "delegado-gleide-angelo",
    );
  });

  it("trunca ids longos", () => {
    const long = "a".repeat(120);
    expect(slugifyExternalId(long).length).toBe(80);
  });
});
