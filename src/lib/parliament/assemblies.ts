import type { AssemblyInfo } from "./types";
import { alepeAdapter } from "./adapters/alepe";

/** Casas estaduais com adapter registrado. */
export const STATE_ASSEMBLIES: AssemblyInfo[] = [alepeAdapter.info];

export function getAssembly(source: string): AssemblyInfo | undefined {
  return STATE_ASSEMBLIES.find((a) => a.source === source);
}

export function listSupportedStateUfs(): string[] {
  return [...new Set(STATE_ASSEMBLIES.map((a) => a.uf))].sort();
}
