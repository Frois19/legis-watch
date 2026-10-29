import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/camara/client", () => ({
  currentLegislatura: vi.fn(() => 57),
}));

import { currentLegislatura } from "@/lib/camara/client";
import {
  defaultLegislaturaId,
  formatLegislaturaLabel,
  yearsForLegislature,
} from "./legislatures";

describe("yearsForLegislature", () => {
  it("lista anos inclusivos do período", () => {
    expect(
      yearsForLegislature({
        id: 56,
        dataInicio: "2019-02-01",
        dataFim: "2023-01-31",
      }),
    ).toEqual([2019, 2020, 2021, 2022, 2023]);
  });

  it("retorna vazio quando datas são inválidas ou invertidas", () => {
    expect(
      yearsForLegislature({
        id: 1,
        dataInicio: "xxxx",
        dataFim: "2020-01-01",
      }),
    ).toEqual([]);
    expect(
      yearsForLegislature({
        id: 1,
        dataInicio: "2020-01-01",
        dataFim: "yyyy",
      }),
    ).toEqual([]);
    expect(
      yearsForLegislature({
        id: 1,
        dataInicio: "2023-01-01",
        dataFim: "2020-01-01",
      }),
    ).toEqual([]);
  });

  it("aceita período de um único ano", () => {
    expect(
      yearsForLegislature({
        id: 35,
        dataInicio: "1930-04-15",
        dataFim: "1930-11-11",
      }),
    ).toEqual([1930]);
  });
});


describe("formatLegislaturaLabel", () => {
  it("formata rótulo amigável", () => {
    expect(
      formatLegislaturaLabel({
        id: 57,
        dataInicio: "2023-02-01",
        dataFim: "2027-01-31",
      }),
    ).toBe("57ª (2023–2027)");
  });
});

describe("defaultLegislaturaId", () => {
  afterEach(() => {
    vi.mocked(currentLegislatura).mockReturnValue(57);
  });

  it("delega para currentLegislatura", () => {
    vi.mocked(currentLegislatura).mockReturnValue(56);
    expect(defaultLegislaturaId()).toBe(56);
  });
});
