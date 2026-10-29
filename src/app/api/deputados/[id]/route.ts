import { getDeputy } from "@/lib/api/server";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const legislaturaParam = request.nextUrl.searchParams.get("legislaturaId");
  const legislaturaId = legislaturaParam ? Number(legislaturaParam) : null;

  try {
    const deputy = await getDeputy(
      id,
      legislaturaId && Number.isFinite(legislaturaId) ? legislaturaId : null,
    );
    return NextResponse.json(deputy);
  } catch {
    return NextResponse.json(
      { error: "Deputado não encontrado" },
      { status: 404 },
    );
  }
}
