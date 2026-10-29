import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryCache, SEARCH_CACHE_PREFIX } from "./memory-cache";
import { searchCacheKey } from "./search-key";

describe("MemoryCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("armazena e devolve valores dentro do TTL", () => {
    const cache = new MemoryCache(10, 1000);
    cache.set("a", { ok: true });
    expect(cache.get("a")).toEqual({ ok: true });
    expect(cache.stats().hits).toBe(1);
  });

  it("expira após o TTL", () => {
    const cache = new MemoryCache(10, 1000);
    cache.set("a", 1);
    vi.advanceTimersByTime(1001);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.stats().misses).toBe(1);
  });

  it("respeita o teto LRU", () => {
    const cache = new MemoryCache(2, 10_000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("invalida por prefixo", () => {
    const cache = new MemoryCache(10, 10_000);
    cache.set(`${SEARCH_CACHE_PREFIX}x`, 1);
    cache.set("other", 2);
    expect(cache.invalidatePrefix(SEARCH_CACHE_PREFIX)).toBe(1);
    expect(cache.get(`${SEARCH_CACHE_PREFIX}x`)).toBeUndefined();
    expect(cache.get("other")).toBe(2);
  });
});

describe("searchCacheKey", () => {
  it("normaliza nome/partido/UF e vazios", () => {
    expect(
      searchCacheKey({
        nome: "  Janones ",
        siglaPartido: "pt",
        siglaUf: "mg",
        legislaturaId: 56,
        page: 1,
        pageSize: 30,
      }),
    ).toBe("search:v1:federal_deputado:56:janones:PT:MG:1:30");

    expect(searchCacheKey({})).toBe(
      "search:v1:federal_deputado:_:_:_:_:1:20",
    );
  });
});
