import {
  getProposition,
  listPropositionAuthors,
  listPropositionsByAuthor,
} from "@/lib/camara/client";
import { prisma } from "@/lib/db/prisma";
import { withSyncRun } from "./run";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deputyIdFromAuthorUri(uri?: string): number | null {
  if (!uri) return null;
  const match = uri.match(/\/deputados\/(\d+)/);
  return match ? Number(match[1]) : null;
}

const DEFAULT_TYPES = ["PL", "PEC", "PLP", "PDC", "PLV", "PRC"];

export async function syncPropositionsForDeputy(deputyId: number) {
  return withSyncRun(`propositions:${deputyId}`, async () => {
    const types = (
      process.env.PROPOSITION_TYPES ?? DEFAULT_TYPES.join(",")
    ).split(",");
    const maxPages = Number(process.env.PROPOSITION_MAX_PAGES ?? 2);
    const enrichAuthors = process.env.PROPOSITION_ENRICH_AUTHORS === "1";

    const list: Awaited<ReturnType<typeof listPropositionsByAuthor>> = [];
    for (const siglaTipo of types) {
      const chunk = await listPropositionsByAuthor(deputyId, {
        siglaTipo: siglaTipo.trim(),
        itens: 100,
        maxPages,
      });
      list.push(...chunk);
      await sleep(Number(process.env.CAMARA_REQUEST_DELAY_MS ?? 400));
    }

    // Deduplicate by id
    const byId = new Map(list.map((p) => [p.id, p]));
    let propositions = 0;
    let authors = 0;

    for (const item of byId.values()) {
      await prisma.proposition.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          uri: item.uri,
          siglaTipo: item.siglaTipo,
          numero: item.numero,
          ano: item.ano,
          ementa: item.ementa,
          dataApresentacao: item.dataApresentacao,
          syncedAt: new Date(),
        },
        update: {
          uri: item.uri,
          siglaTipo: item.siglaTipo,
          numero: item.numero,
          ano: item.ano,
          ementa: item.ementa,
          dataApresentacao: item.dataApresentacao,
          syncedAt: new Date(),
        },
      });
      propositions += 1;

      await prisma.propositionAuthor.upsert({
        where: {
          propositionId_deputyId: {
            propositionId: item.id,
            deputyId,
          },
        },
        create: {
          propositionId: item.id,
          deputyId,
          proponente: true,
        },
        update: {},
      });
      authors += 1;

      if (enrichAuthors) {
        try {
          const detail = await getProposition(item.id);
          await prisma.proposition.update({
            where: { id: item.id },
            data: {
              statusResumo:
                detail.statusProposicao?.descricaoSituacao ??
                detail.statusProposicao?.descricaoTramitacao ??
                null,
            },
          });
          const authorList = await listPropositionAuthors(item.id);
          for (const author of authorList) {
            const id = deputyIdFromAuthorUri(author.uri);
            if (!id) continue;
            const exists = await prisma.deputy.findUnique({ where: { id } });
            if (!exists) continue;
            await prisma.propositionAuthor.upsert({
              where: {
                propositionId_deputyId: {
                  propositionId: item.id,
                  deputyId: id,
                },
              },
              create: {
                propositionId: item.id,
                deputyId: id,
                proponente: Number(author.proponente ?? 0) === 1,
                ordemAssinatura: author.ordemAssinatura,
              },
              update: {
                proponente: Number(author.proponente ?? 0) === 1,
                ordemAssinatura: author.ordemAssinatura,
              },
            });
            authors += 1;
          }
          await sleep(Number(process.env.CAMARA_REQUEST_DELAY_MS ?? 400));
        } catch {
          // optional enrichment
        }
      }
    }

    return { propositions, authors };
  });
}
