import { prisma } from "@/lib/db/prisma";
import {
  getStateAdapter,
  listStateAdapterSources,
} from "@/lib/parliament/adapters";
import { parliamentarianId } from "@/lib/parliament/types";
import { withSyncRun } from "./run";

export async function syncStateAssembly(source: string) {
  const adapter = getStateAdapter(source);
  if (!adapter) {
    throw new Error(`assembly_adapter_not_found:${source}`);
  }

  return withSyncRun(`estadual:${source}`, async () => {
    const rows = await adapter.listParliamentarians();
    let upserted = 0;

    for (const row of rows) {
      const id = parliamentarianId(adapter.info.source, row.externalId);
      await prisma.stateDeputy.upsert({
        where: { id },
        create: {
          id,
          source: adapter.info.source,
          externalId: row.externalId,
          uf: adapter.info.uf,
          nome: row.nome,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          siglaPartido: row.siglaPartido,
          email: row.email,
          urlFoto: row.urlFoto,
          situacao: row.situacao,
          rawJson: row.raw ? JSON.stringify(row.raw) : null,
          syncedAt: new Date(),
        },
        update: {
          nome: row.nome,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          siglaPartido: row.siglaPartido,
          email: row.email,
          urlFoto: row.urlFoto,
          situacao: row.situacao,
          rawJson: row.raw ? JSON.stringify(row.raw) : null,
          syncedAt: new Date(),
        },
      });
      upserted += 1;
    }

    return { parliamentarians: upserted };
  });
}

/** Sincroniza todas as casas estaduais registradas. */
export async function syncAllStateAssemblies() {
  const sources = listStateAdapterSources();
  let parliamentarians = 0;
  let assemblies = 0;
  const failures: string[] = [];

  for (const source of sources) {
    try {
      const result = await syncStateAssembly(source);
      parliamentarians += result.parliamentarians;
      assemblies += 1;
    } catch (error) {
      failures.push(
        `${source}:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failures.length > 0 && assemblies === 0) {
    throw new Error(`estadual_sync_all_failed:${failures.join("|")}`);
  }

  return {
    assemblies,
    parliamentarians,
    failures: failures.length,
  };
}

export async function syncStateDeputyProfile(
  source: string,
  externalId: string,
) {
  const adapter = getStateAdapter(source);
  if (!adapter) throw new Error(`assembly_adapter_not_found:${source}`);
  if (!adapter.fetchProfileBundle) {
    throw new Error(`assembly_profile_unsupported:${source}`);
  }

  const codigo = String(externalId).trim();
  return withSyncRun(`estadual-perfil:${source}:${codigo}`, async () => {
    const id = parliamentarianId(source, codigo);
    const deputy = await prisma.stateDeputy.findUnique({ where: { id } });
    if (!deputy) {
      throw new Error(
        `Deputado estadual ${source}:${codigo} não encontrado — rode npm run sync -- estadual --source=${source}`,
      );
    }

    const detail = adapter.getParliamentarian
      ? await adapter.getParliamentarian(codigo).catch(() => null)
      : null;
    const bundle = await adapter.fetchProfileBundle(codigo);

    await prisma.$transaction(async (tx) => {
      if (detail) {
        await tx.stateDeputy.update({
          where: { id },
          data: {
            nome: detail.nome || undefined,
            nomeEleitoral: detail.nomeEleitoral ?? detail.nome,
            siglaPartido: detail.siglaPartido ?? deputy.siglaPartido,
            email: detail.email ?? deputy.email,
            urlFoto: detail.urlFoto ?? deputy.urlFoto,
            situacao: detail.situacao ?? deputy.situacao,
          },
        });
      }

      await tx.stateDeputyAffiliation.deleteMany({
        where: { stateDeputyId: id },
      });
      if (bundle.affiliations.length > 0) {
        await tx.stateDeputyAffiliation.createMany({
          data: bundle.affiliations.map((row) => ({
            stateDeputyId: id,
            codigoPartido: row.codigoPartido,
            siglaPartido: row.siglaPartido,
            nomePartido: row.nomePartido,
            dataFiliacao: row.dataFiliacao,
            dataDesfiliacao: row.dataDesfiliacao,
          })),
        });
      }

      await tx.stateDeputyMandate.deleteMany({ where: { stateDeputyId: id } });
      if (bundle.mandates.length > 0) {
        await tx.stateDeputyMandate.createMany({
          data: bundle.mandates.map((row) => ({
            stateDeputyId: id,
            codigoMandato: row.codigoMandato,
            siglaUf: row.siglaUf ?? adapter.info.uf,
            participacao: row.participacao,
            legislaturaInicio: row.legislaturaInicio,
            legislaturaFim: row.legislaturaFim,
            dataInicio: row.dataInicio,
            dataFim: row.dataFim,
          })),
        });
      }

      await tx.stateProposition.deleteMany({ where: { stateDeputyId: id } });
      if (bundle.propositions.length > 0) {
        await tx.stateProposition.createMany({
          data: bundle.propositions.map((row) => ({
            id: `${source}:prop:${row.externalId}`,
            source,
            externalId: row.externalId,
            stateDeputyId: id,
            siglaTipo: row.siglaTipo ?? null,
            numero: row.numero ?? null,
            ano: row.ano ?? null,
            ementa: row.ementa ?? null,
            dataApresentacao: row.dataApresentacao ?? null,
            statusResumo: row.statusResumo ?? null,
            urlPublica: row.urlPublica ?? null,
            syncedAt: new Date(),
          })),
        });
      }

      await tx.stateDeputy.update({
        where: { id },
        data: { profileSyncedAt: new Date() },
      });
    });

    return {
      affiliations: bundle.affiliations.length,
      mandates: bundle.mandates.length,
      propositions: bundle.propositions.length,
    };
  });
}

function profileTtlMs() {
  return Number(process.env.ESTADUAL_PROFILE_TTL_MS ?? 86_400_000);
}

export type StateDeputyWithProfile = NonNullable<
  Awaited<ReturnType<typeof loadStateDeputyWithProfile>>
>;

async function loadStateDeputyWithProfile(id: string) {
  return prisma.stateDeputy.findUnique({
    where: { id },
    include: {
      affiliations: { orderBy: { dataFiliacao: "desc" } },
      mandates: { orderBy: { dataInicio: "desc" } },
      propositions: { orderBy: [{ ano: "desc" }, { numero: "desc" }] },
    },
  });
}

/** Garante filiações/mandatos/matérias no perfil estadual (TTL). */
export async function ensureStateDeputyProfile(
  source: string,
  externalId: string,
) {
  const id = parliamentarianId(source, String(externalId).trim());
  const existing = await prisma.stateDeputy.findUnique({ where: { id } });
  if (!existing) return null;

  const adapter = getStateAdapter(source);
  if (!adapter?.fetchProfileBundle) {
    return loadStateDeputyWithProfile(id);
  }

  const ttl = profileTtlMs();
  const stale =
    !existing.profileSyncedAt ||
    Date.now() - existing.profileSyncedAt.getTime() > ttl;

  if (stale) {
    try {
      await syncStateDeputyProfile(source, externalId);
    } catch (error) {
      console.warn(
        `[estadual] falha ao enriquecer ${source}:${externalId}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return loadStateDeputyWithProfile(id);
}
