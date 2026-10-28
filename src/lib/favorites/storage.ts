export type FavoriteDeputy = {
  id: number;
  nome: string;
  siglaPartido: string | null;
  siglaUf: string | null;
  urlFoto: string | null;
};

const KEY = "legis-watch:favorites:v1";

export function readFavorites(): FavoriteDeputy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeFavorites(items: FavoriteDeputy[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("legis-favorites-changed"));
}

export function isFavorite(id: number): boolean {
  return readFavorites().some((f) => f.id === id);
}

export function toggleFavorite(deputy: FavoriteDeputy): FavoriteDeputy[] {
  const current = readFavorites();
  const exists = current.some((f) => f.id === deputy.id);
  const next = exists
    ? current.filter((f) => f.id !== deputy.id)
    : [...current, deputy];
  writeFavorites(next);
  return next;
}
