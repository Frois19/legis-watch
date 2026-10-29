import { prisma } from "@/lib/db/prisma";
import { parliamentarianId } from "@/lib/parliament/types";
import {
  fetchSenatorProfileBundle,
  listSenadoresAtual,
} from "@/lib/senado/client";
import { withSyncRun } from "./run";

export async function syncSenadores() {
  return withSyncRun("senadores", async () => {
    const rows = await listSenadoresAtual();
    let upserted = 0;

    for (const row of rows) {
      const id = parliamentarianId("senado", row.externalId);
      await prisma.senator.upsert({
        where: { id },
        create: {
          id,
          source: "senado",
          externalId: row.externalId,
          nome: row.nome,
          nomeCivil: row.nomeCivil,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          siglaPartido: row.siglaPartido,
          siglaUf: row.siglaUf,
          email: row.email,
          urlFoto: row.urlFoto,
          urlPagina: row.urlPagina,
          situacao: row.situacao,
          participacao: row.participacao,
          rawJson: row.raw ? JSON.stringify(row.raw) : null,
          syncedAt: new Date(),
        },
        update: {
          nome: row.nome,
          nomeCivil: row.nomeCivil,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          siglaPartido: row.siglaPartido,
          siglaUf: row.siglaUf,
          email: row.email,
          urlFoto: row.urlFoto,
          urlPagina: row.urlPagina,
          situacao: row.situacao,
          participacao: row.participacao,
          rawJson: row.raw ? JSON.stringify(row.raw) : null,
          syncedAt: new Date(),
        },
      });
      upserted += 1;
    }

    return { senators: upserted };
  });
}

export async function syncSenatorProfile(codigo: string) {
  const externalId = String(codigo).trim();
  if (!externalId) throw new Error("codigo do senador obrigatório");

  return withSyncRun(`senador-perfil:${externalId}`, async () => {
    const id = parliamentarianId("senado", externalId);
    const senator = await prisma.senator.findUnique({ where: { id } });
    if (!senator) {
      throw new Error(
        `Senador ${externalId} não encontrado — rode npm run sync -- senadores`,
      );
    }

    const bundle = await fetchSenatorProfileBundle(externalId);

    await prisma.$transaction(async (tx) => {
      await tx.senatorAffiliation.deleteMany({ where: { senatorId: id } });
      if (bundle.affiliations.length > 0) {
        await tx.senatorAffiliation.createMany({
          data: bundle.affiliations.map((row) => ({
            senatorId: id,
            codigoPartido: row.codigoPartido,
            siglaPartido: row.siglaPartido,
            nomePartido: row.nomePartido,
            dataFiliacao: row.dataFiliacao,
            dataDesfiliacao: row.dataDesfiliacao,
          })),
        });
      }

      await tx.senatorMandate.deleteMany({ where: { senatorId: id } });
      if (bundle.mandates.length > 0) {
        await tx.senatorMandate.createMany({
          data: bundle.mandates.map((row) => ({
            senatorId: id,
            codigoMandato: row.codigoMandato,
            siglaUf: row.siglaUf,
            participacao: row.participacao,
            legislaturaInicio: row.legislaturaInicio,
            legislaturaFim: row.legislaturaFim,
            dataInicio: row.dataInicio,
            dataFim: row.dataFim,
          })),
        });
      }

      await tx.senatorMatter.deleteMany({ where: { senatorId: id } });
      if (bundle.matters.length > 0) {
        await tx.senatorMatter.createMany({
          data: bundle.matters.map((row) => ({
            id: `${id}:materia:${row.externalId}`,
            senatorId: id,
            externalId: row.externalId,
            siglaTipo: row.siglaTipo,
            numero: row.numero,
            ano: row.ano,
            ementa: row.ementa,
            dataApresentacao: row.dataApresentacao,
            identificacao: row.identificacao,
            autorPrincipal: row.autorPrincipal,
            urlPublica: row.urlPublica,
            syncedAt: new Date(),
          })),
        });
      }

      await tx.senatorVote.deleteMany({ where: { senatorId: id } });
      if (bundle.votes.length > 0) {
        await tx.senatorVote.createMany({
          data: bundle.votes.map((row) => ({
            id: `${id}:votacao:${row.externalId}`,
            senatorId: id,
            externalId: row.externalId,
            tipoVoto: row.tipoVoto,
            descricaoVotacao: row.descricaoVotacao,
            descricaoResultado: row.descricaoResultado,
            dataSessao: row.dataSessao,
            materiaExternalId: row.materiaExternalId,
            materiaIdentificacao: row.materiaIdentificacao,
            materiaEmenta: row.materiaEmenta,
            urlPublica: row.urlPublica,
            syncedAt: new Date(),
          })),
        });
      }

      await tx.senator.update({
        where: { id },
        data: { profileSyncedAt: new Date() },
      });
    });

    return {
      affiliations: bundle.affiliations.length,
      mandates: bundle.mandates.length,
      matters: bundle.matters.length,
      votes: bundle.votes.length,
    };
  });
}

function profileTtlMs() {
  return Number(process.env.SENADO_PROFILE_TTL_MS ?? 86_400_000);
}

export type SenatorWithProfile = NonNullable<
  Awaited<ReturnType<typeof loadSenatorWithProfile>>
>;

async function loadSenatorWithProfile(id: string) {
  return prisma.senator.findUnique({
    where: { id },
    include: {
      affiliations: { orderBy: { dataFiliacao: "desc" } },
      mandates: { orderBy: { dataInicio: "desc" } },
      matters: { orderBy: [{ ano: "desc" }, { numero: "desc" }] },
      votes: { orderBy: { dataSessao: "desc" } },
    },
  });
}

/** Garante filiações/mandatos/matérias no perfil (sync sob demanda + TTL). */
export async function ensureSenatorProfile(codigo: string) {
  const externalId = String(codigo).trim();
  const id = parliamentarianId("senado", externalId);
  const existing = await prisma.senator.findUnique({ where: { id } });
  if (!existing) return null;

  const ttl = profileTtlMs();
  const stale =
    !existing.profileSyncedAt ||
    Date.now() - existing.profileSyncedAt.getTime() > ttl;

  if (stale) {
    try {
      await syncSenatorProfile(externalId);
    } catch (error) {
      console.warn(
        `[senado] falha ao enriquecer perfil ${externalId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return loadSenatorWithProfile(id);
}
