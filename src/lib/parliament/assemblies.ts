import { listStateAdapters } from "./adapters";
import type { AssemblyInfo } from "./types";
import { ASSEMBLY_CATALOG, BRAZIL_UFS } from "./ufs";

/** Casas estaduais com adapter registrado (live ou fixture). */
export const STATE_ASSEMBLIES: AssemblyInfo[] = listStateAdapters().map(
  (a) => a.info,
);

export function getAssembly(source: string): AssemblyInfo | undefined {
  return STATE_ASSEMBLIES.find((a) => a.source === source);
}

export function listSupportedStateUfs(): string[] {
  return [...new Set(STATE_ASSEMBLIES.map((a) => a.uf))].sort();
}

/** Todas as 27 UFs do Brasil devem estar cobertas pelo catálogo. */
export function assertFullUfCoverage(): {
  expected: number;
  actual: number;
  missing: string[];
} {
  const covered = new Set(listSupportedStateUfs());
  const missing = BRAZIL_UFS.filter((uf) => !covered.has(uf));
  return {
    expected: BRAZIL_UFS.length,
    actual: covered.size,
    missing: [...missing],
  };
}

export { ASSEMBLY_CATALOG, BRAZIL_UFS };
