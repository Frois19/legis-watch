import { beforeEach, describe, expect, it } from "vitest";
import { BRAZIL_UFS, getCatalogEntryByUf } from "../ufs";
import {
  createAllFixtureAdapters,
  createFixtureAdapter,
  resetFixtureCache,
} from "./fixture-assembly";

describe("fixture adapters por UF", () => {
  beforeEach(() => {
    resetFixtureCache();
  });

  it("cria adapter para cada UF do Brasil", async () => {
    const adapters = createAllFixtureAdapters();
    expect(adapters).toHaveLength(27);

    for (const uf of BRAZIL_UFS) {
      const entry = getCatalogEntryByUf(uf);
      expect(entry).toBeDefined();
      const adapter = createFixtureAdapter(entry!);
      const rows = await adapter.listParliamentarians();
      expect(rows.length).toBeGreaterThanOrEqual(2);
      for (const row of rows) {
        expect(row.nome.length).toBeGreaterThan(0);
        expect(row.externalId.length).toBeGreaterThan(0);
      }
    }
  });
});
