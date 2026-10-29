import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ROOT = path.join(process.cwd(), ".cache", "parliament");

function rootDir() {
  return process.env.PARLIAMENT_CACHE_DIR || DEFAULT_ROOT;
}

export async function readJsonCache<T>(
  name: string,
): Promise<{ expiresAt: number; payload: T } | null> {
  try {
    const raw = await readFile(path.join(rootDir(), name), "utf8");
    const parsed = JSON.parse(raw) as { expiresAt?: number; payload?: T };
    if (
      !parsed ||
      typeof parsed.expiresAt !== "number" ||
      parsed.payload === undefined
    ) {
      return null;
    }
    if (parsed.expiresAt < Date.now()) return null;
    return { expiresAt: parsed.expiresAt, payload: parsed.payload };
  } catch {
    return null;
  }
}

export async function writeJsonCache<T>(
  name: string,
  payload: T,
  ttlMs: number,
): Promise<void> {
  const dir = rootDir();
  await mkdir(dir, { recursive: true });
  const body = JSON.stringify({
    expiresAt: Date.now() + ttlMs,
    payload,
  });
  await writeFile(path.join(dir, name), body, "utf8");
}
