import { httpCacheStats } from "@/lib/cache/http-cache";
import { searchCache } from "@/lib/cache/memory-cache";
import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

/** Observabilidade mínima: hit/miss de caches + últimos syncs. */
export async function GET() {
  const recentSyncs = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 8,
  });

  return NextResponse.json({
    search: searchCache.stats(),
    http: httpCacheStats(),
    syncs: recentSyncs.map((run) => {
      const started = run.startedAt.getTime();
      const finished = run.finishedAt?.getTime() ?? null;
      return {
        id: run.id,
        domain: run.domain,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt?.toISOString() ?? null,
        durationMs: finished != null ? finished - started : null,
        message: run.message,
        counts: run.countsJson ? JSON.parse(run.countsJson) : null,
      };
    }),
  });
}
