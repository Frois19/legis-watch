import type { StateAssemblyAdapter } from "../types";
import { alepeAdapter } from "./alepe";

const adapters: Record<string, StateAssemblyAdapter> = {
  alepe: alepeAdapter,
};

export function getStateAdapter(source: string): StateAssemblyAdapter | null {
  return adapters[source] ?? null;
}

export function listStateAdapters(): StateAssemblyAdapter[] {
  return Object.values(adapters);
}

export { alepeAdapter };
