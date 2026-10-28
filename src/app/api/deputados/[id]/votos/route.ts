import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deputyId = Number((await params).id);
  if (!Number.isFinite(deputyId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get("pageSize") ?? 20)),
  );
  const year = searchParams.get("year");
  const tipoVoto = searchParams.get("tipoVoto")?.trim();

  const where = {
    deputyId,
    ...(year ? { year: Number(year) } : {}),
    ...(tipoVoto ? { tipoVoto } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.vote.count({ where }),
    prisma.vote.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        voteSession: {
          include: { proposition: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: items.map((v) => ({
      id: v.id,
      tipoVoto: v.tipoVoto,
      dataRegistro: v.dataRegistro,
      year: v.year,
      votacao: {
        id: v.voteSession.id,
        descricao: v.voteSession.descricao,
        dataHoraRegistro: v.voteSession.dataHoraRegistro,
        aprovacao: v.voteSession.aprovacao,
        siglaOrgao: v.voteSession.siglaOrgao,
      },
      proposicao: v.voteSession.proposition
        ? {
            id: v.voteSession.proposition.id,
            siglaTipo: v.voteSession.proposition.siglaTipo,
            numero: v.voteSession.proposition.numero,
            ano: v.voteSession.proposition.ano,
            ementa: v.voteSession.proposition.ementa,
          }
        : null,
    })),
  });
}
