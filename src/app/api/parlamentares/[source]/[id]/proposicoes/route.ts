import { prisma } from "@/lib/db/prisma";
import { parliamentarianId } from "@/lib/parliament/types";
import { ensureStateDeputyProfile } from "@/lib/sync/estadual";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ source: string; id: string }> };

/** Lista proposições sincronizadas de um parlamentar estadual. */
export async function GET(request: NextRequest, { params }: Params) {
  const { source, id: externalId } = await params;
  if (!source || !externalId || source === "senado") {
    return NextResponse.json({ error: "parâmetros inválidos" }, { status: 400 });
  }

  const pageSize = Math.min(
    100,
    Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 50)),
  );
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));

  await ensureStateDeputyProfile(source, externalId);
  const key = parliamentarianId(source, externalId);
  const deputy = await prisma.stateDeputy.findUnique({ where: { id: key } });
  if (!deputy) {
    return NextResponse.json(
      { error: "Parlamentar estadual não encontrado" },
      { status: 404 },
    );
  }

  const where = { stateDeputyId: key };
  const [total, items] = await Promise.all([
    prisma.stateProposition.count({ where }),
    prisma.stateProposition.findMany({
      where,
      orderBy: [{ ano: "desc" }, { numero: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: items.map((p) => ({
      id: p.id,
      externalId: p.externalId,
      siglaTipo: p.siglaTipo,
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      dataApresentacao: p.dataApresentacao,
      statusResumo: p.statusResumo,
      urlPublica: p.urlPublica,
    })),
  });
}
