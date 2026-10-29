import type { StateAssemblyAdapter } from "../types";
import { alepeAdapter } from "./alepe";
import { createAllFixtureAdapters } from "./fixture-assembly";

/**
 * Adapters registrados.
 * PE usa o adapter live ALEPE (com fallback de fixture próprio).
 * Demais UFs usam fixture até haver API madura.
 */
const fixtureAdapters = createAllFixtureAdapters().filter(
  (a) => a.info.source !== "alepe",
);

const adapters: Record<string, StateAssemblyAdapter> = {
  alepe: alepeAdapter,
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

export { alepeAdapter };
