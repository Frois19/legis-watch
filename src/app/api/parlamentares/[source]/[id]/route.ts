import { prisma } from "@/lib/db/prisma";
import { getAssembly } from "@/lib/parliament/assemblies";
import { parliamentarianId } from "@/lib/parliament/types";
import {
  SENADO_ATTENDANCE_DISCLAIMER,
  SENADO_COVERAGE,
} from "@/lib/senado/types";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ source: string; id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { source, id: externalId } = await params;
  if (!source || !externalId) {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const key = parliamentarianId(source, externalId);

  if (source === "senado") {
    const row = await prisma.senator.findUnique({ where: { id: key } });
    if (!row) {
      return NextResponse.json(
        { error: "Senador não encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      key: row.id,
      sphere: "senador",
      source: "senado",
      id: row.id,
      externalId: row.externalId,
      nome: row.nome,
      nomeCivil: row.nomeCivil,
      nomeEleitoral: row.nomeEleitoral,
      siglaPartido: row.siglaPartido,
      siglaUf: row.siglaUf,
      urlFoto: row.urlFoto,
      urlPagina: row.urlPagina,
      email: row.email,
      situacao: row.situacao,
      participacao: row.participacao,
      assemblyName: "Senado Federal",
      coverage: SENADO_COVERAGE,
      attendanceDisclaimer: SENADO_ATTENDANCE_DISCLAIMER,
      syncedAt: row.syncedAt?.toISOString() ?? null,
      href: `/parlamentares/senado/${row.externalId}`,
    });
  }

  const row = await prisma.stateDeputy.findUnique({ where: { id: key } });
  if (!row) {
    return NextResponse.json(
      { error: "Parlamentar estadual não encontrado" },
      { status: 404 },
    );
  }

  const assembly = getAssembly(row.source);
  return NextResponse.json({
    key: row.id,
    sphere: "estadual_deputado",
    source: row.source,
    id: row.id,
    externalId: row.externalId,
    nome: row.nome,
    nomeEleitoral: row.nomeEleitoral,
    siglaPartido: row.siglaPartido,
    siglaUf: row.uf,
    urlFoto: row.urlFoto,
    email: row.email,
    situacao: row.situacao,
    assemblyName: assembly?.name ?? row.source,
    coverage: assembly?.coverage ?? {
      search: true,
      profile: true,
      propositions: false,
      votes: false,
      attendance: false,
    },
    syncedAt: row.syncedAt?.toISOString() ?? null,
    href: `/parlamentares/${row.source}/${row.externalId}`,
  });
}
