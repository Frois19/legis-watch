import { getEventAta } from "@/lib/api/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const eventId = Number((await params).id);
  if (!Number.isFinite(eventId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  try {
    const ata = await getEventAta(eventId);
    return NextResponse.json(ata);
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro";
    if (message === "event_not_found") {
      return NextResponse.json(
        { error: "Evento não encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
