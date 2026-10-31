import { describe, expect, it } from "vitest";
import {
  normalizeTipoVoto,
  parseAlepVoteSheet,
  voteIdFromXlsxName,
} from "./alep-votes";

describe("alep-votes", () => {
  it("normaliza tipos de voto", () => {
    expect(normalizeTipoVoto("SIM")).toBe("Sim");
    expect(normalizeTipoVoto("NÃO")).toBe("Não");
    expect(normalizeTipoVoto("NÃO VOTOU")).toBe("Não votou");
    expect(normalizeTipoVoto("ABSTER")).toBe("Abstenção");
  });

  it("extrai id estável do nome do XLSX", () => {
    expect(
      voteIdFromXlsxName(
        "SESSAO--ITEM-1245-31182-PROJETO DE LEI.xlsx",
        "1658",
      ),
    ).toBe("1658:31182");
  });

  it("monta votos nominais a partir do sheet OOXML", () => {
    const shared = `<?xml version="1.0"?><sst>
      <si><t>ITEM 1</t></si>
      <si><t>PROJETO DE LEI 10/2025</t></si>
      <si><t>SESSÃO / REUNIÃO:</t></si>
      <si><t>22ª EXTRA</t></si>
      <si><t>DATA:</t></si>
      <si><t>10/12/2025 09:15:00</t></si>
      <si><t>MODELO:</t></si>
      <si><t>2º TURNO</t></si>
      <si><t>EMENTA:</t></si>
      <si><t>Texto da ementa</t></si>
      <si><t>RESULTADO DA VOTAÇÃO:</t></si>
      <si><t>APROVADO</t></si>
      <si><t>PARLAMENTAR</t></si>
      <si><t>PARTIDO</t></si>
      <si><t>VOTO</t></si>
      <si><t>ADEMAR LUIZ TRAIANO</t></si>
      <si><t>PSD</t></si>
      <si><t>SIM</t></si>
      <si><t>OUTRO NOME</t></si>
      <si><t>PT</t></si>
      <si><t>NÃO VOTOU</t></si>
    </sst>`;
    const sheet = `<?xml version="1.0"?><worksheet><sheetData>
      <row><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
      <row><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>
      <row><c r="A3" t="s"><v>4</v></c><c r="B3" t="s"><v>5</v></c></row>
      <row><c r="A4" t="s"><v>6</v></c><c r="B4" t="s"><v>7</v></c></row>
      <row><c r="A5" t="s"><v>8</v></c><c r="B5" t="s"><v>9</v></c></row>
      <row><c r="A6" t="s"><v>10</v></c><c r="B6" t="s"><v>11</v></c></row>
      <row><c r="A7" t="s"><v>12</v></c><c r="B7" t="s"><v>13</v></c><c r="C7" t="s"><v>14</v></c></row>
      <row><c r="A8" t="s"><v>15</v></c><c r="B8" t="s"><v>16</v></c><c r="C8" t="s"><v>17</v></c></row>
      <row><c r="A9" t="s"><v>18</v></c><c r="B9" t="s"><v>19</v></c><c r="C9" t="s"><v>20</v></c></row>
    </sheetData></worksheet>`;

    const rows = parseAlepVoteSheet(
      sheet,
      shared,
      "1658",
      "x--ITEM-10-31182-PL.xlsx",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      tipoVoto: "Sim",
      dataSessao: "2025-12-10",
      materiaIdentificacao: "PROJETO DE LEI 10/2025",
      materiaEmenta: "Texto da ementa",
      descricaoResultado: "APROVADO",
      parlamentar: "ADEMAR LUIZ TRAIANO",
    });
    expect(rows[0]?.externalId).toContain("1658:31182:");
    expect(rows[1]?.tipoVoto).toBe("Não votou");
  });
});
