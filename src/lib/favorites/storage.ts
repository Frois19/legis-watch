export type FavoriteSphere =
  | "federal_deputado"
  | "estadual_deputado"
  | "senador";

/** Favorito unificado (federal, estadual ou senador). */
export type FavoriteItem = {
  key: string;
  sphere: FavoriteSphere;
  source: string;
  externalId: string;
  nome: string;
  siglaPartido: string | null;
  siglaUf: string | null;
  urlFoto: string | null;
  href: string;
};

/** @deprecated Use FavoriteItem — mantido para tipagem antiga em testes. */
export type FavoriteDeputy = FavoriteItem & { id?: number };

const KEY_V2 = "legis-watch:favorites:v2";
const KEY_V1 = "legis-watch:favorites:v1";

export function favoriteKey(
  sphere: FavoriteSphere,
  source: string,
  externalId: string | number,
): string {
  if (sphere === "federal_deputado") {
    return `camara:${externalId}`;
  }
  return `${source}:${externalId}`;
}

function normalizeItem(raw: unknown): FavoriteItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  // v2
  if (typeof row.key === "string" && typeof row.nome === "string") {
    const sphere = (row.sphere as FavoriteSphere) || "federal_deputado";
    const source =
      typeof row.source === "string"
        ? row.source
        : sphere === "senador"
          ? "senado"
          : sphere === "federal_deputado"
            ? "camara"
            : "unknown";
    const externalId =
      row.externalId != null
        ? String(row.externalId)
        : row.id != null
          ? String(row.id)
          : row.key.includes(":")
            ? row.key.slice(row.key.indexOf(":") + 1)
            : "";
    if (!externalId) return null;
    const href =
      typeof row.href === "string"
        ? row.href
        : sphere === "federal_deputado"
          ? `/deputados/${externalId}`
          : `/parlamentares/${source}/${externalId}`;
    return {
      key: row.key,
      sphere,
      source,
      externalId,
      nome: row.nome,
      siglaPartido: (row.siglaPartido as string | null) ?? null,
      siglaUf: (row.siglaUf as string | null) ?? null,
      urlFoto: (row.urlFoto as string | null) ?? null,
      href,
    };
  }

  // v1 federal-only: { id: number, nome, ... }
  if (typeof row.id === "number" && typeof row.nome === "string") {
    return {
      key: favoriteKey("federal_deputado", "camara", row.id),
      sphere: "federal_deputado",
      source: "camara",
      externalId: String(row.id),
      nome: row.nome,
      siglaPartido: (row.siglaPartido as string | null) ?? null,
      siglaUf: (row.siglaUf as string | null) ?? null,
      urlFoto: (row.urlFoto as string | null) ?? null,
      href: `/deputados/${row.id}`,
    };
  }

  return null;
}

export function readFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const rawV2 = localStorage.getItem(KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(normalizeItem)
        .filter((x): x is FavoriteItem => !!x);
    }

    const rawV1 = localStorage.getItem(KEY_V1);
    if (!rawV1) return [];
    const parsed = JSON.parse(rawV1);
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed
      .map(normalizeItem)
      .filter((x): x is FavoriteItem => !!x);
    if (migrated.length > 0) {
      writeFavorites(migrated);
    }
    return migrated;
  } catch {
    return [];
  }
}

export function writeFavorites(items: FavoriteItem[]) {
  localStorage.setItem(KEY_V2, JSON.stringify(items));
  // limpa v1 para evitar divergência
  try {
    localStorage.removeItem(KEY_V1);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("legis-favorites-changed"));
}

export function isFavorite(key: string): boolean {
  return readFavorites().some((f) => f.key === key);
}

export function toggleFavorite(item: FavoriteItem): FavoriteItem[] {
  const current = readFavorites();
  const exists = current.some((f) => f.key === item.key);
  const next = exists
    ? current.filter((f) => f.key !== item.key)
    : [...current, item];
  writeFavorites(next);
  return next;
}

export function federalFavoriteFromDeputy(input: {
  id: number;
  nome: string;
  siglaPartido: string | null;
  siglaUf: string | null;
  urlFoto: string | null;
}): FavoriteItem {
  return {
    key: favoriteKey("federal_deputado", "camara", input.id),
    sphere: "federal_deputado",
    source: "camara",
    externalId: String(input.id),
    nome: input.nome,
    siglaPartido: input.siglaPartido,
    siglaUf: input.siglaUf,
    urlFoto: input.urlFoto,
    href: `/deputados/${input.id}`,
  };
}
