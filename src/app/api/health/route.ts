import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [deputies, parties, lastSync] = await Promise.all([
      prisma.deputy.count(),
      prisma.party.count(),
      prisma.syncRun.findFirst({
        orderBy: { startedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      service: "legis-watch-api",
      version: "v1",
      counts: { deputies, parties },
      lastSync,
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
