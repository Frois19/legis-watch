import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Presenças em sessões deliberativas do Plenário.
 * Falta = sessão deliberativa encerrada/realizada sem registro de presença do deputado.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const deputyId = Number((await params).id);
  if (!Number.isFinite(deputyId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? 30)),
  );
  const onlyAbsences = searchParams.get("faltas") === "1";

  const presentEventIds = new Set(
    (
      await prisma.attendance.findMany({
        where: { deputyId, year },
        select: { eventId: true },
      })
    ).map((a) => a.eventId),
  );

  const events = await prisma.event.findMany({
    where: {
      year,
      descricaoTipo: "Sessão Deliberativa",
      situacao: { not: "Cancelada" },
      localCamara: { contains: "Plenário da Câmara" },
    },
    orderBy: { dataHoraInicio: "desc" },
  });

  const rows = events.map((event) => {
    const presente = presentEventIds.has(event.id);
    return {
      eventId: event.id,
      dataHoraInicio: event.dataHoraInicio,
      dataHoraFim: event.dataHoraFim,
      descricaoTipo: event.descricaoTipo,
      descricao: event.descricao,
      localCamara: event.localCamara,
      situacao: event.situacao,
      presente,
      status: presente ? "presente" : "falta",
    };
  });

  const filtered = onlyAbsences ? rows.filter((r) => !r.presente) : rows;
  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  const presentes = rows.filter((r) => r.presente).length;
  const faltas = rows.length - presentes;

  return NextResponse.json({
    year,
    page,
    pageSize,
    total,
    summary: {
      eventosConsiderados: rows.length,
      presentes,
      faltas,
      metodologia:
        "Apenas Sessões Deliberativas não canceladas no Plenário da Câmara, cruzadas com eventosPresencaDeputados. Ausência no arquivo = falta candidata — não substitui a lista oficial de faltas remuneradas.",
    },
    items,
  });
}
