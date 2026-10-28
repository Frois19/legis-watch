import { downloadVotes, downloadVoteSessions } from "@/lib/camara/client";
import { prisma } from "@/lib/db/prisma";
import { withSyncRun } from "./run";

function propositionIdFromUri(uri?: string | null): number | null {
  if (!uri) return null;
  const match = uri.match(/\/proposicoes\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export async function syncVotesForYear(year: number) {
  return withSyncRun(`votes:${year}`, async () => {
    const sessions = await downloadVoteSessions(year);
    const votes = await downloadVotes(year);

    let sessionsUpserted = 0;
    let votesUpserted = 0;
    let votesSkipped = 0;

    for (const session of sessions) {
      const id = String(session.id);
      const propositionId =
        session.proposicaoId ??
        propositionIdFromUri(session.uriProposicaoPrincipal);

      if (propositionId) {
        const exists = await prisma.proposition.findUnique({
          where: { id: propositionId },
        });
        if (!exists) {
          await prisma.proposition.create({
            data: {
              id: propositionId,
              uri: session.uriProposicaoPrincipal,
              syncedAt: new Date(),
            },
          });
        }
      }

      const aprovacao =
        typeof session.aprovacao === "boolean"
          ? session.aprovacao
          : session.aprovacao == null
            ? null
            : Number(session.aprovacao) === 1;

      await prisma.voteSession.upsert({
        where: { id },
        create: {
          id,
          dataHoraRegistro: session.dataHoraRegistro,
          descricao: session.descricao,
          aprovacao,
          uriProposicaoPrincipal: session.uriProposicaoPrincipal,
          propositionId: propositionId ?? undefined,
          siglaOrgao: session.siglaOrgao,
          year,
          syncedAt: new Date(),
        },
        update: {
          dataHoraRegistro: session.dataHoraRegistro,
          descricao: session.descricao,
          aprovacao,
          uriProposicaoPrincipal: session.uriProposicaoPrincipal,
          propositionId: propositionId ?? undefined,
          siglaOrgao: session.siglaOrgao,
          year,
          syncedAt: new Date(),
        },
      });
      sessionsUpserted += 1;
    }

    const deputyIds = new Set(
      (await prisma.deputy.findMany({ select: { id: true } })).map((d) => d.id),
    );
    const sessionIds = new Set(
      (await prisma.voteSession.findMany({ select: { id: true } })).map(
        (s) => s.id,
      ),
    );

    // Batch in chunks for SQLite
    const chunkSize = 500;
    for (let i = 0; i < votes.length; i += chunkSize) {
      const chunk = votes.slice(i, i + chunkSize);
      for (const vote of chunk) {
        const voteSessionId = String(vote.idVotacao ?? "");
        const deputyId = vote.idDeputado ?? vote.deputado_?.id;
        if (!voteSessionId || !deputyId || !vote.voto) {
          votesSkipped += 1;
          continue;
        }
        if (!deputyIds.has(deputyId) || !sessionIds.has(voteSessionId)) {
          votesSkipped += 1;
          continue;
        }

        await prisma.vote.upsert({
          where: {
            voteSessionId_deputyId: { voteSessionId, deputyId },
          },
          create: {
            voteSessionId,
            deputyId,
            tipoVoto: vote.voto,
            dataRegistro: vote.dataHoraRegistro,
            year,
          },
          update: {
            tipoVoto: vote.voto,
            dataRegistro: vote.dataHoraRegistro,
            year,
          },
        });
        votesUpserted += 1;
      }
    }

    return { sessions: sessionsUpserted, votes: votesUpserted, votesSkipped };
  });
}
