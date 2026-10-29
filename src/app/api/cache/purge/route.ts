import {
  invalidateSearchCache,
  searchCache,
} from "@/lib/cache/memory-cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Limpa o cache de buscas (uso interno/dev).
 * Em produção, proteger com SYNC_SECRET (mesmo do sync).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    const header = request.headers.get("x-sync-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const removed = invalidateSearchCache();
  return NextResponse.json({
    ok: true,
    removed,
    stats: searchCache.stats(),
  });
}
