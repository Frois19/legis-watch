const STOP = new Set([
  "DE",
  "DA",
  "DO",
  "DOS",
  "DAS",
  "E",
  "DEPUTADO",
  "DEPUTADA",
]);

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nameTokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** True se o campo autor/nome da sessão cobre o nome do deputado. */
export function authorMatchesDeputy(
  autorField: string,
  deputyName: string,
): boolean {
  const deputyTokens = nameTokens(deputyName);
  if (deputyTokens.length === 0) return false;
  const segments = normalizeName(autorField)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const segment of segments) {
    const segTokens = nameTokens(segment);
    if (segTokens.length === 0) continue;
    const matched = deputyTokens.filter((t) => segTokens.includes(t));
    const need = Math.min(2, deputyTokens.length);
    if (matched.length >= need) return true;
  }
  return false;
}
