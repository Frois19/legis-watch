import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isFavorite,
  readFavorites,
  toggleFavorite,
  writeFavorites,
  type FavoriteDeputy,
} from "./storage";

const deputy: FavoriteDeputy = {
  id: 204515,
  nome: "André Janones",
  siglaPartido: "REDE",
  siglaUf: "MG",
  urlFoto: null,
};

describe("favorites storage", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
  });

  it("retorna lista vazia sem window", () => {
    vi.stubGlobal("window", undefined);
    expect(readFavorites()).toEqual([]);
  });

  it("lê lista vazia / inválida com segurança", () => {
    expect(readFavorites()).toEqual([]);
    localStorage.setItem("legis-watch:favorites:v1", "{bad");
    expect(readFavorites()).toEqual([]);
    localStorage.setItem("legis-watch:favorites:v1", '{"a":1}');
    expect(readFavorites()).toEqual([]);
  });

  it("grava, detecta e alterna favoritos", () => {
    writeFavorites([deputy]);
    expect(isFavorite(204515)).toBe(true);
    expect(isFavorite(999)).toBe(false);
    expect(window.dispatchEvent).toHaveBeenCalled();

    const removed = toggleFavorite(deputy);
    expect(removed).toEqual([]);
    expect(isFavorite(204515)).toBe(false);

    const added = toggleFavorite(deputy);
    expect(added).toHaveLength(1);
    expect(added[0]?.id).toBe(204515);
    expect(localStorage.getItem("legis-watch:favorites:v1")).toContain(
      "204515",
    );
  });

  it("não remove outros favoritos ao alternar um", () => {
    const other = { ...deputy, id: 209787, nome: "Nikolas" };
    writeFavorites([deputy, other]);
    const next = toggleFavorite(deputy);
    expect(next).toEqual([other]);
  });
});

