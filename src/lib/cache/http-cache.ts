import { createHash } from "node:crypto";
import { readJsonCache, writeJsonCache } from "@/lib/parliament/file-cache";

type MemoryEntry = {
  expiresAt: number;
  body: string;
  contentType: string;
};

const memory = new Map<string, MemoryEntry>();
let hits = 0;
let misses = 0;
let networkFetches = 0;

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function defaultTtlMs() {
  return envInt("HTTP_CACHE_TTL_MS", 6 * 60 * 60 * 1000);
}

function maxMemoryEntries() {
  return envInt("HTTP_CACHE_MAX", 400);
}

function diskEnabled() {
  return process.env.HTTP_CACHE_DISK !== "0";
}

export type CachedFetchOptions = {
  /** Prefixo estável por fonte (ex.: alep, almg, senado). */
  namespace: string;
  method?: string;
  headers?: HeadersInit;
  body?: string;
  ttlMs?: number;
  timeoutMs?: number;
  /** Persistência em `.cache/parliament` (default true). */
  disk?: boolean;
};

function cacheKey(url: string, opts: CachedFetchOptions): string {
  const method = (opts.method ?? "GET").toUpperCase();
  const material = `${method}\n${url}\n${opts.body ?? ""}`;
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 32);
  return `${opts.namespace}:${hash}`;
}

function fileName(key: string): string {
  return `http-${key.replace(/[^a-zA-Z0-9._-]+/g, "_")}.json`;
}

function touchMemory(key: string, entry: MemoryEntry) {
  if (memory.has(key)) memory.delete(key);
  memory.set(key, entry);
  while (memory.size > maxMemoryEntries()) {
    const oldest = memory.keys().next().value as string | undefined;
    if (oldest == null) break;
    memory.delete(oldest);
  }
}

export function clearHttpCache(prefix?: string) {
  if (!prefix) {
    memory.clear();
    hits = 0;
    misses = 0;
    networkFetches = 0;
    return;
  }
  for (const key of [...memory.keys()]) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

export function httpCacheStats() {
  return {
    size: memory.size,
    hits,
    misses,
    networkFetches,
    maxEntries: maxMemoryEntries(),
    defaultTtlMs: defaultTtlMs(),
    diskEnabled: diskEnabled(),
  };
}

async function readCache(
  key: string,
  useDisk: boolean,
): Promise<MemoryEntry | null> {
  const mem = memory.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    touchMemory(key, mem);
    return mem;
  }
  if (mem) memory.delete(key);

  if (!useDisk) return null;
  const disk = await readJsonCache<{ body: string; contentType: string }>(
    fileName(key),
  );
  if (!disk) return null;
  const entry: MemoryEntry = {
    expiresAt: disk.expiresAt,
    body: disk.payload.body,
    contentType: disk.payload.contentType,
  };
  touchMemory(key, entry);
  return entry;
}

async function writeCache(
  key: string,
  entry: MemoryEntry,
  useDisk: boolean,
  ttlMs: number,
) {
  touchMemory(key, entry);
  if (!useDisk) return;
  await writeJsonCache(
    fileName(key),
    { body: entry.body, contentType: entry.contentType },
    ttlMs,
  );
}

/**
 * Fetch HTTP com cache em memória + disco (TTL).
 * Usar em todas as consultas a APIs parlamentares externas.
 */
export async function cachedFetchText(
  url: string,
  opts: CachedFetchOptions,
): Promise<string> {
  const key = cacheKey(url, opts);
  const ttlMs = opts.ttlMs ?? defaultTtlMs();
  const useDisk = opts.disk ?? diskEnabled();
  const cached = await readCache(key, useDisk);
  if (cached) {
    hits += 1;
    return cached.body;
  }
  misses += 1;

  const method = (opts.method ?? "GET").toUpperCase();
  networkFetches += 1;
  const response = await fetch(url, {
    method,
    headers: opts.headers,
    body: opts.body,
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${method} ${url}`);
  }
  const body = await response.text();
  const entry: MemoryEntry = {
    expiresAt: Date.now() + ttlMs,
    body,
    contentType: response.headers.get("content-type") ?? "text/plain",
  };
  await writeCache(key, entry, useDisk, ttlMs);
  return body;
}

export async function cachedFetchJson<T>(
  url: string,
  opts: CachedFetchOptions,
): Promise<T> {
  const text = await cachedFetchText(url, {
    ...opts,
    headers: {
      Accept: "application/json",
      ...(opts.headers ?? {}),
    },
  });
  return JSON.parse(text) as T;
}
