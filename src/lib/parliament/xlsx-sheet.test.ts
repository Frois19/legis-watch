import { describe, expect, it } from "vitest";
import {
  brDateTimeToIsoDate,
  extractNominalVotes,
  parseXlsxSheetRows,
  sheetMetaMap,
} from "./xlsx-sheet";

describe("xlsx-sheet", () => {
  it("converte data/hora BR para ISO date", () => {
    expect(brDateTimeToIsoDate("10/12/2025 09:15:00")).toBe("2025-12-10");
    expect(brDateTimeToIsoDate("01/02/2024")).toBe("2024-02-01");
  });

  it("parseia sharedStrings + células tipadas", () => {
    const shared = `<?xml version="1.0"?>
      <sst>
        <si><t>DATA:</t></si>
        <si><t>10/12/2025 09:15:00</t></si>
        <si><t>PARLAMENTAR</t></si>
        <si><t>PARTIDO</t></si>
        <si><t>VOTO</t></si>
        <si><t>ADEMAR LUIZ TRAIANO</t></si>
        <si><t>PSD</t></si>
        <si><t>SIM</t></si>
      </sst>`;
    const sheet = `<?xml version="1.0"?>
      <worksheet><sheetData>
        <row r="1">
          <c r="A1" t="s"><v>0</v></c>
          <c r="B1" t="s"><v>1</v></c>
        </row>
        <row r="2">
          <c r="A2" t="s"><v>2</v></c>
          <c r="B2" t="s"><v>3</v></c>
          <c r="C2" t="s"><v>4</v></c>
        </row>
        <row r="3">
          <c r="A3" t="s"><v>5</v></c>
          <c r="B3" t="s"><v>6</v></c>
          <c r="C3" t="s"><v>7</v></c>
        </row>
      </sheetData></worksheet>`;
    const rows = parseXlsxSheetRows(sheet, shared);
    expect(sheetMetaMap(rows)["DATA"]).toBe("10/12/2025 09:15:00");
    expect(extractNominalVotes(rows)).toEqual([
      {
        parlamentar: "ADEMAR LUIZ TRAIANO",
        partido: "PSD",
        voto: "SIM",
      },
    ]);
  });
});
