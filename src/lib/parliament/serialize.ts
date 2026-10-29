import type { StateDeputyDetail } from "@/lib/api/types";
import type { StateDeputyWithProfile } from "@/lib/sync/estadual";
import { getAssembly } from "./assemblies";

export function serializeStateDeputyDetail(
  row: StateDeputyWithProfile,
): StateDeputyDetail {
  const assembly = getAssembly(row.source);
  return {
    key: row.id,
    sphere: "estadual_deputado",
    source: row.source,
    id: row.id,
    externalId: row.externalId,
    nome: row.nome,
    nomeEleitoral: row.nomeEleitoral,
    siglaPartido: row.siglaPartido,
    siglaUf: row.uf,
    urlFoto: row.urlFoto,
    email: row.email,
    situacao: row.situacao,
    assemblyName: assembly?.name ?? row.source,
    coverage: assembly?.coverage ?? {
      search: true,
      profile: true,
      propositions: false,
      votes: false,
      attendance: false,
    },
    affiliations: (row.affiliations ?? []).map((a) => ({
      codigoPartido: a.codigoPartido,
      siglaPartido: a.siglaPartido,
      nomePartido: a.nomePartido,
      dataFiliacao: a.dataFiliacao,
      dataDesfiliacao: a.dataDesfiliacao,
    })),
    mandates: (row.mandates ?? []).map((m) => ({
      codigoMandato: m.codigoMandato,
      siglaUf: m.siglaUf,
      participacao: m.participacao,
      legislaturaInicio: m.legislaturaInicio,
      legislaturaFim: m.legislaturaFim,
      dataInicio: m.dataInicio,
      dataFim: m.dataFim,
    })),
    propositions: (row.propositions ?? []).map((p) => ({
      id: p.id,
      externalId: p.externalId,
      siglaTipo: p.siglaTipo,
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      dataApresentacao: p.dataApresentacao,
      statusResumo: p.statusResumo,
      urlPublica: p.urlPublica,
    })),
    profileSyncedAt: row.profileSyncedAt?.toISOString() ?? null,
    syncedAt: row.syncedAt?.toISOString() ?? null,
    href: `/parlamentares/${row.source}/${row.externalId}`,
  };
}
