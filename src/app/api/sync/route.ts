import { invalidateSearchCache } from "@/lib/cache/memory-cache";
import {
  syncAttendanceForYear,
  syncDeputies,
  syncParties,
  syncPropositionsForDeputy,
  syncAllStateAssemblies,
  syncSenadores,
  syncStateAssembly,
  syncVotesForYear,
} from "@/lib/sync";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SEARCH_INVALIDATING_DOMAINS = new Set([
  "parties",
  "deputies",
  "bootstrap",
  "estadual",
  "senadores",
]);

const bodySchema = z.object({
  domain: z.enum([
    "parties",
    "deputies",
    "propositions",
    "votes",
    "attendance",
    "bootstrap",
    "estadual",
    "senadores",
  ]),
  deputyId: z.number().int().positive().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  source: z.string().min(2).optional(),
});

/**
 * Dispara sync sob demanda (uso interno/dev).
 * Em produção, preferir `npm run sync` via cron.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    const header = request.headers.get("x-sync-secret");
    if (header !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "payload inválido", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { domain, deputyId, year, source } = parsed.data;
  const y = year ?? new Date().getFullYear();

  try {
    let result: Record<string, number> | Record<string, unknown>;

    switch (domain) {
      case "parties":
        result = await syncParties();
        break;
      case "deputies":
        result = await syncDeputies();
        break;
      case "propositions":
        if (!deputyId) {
          return NextResponse.json(
            { error: "deputyId obrigatório" },
            { status: 400 },
          );
        }
        result = await syncPropositionsForDeputy(deputyId);
        break;
      case "votes":
        result = await syncVotesForYear(y);
        break;
      case "attendance":
        result = await syncAttendanceForYear(y);
        break;
      case "bootstrap":
        result = {
          parties: await syncParties(),
          deputies: await syncDeputies(),
        };
        break;
      case "estadual":
        result =
          !source || source === "all"
            ? await syncAllStateAssemblies()
            : await syncStateAssembly(source);
        break;
      case "senadores":
        result = await syncSenadores();
        break;
      default:
        return NextResponse.json({ error: "domain inválido" }, { status: 400 });
    }

    let searchCacheCleared = 0;
    if (SEARCH_INVALIDATING_DOMAINS.has(domain)) {
      searchCacheCleared = invalidateSearchCache();
    }

    return NextResponse.json({
      ok: true,
      domain,
      result,
      searchCacheCleared,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
