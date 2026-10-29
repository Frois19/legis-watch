import { describe, expect, it } from "vitest";
import { assertFullUfCoverage } from "./assemblies";
import { listStateAdapterSources, listStateAdapters } from "./adapters";
import { ASSEMBLY_CATALOG, BRAZIL_UFS } from "./ufs";

describe("cobertura nacional de UFs estaduais", () => {
  it("catálogo tem as 27 UFs sem duplicata", () => {
    expect(BRAZIL_UFS).toHaveLength(27);
    expect(ASSEMBLY_CATALOG).toHaveLength(27);
    expect(new Set(ASSEMBLY_CATALOG.map((a) => a.uf)).size).toBe(27);
    expect(new Set(ASSEMBLY_CATALOG.map((a) => a.source)).size).toBe(27);
  });

  it("todo adapter registrado cobre exatamente as 27 UFs", () => {
    const coverage = assertFullUfCoverage();
    expect(coverage.missing).toEqual([]);
    expect(coverage.actual).toBe(27);
    expect(listStateAdapters()).toHaveLength(27);
    expect(listStateAdapterSources()).toHaveLength(27);
  });

  it("PE usa adapter live alepe", () => {
    const pe = listStateAdapters().find((a) => a.info.uf === "PE");
    expect(pe?.info.source).toBe("alepe");
  });

  it("MG e SP usam adapters live", () => {
    const mg = listStateAdapters().find((a) => a.info.uf === "MG");
    const sp = listStateAdapters().find((a) => a.info.uf === "SP");
    expect(mg?.info.source).toBe("almg");
    expect(mg?.info.coverage.propositions).toBe(true);
    expect(sp?.info.source).toBe("alesp");
  });
});
