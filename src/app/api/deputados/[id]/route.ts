import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const deputy = await prisma.deputy.findUnique({
    where: { id },
    include: { party: true },
  });

  if (!deputy) {
    return NextResponse.json({ error: "Deputado não encontrado" }, { status: 404 });
  }

  let partyMembers: Array<{
    id: number;
    nome: string;
    siglaUf: string | null;
    urlFoto: string | null;
  }> = [];

  if (deputy.partyId) {
    partyMembers = await prisma.deputy.findMany({
      where: {
        partyId: deputy.partyId,
        id: { not: deputy.id },
        legislaturaId: deputy.legislaturaId ?? undefined,
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, siglaUf: true, urlFoto: true },
      take: 100,
    });
  }

  return NextResponse.json({
    id: deputy.id,
    nome: deputy.nome,
    nomeCivil: deputy.nomeCivil,
    nomeEleitoral: deputy.nomeEleitoral,
    siglaPartido: deputy.siglaPartido,
    siglaUf: deputy.siglaUf,
    legislaturaId: deputy.legislaturaId,
    urlFoto: deputy.urlFoto,
    email: deputy.email,
    situacao: deputy.situacao,
    condicaoEleitoral: deputy.condicaoEleitoral,
    dataNascimento: deputy.dataNascimento,
    municipioNascimento: deputy.municipioNascimento,
    escolaridade: deputy.escolaridade,
    redesSociais: parseJsonArray(deputy.redesSociais),
    gabinete: parseJsonObject(deputy.gabineteJson),
    party: deputy.party,
    partyMembers,
    syncedAt: deputy.syncedAt,
  });
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
