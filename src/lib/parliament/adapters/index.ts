import type { StateAssemblyAdapter } from "../types";
import { alepAdapter } from "./alep";
import { alepeAdapter } from "./alepe";
import { alespAdapter } from "./alesp";
import { almgAdapter } from "./almg";
import { createAllFixtureAdapters } from "./fixture-assembly";
import { createAllSaplAdapters, SAPL_SOURCES } from "./sapl";

/**
 * Adapters registrados.
 * - PE: ALEPE live (cadastro)
 * - MG: ALMG live (cadastro + filiações/mandatos + proposições via CSV)
 * - SP: ALESP live (cadastro via XML)
 * - PR: ALEP live (cadastro via remuneração + proposições via webservice)
 * - AC/AL/AM/PB/PI/RO/TO: SAPL live (cadastro + filiações/mandatos/matérias)
 * - Demais UFs: fixture de cadastro
 */
const liveSources = new Set<string>([
  "alepe",
  "almg",
  "alesp",
  "alep",
  ...SAPL_SOURCES,
]);

const fixtureAdapters = createAllFixtureAdapters().filter(
  (a) => !liveSources.has(a.info.source),
);

const adapters: Record<string, StateAssemblyAdapter> = {
  alepe: alepeAdapter,
  almg: almgAdapter,
  alesp: alespAdapter,
  alep: alepAdapter,
  ...Object.fromEntries(createAllSaplAdapters().map((a) => [a.info.source, a])),
  ...Object.fromEntries(fixtureAdapters.map((a) => [a.info.source, a])),
};

export function getStateAdapter(source: string): StateAssemblyAdapter | null {
  return adapters[source] ?? null;
}

export function listStateAdapters(): StateAssemblyAdapter[] {
  return Object.values(adapters);
}

export function listStateAdapterSources(): string[] {
  return Object.keys(adapters).sort();
}

export { alepAdapter, alepeAdapter, alespAdapter, almgAdapter, SAPL_SOURCES };
export { SAPL_HOUSES } from "./sapl";
