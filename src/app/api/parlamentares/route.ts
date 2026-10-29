import { searchCache } from "@/lib/cache/memory-cache";
import { searchCacheKey } from "@/lib/cache/search-key";
import { resolveDeputyPhotoUrl } from "@/lib/camara/photo";
import { prisma } from "@/lib/db/prisma";
import { getAssembly } from "@/lib/parliament/assemblies";
import type { ParliamentarianListItem } from "@/lib/api/types";
import { NextRequest, NextResponse } from "next/server";

type SphereFilter = "federal_deputado" | "estadual_deputado" | "todos";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const esferaRaw = (searchParams.get("esfera") ?? "federal_deputado").trim();
  const esfera = (
    ["federal_deputado", "estadual_deputado", "todos"].includes(esferaRaw)
      ? esferaRaw
      : "federal_deputado"
  ) as SphereFilter;
  const nome = searchParams.get("nome")?.trim();
  const siglaPartido = searchParams.get("siglaPartido")?.trim();
  const siglaUf = searchParams.get("siglaUf")?.trim();
  const legislaturaIdParam = searchParams.get("legislaturaId");
  const legislaturaId = legislaturaIdParam ? Number(legislaturaIdParam) : null;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? 20)),
  );

  const cacheKey = searchCacheKey({
    esfera,
    legislaturaId:
      legislaturaId && Number.isFinite(legislaturaId) ? legislaturaId : null,
    nome,
    siglaPartido,
    siglaUf,
    page,
    pageSize,
  });

  const cached = searchCache.get<unknown>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  let items: ParliamentarianListItem[] = [];
  if (esfera === "federal_deputado" || esfera === "todos") {
    items = items.concat(
      await listFederal({
        nome,
        siglaPartido,
        siglaUf,
        legislaturaId:
          legislaturaId && Number.isFinite(legislaturaId)
            ? legislaturaId
            : null,
      }),
    );
  }
  if (esfera === "estadual_deputado" || esfera === "todos") {
    items = items.concat(
      await listEstadual({ nome, siglaPartido, siglaUf }),
    );
  }

  items.sort((a, b) =>
    (a.nomeEleitoral || a.nome).localeCompare(b.nomeEleitoral || b.nome, "pt-BR"),
  );

  const total = items.length;
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);
  const payload = { page, pageSize, total, items: pageItems, esfera };
  searchCache.set(cacheKey, payload);
  return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
}

async function listFederal(opts: {
  nome?: string;
  siglaPartido?: string;
  siglaUf?: string;
  legislaturaId: number | null;
}): Promise<ParliamentarianListItem[]> {
  const { nome, siglaPartido, siglaUf, legislaturaId } = opts;

  if (legislaturaId) {
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
    const mandates = await prisma.deputyMandate.findMany({
      where: mandateWhere,
      orderBy: [{ nomeEleitoral: "asc" }, { deputyId: "asc" }],
      take: 500,
      include: { deputy: true },
    });
    return mandates.map((m) => ({
      key: `camara:${m.deputy.id}:${m.legislaturaId}`,
      sphere: "federal_deputado" as const,
      source: "camara",
      id: m.deputy.id,
      nome: m.deputy.nome,
      nomeEleitoral: m.nomeEleitoral ?? m.deputy.nomeEleitoral,
      siglaPartido: m.siglaPartido ?? m.deputy.siglaPartido,
      siglaUf: m.siglaUf ?? m.deputy.siglaUf,
      legislaturaId: m.legislaturaId,
      urlFoto: resolveDeputyPhotoUrl(m.deputy.id, m.deputy.urlFoto),
      email: m.deputy.email,
      situacao: m.situacao ?? m.deputy.situacao,
      href: `/deputados/${m.deputy.id}?legislaturaId=${m.legislaturaId}`,
      assemblyName: "Câmara dos Deputados",
    }));
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
  const deputies = await prisma.deputy.findMany({
    where,
    orderBy: { nome: "asc" },
    take: 500,
  });
  return deputies.map((d) => ({
    key: `camara:${d.id}`,
    sphere: "federal_deputado" as const,
    source: "camara",
    id: d.id,
    nome: d.nome,
    nomeEleitoral: d.nomeEleitoral,
    siglaPartido: d.siglaPartido,
    siglaUf: d.siglaUf,
    legislaturaId: d.legislaturaId,
    urlFoto: resolveDeputyPhotoUrl(d.id, d.urlFoto),
    email: d.email,
    situacao: d.situacao,
    href: `/deputados/${d.id}`,
    assemblyName: "Câmara dos Deputados",
  }));
}

async function listEstadual(opts: {
  nome?: string;
  siglaPartido?: string;
  siglaUf?: string;
}): Promise<ParliamentarianListItem[]> {
  const { nome, siglaPartido, siglaUf } = opts;
  const rows = await prisma.stateDeputy.findMany({
    where: {
      AND: [
        nome
          ? {
              OR: [
                { nome: { contains: nome } },
                { nomeEleitoral: { contains: nome } },
              ],
            }
          : {},
        siglaPartido ? { siglaPartido } : {},
        siglaUf ? { uf: siglaUf } : {},
      ],
    },
    orderBy: { nome: "asc" },
    take: 500,
  });

  return rows.map((d) => {
    const assembly = getAssembly(d.source);
    return {
      key: d.id,
      sphere: "estadual_deputado" as const,
      source: d.source,
      id: d.id,
      nome: d.nome,
      nomeEleitoral: d.nomeEleitoral,
      siglaPartido: d.siglaPartido,
      siglaUf: d.uf,
      legislaturaId: null,
      urlFoto: d.urlFoto,
      email: d.email,
      situacao: d.situacao,
      href: `/parlamentares/${d.source}/${d.externalId}`,
      assemblyName: assembly?.name ?? d.source,
    };
  });
}
