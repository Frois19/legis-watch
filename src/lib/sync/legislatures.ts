import {
  currentLegislatura,
  getDeputyHistorico,
  listDeputies,
  listLegislatures,
  listParties,
  partyIdFromUri,
} from "@/lib/camara/client";
import { resolveDeputyPhotoUrl } from "@/lib/camara/photo";
import { prisma } from "@/lib/db/prisma";
import { withSyncRun } from "./run";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncLegislatures() {
  return withSyncRun("legislatures", async () => {
    const items = await listLegislatures();
    let upserted = 0;

    for (const item of items) {
      if (!item.id || !item.dataInicio || !item.dataFim) continue;
      await prisma.legislature.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          uri: item.uri,
          dataInicio: item.dataInicio,
          dataFim: item.dataFim,
          syncedAt: new Date(),
        },
        update: {
          uri: item.uri,
          dataInicio: item.dataInicio,
          dataFim: item.dataFim,
          syncedAt: new Date(),
        },
      });
      upserted += 1;
    }

    return { legislatures: upserted };
  });
}

async function resolvePartyId(
  sigla: string | undefined,
  uriPartido: string | undefined,
  legislaturaId: number,
) {
  const fromUri = partyIdFromUri(uriPartido);
  if (fromUri) return fromUri;
  if (!sigla) return null;
  const party = await prisma.party.findFirst({
    where: { sigla, legislaturaId },
    select: { id: true },
  });
  return party?.id ?? null;
}

export async function upsertDeputyMandate(input: {
  deputyId: number;
  legislaturaId: number;
  siglaPartido?: string | null;
  uriPartido?: string | null;
  siglaUf?: string | null;
  situacao?: string | null;
  condicaoEleitoral?: string | null;
  nomeEleitoral?: string | null;
}) {
  const legislature = await prisma.legislature.findUnique({
    where: { id: input.legislaturaId },
  });
  if (!legislature) {
    throw new Error(`Legislatura ${input.legislaturaId} não sincronizada`);
  }

  const partyId = await resolvePartyId(
    input.siglaPartido ?? undefined,
    input.uriPartido ?? undefined,
    input.legislaturaId,
  );

  await prisma.deputyMandate.upsert({
    where: {
      deputyId_legislaturaId: {
        deputyId: input.deputyId,
        legislaturaId: input.legislaturaId,
      },
    },
    create: {
      deputyId: input.deputyId,
      legislaturaId: input.legislaturaId,
      siglaPartido: input.siglaPartido ?? null,
      partyId: partyId ?? undefined,
      siglaUf: input.siglaUf ?? null,
      situacao: input.situacao ?? null,
      condicaoEleitoral: input.condicaoEleitoral ?? null,
      nomeEleitoral: input.nomeEleitoral ?? null,
      syncedAt: new Date(),
    },
    update: {
      siglaPartido: input.siglaPartido ?? null,
      partyId: partyId ?? undefined,
      siglaUf: input.siglaUf ?? null,
      situacao: input.situacao ?? null,
      condicaoEleitoral: input.condicaoEleitoral ?? null,
      nomeEleitoral: input.nomeEleitoral ?? null,
      syncedAt: new Date(),
    },
  });
}

/** Consolida o histórico da Câmara em um mandato por legislatura. */
export async function syncMandatesForDeputy(deputyId: number) {
  return withSyncRun(`mandates:${deputyId}`, async () => {
    const history = await getDeputyHistorico(deputyId);
    const byLeg = new Map<
      number,
      {
        siglaPartido?: string;
        uriPartido?: string;
        siglaUf?: string;
        situacao?: string;
        condicaoEleitoral?: string;
        nomeEleitoral?: string;
        dataHora?: string;
      }
    >();

    for (const row of history) {
      const legislaturaId = row.idLegislatura;
      if (!legislaturaId) continue;
      const existing = byLeg.get(legislaturaId);
      const rowTime = row.dataHora ?? "";
      if (!existing || rowTime >= (existing.dataHora ?? "")) {
        byLeg.set(legislaturaId, {
          siglaPartido: row.siglaPartido,
          uriPartido: row.uriPartido,
          siglaUf: row.siglaUf,
          situacao: row.situacao,
          condicaoEleitoral: row.condicaoEleitoral,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          dataHora: row.dataHora,
        });
      }
    }

    let mandates = 0;
    for (const [legislaturaId, row] of byLeg) {
      const exists = await prisma.legislature.findUnique({
        where: { id: legislaturaId },
        select: { id: true },
      });
      if (!exists) continue;

      const deputy = await prisma.deputy.findUnique({
        where: { id: deputyId },
        select: { id: true },
      });
      if (!deputy) continue;

      await upsertDeputyMandate({
        deputyId,
        legislaturaId,
        ...row,
      });
      mandates += 1;
    }

    return { mandates, historyEvents: history.length };
  });
}

/**
 * Sincroniza cadastro + mandatos de uma legislatura.
 * Não sobrescreve partido/UF atuais do Deputado quando a legislatura não é a vigente.
 */
export async function syncDeputiesForLegislature(legislaturaId: number) {
  return withSyncRun(`deputies:${legislaturaId}`, async () => {
    const current = currentLegislatura();
    const parties = await listParties(legislaturaId);
    let partiesUpserted = 0;
    for (const party of parties) {
      await prisma.party.upsert({
        where: { id: party.id },
        create: {
          id: party.id,
          sigla: party.sigla ?? "?",
          nome: party.nome,
          uri: party.uri,
          legislaturaId: party.idLegislatura ?? legislaturaId,
        },
        update: {
          sigla: party.sigla ?? "?",
          nome: party.nome,
          uri: party.uri,
          legislaturaId: party.idLegislatura ?? legislaturaId,
        },
      });
      partiesUpserted += 1;
    }

    const list = await listDeputies({ idLegislatura: legislaturaId });
    let deputies = 0;
    let mandates = 0;

    for (const item of list) {
      const partyId = await resolvePartyId(
        item.siglaPartido,
        item.uriPartido,
        legislaturaId,
      );

      const existing = await prisma.deputy.findUnique({
        where: { id: item.id },
        select: { id: true },
      });

      if (!existing) {
        await prisma.deputy.create({
          data: {
            id: item.id,
            uri: item.uri,
            nome: item.nome,
            siglaPartido: item.siglaPartido,
            partyId: partyId ?? undefined,
            siglaUf: item.siglaUf,
            legislaturaId,
            urlFoto: resolveDeputyPhotoUrl(item.id, item.urlFoto),
            email: item.email,
            syncedAt: new Date(),
          },
        });
        deputies += 1;
      } else if (legislaturaId === current) {
        await prisma.deputy.update({
          where: { id: item.id },
          data: {
            uri: item.uri,
            nome: item.nome,
            siglaPartido: item.siglaPartido,
            partyId: partyId ?? undefined,
            siglaUf: item.siglaUf,
            legislaturaId,
            urlFoto: resolveDeputyPhotoUrl(item.id, item.urlFoto),
            email: item.email,
            syncedAt: new Date(),
          },
        });
        deputies += 1;
      }

      await upsertDeputyMandate({
        deputyId: item.id,
        legislaturaId,
        siglaPartido: item.siglaPartido,
        uriPartido: item.uriPartido,
        siglaUf: item.siglaUf,
        nomeEleitoral: item.nome,
      });
      mandates += 1;
    }

    return {
      parties: partiesUpserted,
      deputies,
      mandates,
      listed: list.length,
    };
  });
}

export async function syncMandatesForDeputies(deputyIds: number[]) {
  const results = [];
  for (const deputyId of deputyIds) {
    results.push({
      deputyId,
      ...(await syncMandatesForDeputy(deputyId)),
    });
    await sleep(Number(process.env.CAMARA_REQUEST_DELAY_MS ?? 300));
  }
  return results;
}
