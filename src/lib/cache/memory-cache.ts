type Entry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Cache em memória com TTL e evicção LRU simples (por ordem de inserção em Map).
 * Adequado para uma instância do Next.js; trocar por Redis em multi-instância.
 */
export class MemoryCache {
  private store = new Map<string, Entry<unknown>>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly defaultTtlMs: number,
  ) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    // refresh LRU: reinsert
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (oldest == null) break;
      this.store.delete(oldest);
    }
  }

  invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.store.clear();
  }

  stats() {
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      maxEntries: this.maxEntries,
      defaultTtlMs: this.defaultTtlMs,
    };
  }
}

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export const searchCache = new MemoryCache(
  envInt("SEARCH_CACHE_MAX", 500),
  envInt("SEARCH_CACHE_TTL_MS", 120_000),
);

export const SEARCH_CACHE_PREFIX = "search:v1:";

export function invalidateSearchCache(): number {
  return searchCache.invalidatePrefix(SEARCH_CACHE_PREFIX);
}
