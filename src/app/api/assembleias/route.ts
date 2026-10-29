import { STATE_ASSEMBLIES } from "@/lib/parliament/assemblies";
import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const counts = await prisma.stateDeputy.groupBy({
    by: ["source"],
    _count: { _all: true },
  });
  const bySource = Object.fromEntries(
    counts.map((c) => [c.source, c._count._all]),
  );

  return NextResponse.json({
    items: STATE_ASSEMBLIES.map((a) => ({
      ...a,
      syncedCount: bySource[a.source] ?? 0,
    })),
  });
}
