import { describe, expect, it } from "vitest";
import {
  categorizeVoteType,
  countVoteTypes,
  VOTE_TYPE_FILTERS,
} from "./vote-type";

describe("categorizeVoteType", () => {
  it("reconhece sim, não e abstenção", () => {
    expect(categorizeVoteType("Sim")).toBe("sim");
    expect(categorizeVoteType("Não")).toBe("nao");
    expect(categorizeVoteType("Nao")).toBe("nao");
    expect(categorizeVoteType("Abstenção")).toBe("abstencao");
  });

  it("agrupa demais em outros", () => {
    expect(categorizeVoteType("Obstrução")).toBe("outros");
    expect(categorizeVoteType("Artigo 17")).toBe("outros");
  });
});

describe("countVoteTypes", () => {
  it("conta por categoria", () => {
    expect(
      countVoteTypes([
        { tipoVoto: "Sim" },
        { tipoVoto: "Sim" },
        { tipoVoto: "Não" },
        { tipoVoto: "Abstenção" },
        { tipoVoto: "Obstrução" },
      ]),
    ).toEqual({ sim: 2, nao: 1, abstencao: 1, outros: 1 });
  });
});

describe("VOTE_TYPE_FILTERS", () => {
  it("inclui todos e as categorias principais", () => {
    expect(VOTE_TYPE_FILTERS.map((f) => f.id)).toEqual([
      "todos",
      "sim",
      "nao",
      "abstencao",
      "outros",
    ]);
  });
});
