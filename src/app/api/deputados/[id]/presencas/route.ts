import { getDeputyAttendance } from "@/lib/api/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deputyId = Number((await params).id);
  if (!Number.isFinite(deputyId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const legislaturaRaw = searchParams.get("legislaturaId");
  const legislaturaId = legislaturaRaw ? Number(legislaturaRaw) : null;
  const year = searchParams.get("year");

  try {
    if (year && !legislaturaId) {
      // Compat: filtrar um único ano quando legislatura não for informada.
      const result = await getDeputyAttendance(deputyId, null);
      const filteredItems = result.items.filter(
        (item) => (item.dataHoraInicio ?? "").startsWith(String(year)),
      );
      const presentes = filteredItems.filter((r) => r.presente).length;
      return NextResponse.json({
        ...result,
        year: Number(year),
        years: [Number(year)],
        total: filteredItems.length,
        pageSize: filteredItems.length,
        summary: {
          ...result.summary,
          eventosConsiderados: filteredItems.length,
          presentes,
          faltas: filteredItems.length - presentes,
        },
        items: filteredItems,
      });
    }

    const result = await getDeputyAttendance(
      deputyId,
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
