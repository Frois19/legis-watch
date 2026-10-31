/**
 * Parser mínimo de planilha OOXML (sheet1 + sharedStrings).
 * Suficiente para os XLSX de votos nominais da ALEP — sem dependência extra.
 */

function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    const block = m[1] ?? "";
    const texts: string[] = [];
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(block))) {
      texts.push(decodeXml(tm[1] ?? ""));
    }
    out.push(texts.join(""));
  }
  return out;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Converte sheet1.xml (+ sharedStrings opcional) em matriz de células.
 */
export function parseXlsxSheetRows(
  sheetXml: string,
  sharedStringsXml?: string | null,
): string[][] {
  const shared = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
  const rows: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(sheetXml))) {
    const rowXml = rowMatch[1] ?? "";
    const byCol = new Map<number, string>();
    let maxCol = -1;
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowXml))) {
      const attrs = cellMatch[1] ?? cellMatch[3] ?? "";
      const inner = cellMatch[2] ?? "";
      const ref = attrs.match(/\br="([^"]+)"/i)?.[1] ?? "A1";
      const type = attrs.match(/\bt="([^"]+)"/i)?.[1] ?? "";
      const col = colIndex(ref);
      maxCol = Math.max(maxCol, col);
      let value = "";
      if (type === "inlineStr") {
        const t = inner.match(/<t\b[^>]*>([\s\S]*?)<\/t>/i)?.[1];
        value = decodeXml(t ?? "");
      } else {
        const v = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1] ?? "";
        if (type === "s") {
          const idx = Number(v);
          value = Number.isFinite(idx) ? (shared[idx] ?? "") : "";
        } else {
          value = decodeXml(v);
        }
      }
      byCol.set(col, value);
    }
    if (maxCol < 0) {
      rows.push([]);
      continue;
    }
    const line: string[] = [];
    for (let i = 0; i <= maxCol; i += 1) line.push(byCol.get(i) ?? "");
    rows.push(line);
  }
  return rows;
}

/** Lê metadado "CHAVE:" / "VALOR" em linhas de 2 colunas. */
export function sheetMetaMap(rows: string[][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = (row[0] ?? "").replace(/:$/, "").trim().toUpperCase();
    const value = (row[1] ?? "").trim();
    if (!key || !value) continue;
    if (row.length >= 3 && (row[2] ?? "").trim()) continue;
    out[key] = value;
  }
  return out;
}

/** Localiza cabeçalho PARLAMENTAR / PARTIDO / VOTO e retorna linhas de voto. */
export function extractNominalVotes(
  rows: string[][],
): Array<{ parlamentar: string; partido: string; voto: string }> {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i += 1) {
    const a = (rows[i]?.[0] ?? "").trim().toUpperCase();
    const b = (rows[i]?.[1] ?? "").trim().toUpperCase();
    const c = (rows[i]?.[2] ?? "").trim().toUpperCase();
    if (a === "PARLAMENTAR" && b.includes("PARTIDO") && c === "VOTO") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];
  const out: Array<{ parlamentar: string; partido: string; voto: string }> = [];
  for (const row of rows.slice(headerIdx + 1)) {
    const parlamentar = (row[0] ?? "").trim();
    const partido = (row[1] ?? "").trim();
    const voto = (row[2] ?? "").trim();
    if (!parlamentar || !voto) continue;
    out.push({ parlamentar, partido, voto });
  }
  return out;
}

/** Converte "10/12/2025 09:15:00" → "2025-12-10". */
export function brDateTimeToIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?/);
  if (!m) return value.slice(0, 10);
  return `${m[3]}-${m[2]}-${m[1]}`;
}
