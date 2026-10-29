import { resolveDeputyPhotoUrl } from "@/lib/camara/photo";
import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const nome = searchParams.get("nome")?.trim();
  const siglaPartido = searchParams.get("siglaPartido")?.trim();
  const siglaUf = searchParams.get("siglaUf")?.trim();
  const legislaturaIdParam = searchParams.get("legislaturaId");
  const legislaturaId = legislaturaIdParam
    ? Number(legislaturaIdParam)
    : null;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? 20)),
  );

  if (legislaturaId && Number.isFinite(legislaturaId)) {
    const mandateWhere = {
      legislaturaId,
      ...(siglaPartido ? { siglaPartido } : {}),
      ...(siglaUf ? { siglaUf } : {}),
      ...(nome
        ? {
            OR: [
              { nomeEleitoral: { contains: nome } },
              {
                deputy: {
                  OR: [
                    { nome: { contains: nome } },
                    { nomeEleitoral: { contains: nome } },
                    { nomeCivil: { contains: nome } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [total, mandates] = await Promise.all([
      prisma.deputyMandate.count({ where: mandateWhere }),
      prisma.deputyMandate.findMany({
        where: mandateWhere,
        orderBy: [{ nomeEleitoral: "asc" }, { deputyId: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          deputy: { include: { party: true } },
          party: true,
        },
      }),
    ]);

    return NextResponse.json({
      page,
      pageSize,
      total,
      items: mandates.map((m) => ({
        id: m.deputy.id,
        nome: m.deputy.nome,
        nomeEleitoral: m.nomeEleitoral ?? m.deputy.nomeEleitoral,
        siglaPartido: m.siglaPartido ?? m.deputy.siglaPartido,
        siglaUf: m.siglaUf ?? m.deputy.siglaUf,
        legislaturaId: m.legislaturaId,
        urlFoto: resolveDeputyPhotoUrl(m.deputy.id, m.deputy.urlFoto),
        email: m.deputy.email,
        situacao: m.situacao ?? m.deputy.situacao,
        redesSociais: parseJsonArray(m.deputy.redesSociais),
        party: m.party ?? m.deputy.party,
      })),
    });
  }

  const where = {
    AND: [
      nome
        ? {
            OR: [
              { nome: { contains: nome } },
              { nomeEleitoral: { contains: nome } },
              { nomeCivil: { contains: nome } },
            ],
          }
        : {},
      siglaPartido ? { siglaPartido } : {},
      siglaUf ? { siglaUf } : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.deputy.count({ where }),
    prisma.deputy.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { party: true },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: items.map((d) => ({
      id: d.id,
      nome: d.nome,
      nomeEleitoral: d.nomeEleitoral,
      siglaPartido: d.siglaPartido,
      siglaUf: d.siglaUf,
      legislaturaId: d.legislaturaId,
      urlFoto: resolveDeputyPhotoUrl(d.id, d.urlFoto),
      email: d.email,
      situacao: d.situacao,
      redesSociais: parseJsonArray(d.redesSociais),
      party: d.party,
    })),
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
