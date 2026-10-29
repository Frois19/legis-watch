import { currentLegislatura } from "@/lib/camara/client";

export type LegislatureRange = {
  id: number;
  dataInicio: string;
  dataFim: string;
};

/** Anos civis cobertos pelo mandato (inclui o ano de início e o de fim). */
export function yearsForLegislature(range: LegislatureRange): number[] {
  const start = Number(range.dataInicio.slice(0, 4));
  const end = Number(range.dataFim.slice(0, 4));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }
  const years: number[] = [];
  for (let year = start; year <= end; year += 1) years.push(year);
  return years;
}

export function defaultLegislaturaId(): number {
  return currentLegislatura();
}

export function formatLegislaturaLabel(range: LegislatureRange): string {
  const start = range.dataInicio.slice(0, 4);
  const end = range.dataFim.slice(0, 4);
  return `${range.id}ª (${start}–${end})`;
}
