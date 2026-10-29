import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  favoriteKey,
  isFavorite,
  readFavorites,
  toggleFavorite,
  writeFavorites,
  type FavoriteItem,
} from "./storage";

const federal: FavoriteItem = {
  key: "camara:204515",
  sphere: "federal_deputado",
  source: "camara",
  externalId: "204515",
  nome: "André Janones",
  siglaPartido: "REDE",
  siglaUf: "MG",
  urlFoto: null,
  href: "/deputados/204515",
};

const senator: FavoriteItem = {
  key: "senado:5672",
  sphere: "senador",
  source: "senado",
  externalId: "5672",
  nome: "Alan Rick",
  siglaPartido: "REPUBLICANOS",
  siglaUf: "AC",
  urlFoto: null,
  href: "/parlamentares/senado/5672",
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
    localStorage.setItem("legis-watch:favorites:v2", "{bad");
    expect(readFavorites()).toEqual([]);
    localStorage.setItem("legis-watch:favorites:v2", '{"a":1}');
    expect(readFavorites()).toEqual([]);
  });

  it("migra favoritos v1 federal para v2", () => {
    localStorage.setItem(
      "legis-watch:favorites:v1",
      JSON.stringify([
        {
          id: 204515,
          nome: "André Janones",
          siglaPartido: "REDE",
          siglaUf: "MG",
          urlFoto: null,
        },
      ]),
    );
    const items = readFavorites();
    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe("camara:204515");
    expect(items[0]?.href).toBe("/deputados/204515");
    expect(localStorage.getItem("legis-watch:favorites:v2")).toContain(
      "camara:204515",
    );
  });

  it("grava, detecta e alterna favoritos multi-esfera", () => {
    writeFavorites([federal]);
    expect(isFavorite("camara:204515")).toBe(true);
    expect(isFavorite("senado:5672")).toBe(false);

    const withSenator = toggleFavorite(senator);
    expect(withSenator).toHaveLength(2);
    expect(isFavorite(favoriteKey("senador", "senado", "5672"))).toBe(true);

    const removed = toggleFavorite(federal);
    expect(removed).toEqual([senator]);
  });

  it("não remove outros favoritos ao alternar um", () => {
    writeFavorites([federal, senator]);
    const next = toggleFavorite(federal);
    expect(next).toEqual([senator]);
  });
});
