import { resolveDeputyPhotoUrl } from "@/lib/camara/photo";
import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const nome = searchParams.get("nome")?.trim();
  const siglaPartido = searchParams.get("siglaPartido")?.trim();
  const siglaUf = searchParams.get("siglaUf")?.trim();
  const legislaturaId = searchParams.get("legislaturaId");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? 20)),
  );

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
      legislaturaId ? { legislaturaId: Number(legislaturaId) } : {},
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
    items: items.map(serializeDeputy),
  });
}

function serializeDeputy(d: {
  id: number;
  nome: string;
  nomeEleitoral: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  legislaturaId: number | null;
  urlFoto: string | null;
  email: string | null;
  situacao: string | null;
  redesSociais: string | null;
  party: { id: number; sigla: string; nome: string | null } | null;
}) {
  return {
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
  };
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
