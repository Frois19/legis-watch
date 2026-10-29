import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  cachedFetchJson,
  cachedFetchText,
  clearHttpCache,
} from "./http-cache";

describe("http-cache", () => {
  let cacheDir: string;

  beforeEach(async () => {
    clearHttpCache();
    cacheDir = await mkdtemp(path.join(tmpdir(), "http-cache-"));
    process.env.PARLIAMENT_CACHE_DIR = cacheDir;
    process.env.HTTP_CACHE_DISK = "1";
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    clearHttpCache();
    delete process.env.PARLIAMENT_CACHE_DIR;
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("reusa resposta em memória sem novo fetch", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const a = await cachedFetchJson<{ ok: boolean }>("https://example.test/a", {
      namespace: "test",
      ttlMs: 60_000,
    });
    const b = await cachedFetchJson<{ ok: boolean }>("https://example.test/a", {
      namespace: "test",
      ttlMs: 60_000,
    });

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("diferencia POST body na chave de cache", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      new Response(String(init?.body ?? ""), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const a = await cachedFetchText("https://example.test/p", {
      namespace: "test",
      method: "POST",
      body: '{"ano":2024}',
      headers: { "Content-Type": "application/json" },
      ttlMs: 60_000,
    });
    const b = await cachedFetchText("https://example.test/p", {
      namespace: "test",
      method: "POST",
      body: '{"ano":2025}',
      headers: { "Content-Type": "application/json" },
      ttlMs: 60_000,
    });

    expect(a).toBe('{"ano":2024}');
    expect(b).toBe('{"ano":2025}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
