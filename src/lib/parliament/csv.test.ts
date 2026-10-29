import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("lê campos quotados com vírgula e aspas escapadas", () => {
    const text = `Codigo,Ementa,Autores
"PL 1/2024","Texto, com vírgula","[{""id"":1}]"
PL 2/2024,Simples,[]
`;
    const rows = parseCsv(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      Codigo: "PL 1/2024",
      Ementa: "Texto, com vírgula",
      Autores: '[{"id":1}]',
    });
    expect(rows[1]?.Codigo).toBe("PL 2/2024");
  });

  it("suporta quebra de linha dentro de campo quotado", () => {
    const text = `A,B\n"1","linha1\nlinha2"\n`;
    const rows = parseCsv(text);
    expect(rows[0]?.B).toBe("linha1\nlinha2");
  });
});
