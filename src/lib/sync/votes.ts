import {
  downloadVotePropositions,
  downloadVotes,
  downloadVoteSessions,
} from "@/lib/camara/client";
import { prisma } from "@/lib/db/prisma";
import { withSyncRun } from "./run";

function toInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function createManyChunks<T extends object>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
  chunkSize = 1000,
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insert(rows.slice(i, i + chunkSize));
  }
}

export async function syncVotesForYear(year: number) {
  return withSyncRun(`votes:${year}`, async () => {
    console.log(`[votes:${year}] baixando arquivos…`);
    const [sessions, votes, voteProps] = await Promise.all([
      downloadVoteSessions(year),
      downloadVotes(year),
      downloadVotePropositions(year),
    ]);
    console.log(
      `[votes:${year}] sessions=${sessions.length} votes=${votes.length} links=${voteProps.length}`,
    );

    const propositionBySession = new Map<
      string,
      {
        id: number;
        uri?: string;
        siglaTipo?: string;
        numero?: number;
        ano?: number;
        ementa?: string;
      }
    >();

    for (const row of voteProps) {
      const sessionId = String(row.idVotacao ?? "");
      const propId = toInt(row.proposicao_?.id);
      if (!sessionId || !propId) continue;
      if (propositionBySession.has(sessionId)) continue;
      propositionBySession.set(sessionId, {
        id: propId,
        uri: row.proposicao_?.uri,
        siglaTipo: row.proposicao_?.siglaTipo,
        numero: row.proposicao_?.numero,
        ano: row.proposicao_?.ano,
        ementa: row.proposicao_?.ementa,
      });
    }

    // Also pick from session.ultimaApresentacaoProposicao when present
    for (const session of sessions) {
      const sessionId = String(session.id);
      if (propositionBySession.has(sessionId)) continue;
      const propId = toInt(session.ultimaApresentacaoProposicao?.idProposicao);
      if (!propId) continue;
      propositionBySession.set(sessionId, {
        id: propId,
        uri: session.ultimaApresentacaoProposicao?.uriProposicao,
      });
    }

    const propositions = Array.from(
      new Map(
        [...propositionBySession.values()].map((p) => [p.id, p]),
      ).values(),
    );

    const existingPropIds = new Set(
      (
        await prisma.proposition.findMany({
          where: { id: { in: propositions.map((p) => p.id) } },
          select: { id: true },
        })
      ).map((p) => p.id),
    );
    const newPropositions = propositions.filter(
      (p) => !existingPropIds.has(p.id),
    );

    await createManyChunks(newPropositions, (chunk) =>
      prisma.proposition.createMany({
        data: chunk.map((p) => ({
          id: p.id,
          uri: p.uri,
          siglaTipo: p.siglaTipo,
          numero: p.numero,
          ano: p.ano,
          ementa: p.ementa,
          syncedAt: new Date(),
        })),
      }),
    );

    // Replace year vote rows for idempotent re-sync
    await prisma.vote.deleteMany({ where: { year } });
    await prisma.voteSession.deleteMany({ where: { year } });

    const sessionRows = sessions.map((session) => {
      const id = String(session.id);
      const linked = propositionBySession.get(id);
      const aprovacao =
        typeof session.aprovacao === "boolean"
          ? session.aprovacao
          : session.aprovacao == null
            ? null
            : Number(session.aprovacao) === 1;

      return {
        id,
        dataHoraRegistro: session.dataHoraRegistro ?? null,
        descricao: session.descricao ?? null,
        aprovacao,
        uriProposicaoPrincipal: linked?.uri ?? null,
        propositionId: linked?.id ?? null,
        siglaOrgao: session.siglaOrgao ?? null,
        year,
        syncedAt: new Date(),
      };
    });

    await createManyChunks(sessionRows, (chunk) =>
      prisma.voteSession.createMany({ data: chunk }),
    );

    const deputyIds = new Set(
      (await prisma.deputy.findMany({ select: { id: true } })).map((d) => d.id),
    );
    const sessionIds = new Set(sessionRows.map((s) => s.id));

    const voteRows: Array<{
      voteSessionId: string;
      deputyId: number;
      tipoVoto: string;
      dataRegistro: string | null;
      year: number;
    }> = [];
    let votesSkipped = 0;

    for (const vote of votes) {
      const voteSessionId = String(vote.idVotacao ?? "");
      const deputyId = toInt(vote.idDeputado ?? vote.deputado_?.id);
      if (!voteSessionId || !deputyId || !vote.voto) {
        votesSkipped += 1;
        continue;
      }
      if (!deputyIds.has(deputyId) || !sessionIds.has(voteSessionId)) {
        votesSkipped += 1;
        continue;
      }
      voteRows.push({
        voteSessionId,
        deputyId,
        tipoVoto: vote.voto,
        dataRegistro: vote.dataHoraVoto ?? vote.dataHoraRegistro ?? null,
        year,
      });
    }

    // Deduplicate unique(voteSessionId, deputyId)
    const uniqueVotes = Array.from(
      new Map(
        voteRows.map((v) => [`${v.voteSessionId}:${v.deputyId}`, v]),
      ).values(),
    );

    await createManyChunks(uniqueVotes, (chunk) =>
      prisma.vote.createMany({ data: chunk }),
    );

    console.log(
      `[votes:${year}] ok sessions=${sessionRows.length} votes=${uniqueVotes.length} skipped=${votesSkipped}`,
    );

    return {
      sessions: sessionRows.length,
      votes: uniqueVotes.length,
      votesSkipped,
      propositions: propositions.length,
    };
  });
}
