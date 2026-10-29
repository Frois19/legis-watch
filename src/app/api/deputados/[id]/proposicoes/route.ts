import { prisma } from "@/lib/db/prisma";
import { isApprovedPropositionStatus } from "@/lib/propositions/status";
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
  const siglaTipo = searchParams.get("siglaTipo")?.trim();

  const where = {
    authors: { some: { deputyId } },
    ...(siglaTipo ? { siglaTipo } : {}),
  };

  const [total, items, statusRows] = await Promise.all([
    prisma.proposition.count({ where }),
    prisma.proposition.findMany({
      where,
      orderBy: [{ ano: "desc" }, { numero: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        authors: {
          where: { deputyId },
          select: { proponente: true, ordemAssinatura: true },
        },
      },
    }),
    prisma.proposition.findMany({
      where,
      select: { statusResumo: true },
    }),
  ]);

  const aprovados = statusRows.filter((p) =>
    isApprovedPropositionStatus(p.statusResumo),
  ).length;

  return NextResponse.json({
    page,
    pageSize,
    total,
    stats: {
      apresentados: total,
      aprovados,
    },
    items: items.map((p) => ({
      id: p.id,
      uri: p.uri,
      siglaTipo: p.siglaTipo,
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      dataApresentacao: p.dataApresentacao,
      statusResumo: p.statusResumo,
      proponente: p.authors[0]?.proponente ?? false,
    })),
  });
}
