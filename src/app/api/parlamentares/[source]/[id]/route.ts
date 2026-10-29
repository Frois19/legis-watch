import { serializeStateDeputyDetail } from "@/lib/parliament/serialize";
import { serializeSenatorDetail } from "@/lib/senado/serialize";
import { ensureStateDeputyProfile } from "@/lib/sync/estadual";
import { ensureSenatorProfile } from "@/lib/sync/senado";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ source: string; id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { source, id: externalId } = await params;
  if (!source || !externalId) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  if (source === "senado") {
    const row = await ensureSenatorProfile(externalId);
    if (!row) {
      return NextResponse.json(
        { error: "Senador não encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json(serializeSenatorDetail(row));
  }

  const row = await ensureStateDeputyProfile(source, externalId);
  if (!row) {
    return NextResponse.json(
      { error: "Parlamentar estadual não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json(serializeStateDeputyDetail(row));
}
