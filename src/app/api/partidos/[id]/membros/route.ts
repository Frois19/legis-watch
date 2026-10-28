import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const partyId = Number((await params).id);
  if (!Number.isFinite(partyId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) {
    return NextResponse.json({ error: "Partido não encontrado" }, { status: 404 });
  }

  const legislaturaId = request.nextUrl.searchParams.get("legislaturaId");

  const members = await prisma.deputy.findMany({
    where: {
      partyId,
      ...(legislaturaId ? { legislaturaId: Number(legislaturaId) } : {}),
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      siglaUf: true,
      urlFoto: true,
      situacao: true,
      legislaturaId: true,
    },
  });

  return NextResponse.json({ party, members });
}
