/** Parser CSV mínimo (RFC4180) para arquivos oficiais das casas. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0]!.map((h) => h.trim());
  return rows.slice(1).map((cols) => {
    const out: Record<string, string> = {};
    for (let idx = 0; idx < headers.length; idx += 1) {
      out[headers[idx]!] = cols[idx] ?? "";
    }
    return out;
  });
}
