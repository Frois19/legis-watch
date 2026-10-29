import { getDeputyPropositions } from "@/lib/api/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deputyId = Number((await params).id);
  if (!Number.isFinite(deputyId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get("pageSize") ?? 20)),
  );
  const legislaturaRaw = searchParams.get("legislaturaId");
  const legislaturaId = legislaturaRaw ? Number(legislaturaRaw) : null;

  try {
    const result = await getDeputyPropositions(
      deputyId,
      pageSize,
      legislaturaId && Number.isFinite(legislaturaId) ? legislaturaId : null,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro";
    if (message === "legislature_not_found") {
      return NextResponse.json(
        { error: "Legislatura não encontrada" },
        { status: 404 },
      );
    }
    throw error;
  }
}
