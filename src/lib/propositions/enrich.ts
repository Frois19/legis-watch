import {
  getProposition,
  listPropositionAuthors,
} from "@/lib/camara/client";
import { prisma } from "@/lib/db/prisma";
import type {
  EnrichedProposition,
  VotePropositionAuthor,
} from "@/lib/api/types";

export type { EnrichedProposition };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deputyIdFromAuthorUri(uri?: string): number | null {
  if (!uri) return null;
  const match = uri.match(/\/deputados\/(\d+)/);
  return match ? Number(match[1]) : null;
}

async function enrichOne(
  id: number,
  delay: number,
): Promise<EnrichedProposition> {
  const existing = await prisma.proposition.findUnique({
    where: { id },
    include: {
      authors: {
        include: {
          deputy: {
            select: {
              id: true,
              nome: true,
              nomeEleitoral: true,
              siglaPartido: true,
              siglaUf: true,
            },
          },
        },
        orderBy: [{ proponente: "desc" }, { ordemAssinatura: "asc" }],
        take: 8,
      },
    },
  });

  const needsDetail =
    !existing?.ementa ||
    !existing?.dataApresentacao ||
    !existing?.statusResumo;
  const needsAuthors =
    !existing?.authorsResumo && (existing?.authors.length ?? 0) === 0;

  let ementa = existing?.ementa ?? null;
  let dataApresentacao = existing?.dataApresentacao ?? null;
  let statusResumo = existing?.statusResumo ?? null;
  let siglaTipo = existing?.siglaTipo ?? null;
  let numero = existing?.numero ?? null;
  let ano = existing?.ano ?? null;
  let authorsResumo = existing?.authorsResumo ?? null;
  let authors: VotePropositionAuthor[] = (existing?.authors ?? []).map(
    (a) => ({
      id: a.deputy.id,
      nome: a.deputy.nomeEleitoral || a.deputy.nome,
      siglaPartido: a.deputy.siglaPartido,
      siglaUf: a.deputy.siglaUf,
      proponente: a.proponente,
    }),
  );

  if (needsDetail) {
    try {
      const detail = await getProposition(id);
      ementa = ementa || detail.ementa || null;
      dataApresentacao = dataApresentacao || detail.dataApresentacao || null;
      statusResumo =
        statusResumo ||
        detail.statusProposicao?.descricaoSituacao ||
        detail.statusProposicao?.descricaoTramitacao ||
        null;
      siglaTipo = siglaTipo || detail.siglaTipo || null;
      numero = numero ?? detail.numero ?? null;
      ano = ano ?? detail.ano ?? null;
      await sleep(delay);
    } catch {
      // mantém o que já temos
    }
  }

  if (needsAuthors) {
    try {
      const authorList = await listPropositionAuthors(id);
      const resumoParts: string[] = [];
      const linked: VotePropositionAuthor[] = [];

      for (const author of authorList) {
        const deputyId = deputyIdFromAuthorUri(author.uri);
        const nome = author.nome?.trim() || "Autor não identificado";
        let partido: string | null = null;
        let uf: string | null = null;

        if (deputyId) {
          const deputy = await prisma.deputy.findUnique({
            where: { id: deputyId },
            select: {
              id: true,
              nome: true,
              nomeEleitoral: true,
              siglaPartido: true,
              siglaUf: true,
            },
          });
          if (deputy) {
            partido = deputy.siglaPartido;
            uf = deputy.siglaUf;
            await prisma.propositionAuthor.upsert({
              where: {
                propositionId_deputyId: {
                  propositionId: id,
                  deputyId,
                },
              },
              create: {
                propositionId: id,
                deputyId,
                proponente: Number(author.proponente ?? 0) === 1,
                ordemAssinatura: author.ordemAssinatura ?? null,
              },
              update: {
                proponente: Number(author.proponente ?? 0) === 1,
                ordemAssinatura: author.ordemAssinatura ?? null,
              },
            });
            linked.push({
              id: deputy.id,
              nome: deputy.nomeEleitoral || deputy.nome,
              siglaPartido: deputy.siglaPartido,
              siglaUf: deputy.siglaUf,
              proponente: Number(author.proponente ?? 0) === 1,
            });
          }
        }

        const partyBit = [partido, uf].filter(Boolean).join("-");
        const tipoBit = author.tipo ? ` · ${author.tipo}` : "";
        resumoParts.push(
          partyBit ? `${nome} (${partyBit})${tipoBit}` : `${nome}${tipoBit}`,
        );
      }

      authorsResumo = resumoParts.length > 0 ? resumoParts.join("; ") : null;
      if (linked.length > 0) authors = linked;
      await sleep(delay);
    } catch {
      // autoria fica para a ficha da Câmara
    }
  }

  await prisma.proposition.upsert({
    where: { id },
    create: {
      id,
      ementa,
      dataApresentacao,
      statusResumo,
      siglaTipo,
      numero,
      ano,
      authorsResumo,
      syncedAt: new Date(),
    },
    update: {
      ...(ementa ? { ementa } : {}),
      ...(dataApresentacao ? { dataApresentacao } : {}),
      ...(statusResumo ? { statusResumo } : {}),
      ...(siglaTipo ? { siglaTipo } : {}),
      ...(numero != null ? { numero } : {}),
      ...(ano != null ? { ano } : {}),
      ...(authorsResumo ? { authorsResumo } : {}),
      syncedAt: new Date(),
    },
  });

  return {
    id,
    ementa,
    dataApresentacao,
    statusResumo,
    siglaTipo,
    numero,
    ano,
    authorsResumo,
    authors,
  };
}

/**
 * Completa ementa, status, data e autoria via API da Câmara e grava no SQLite.
 * Usado na aba de votações quando a proposição veio só do vínculo bulk.
 */
export async function enrichPropositions(
  ids: number[],
): Promise<EnrichedProposition[]> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  const delay = Number(process.env.CAMARA_REQUEST_DELAY_MS ?? 200);
  const concurrency = Math.max(
    1,
    Number(process.env.PROPOSITION_ENRICH_CONCURRENCY ?? 3),
  );
  const results: EnrichedProposition[] = [];

  for (let i = 0; i < unique.length; i += concurrency) {
    const chunk = unique.slice(i, i + concurrency);
    const enriched = await Promise.all(
      chunk.map((id) => enrichOne(id, delay)),
    );
    results.push(...enriched);
  }

  return results;
}
