import type { SenatorDetail } from "@/lib/api/types";
import type { SenatorWithProfile } from "@/lib/sync/senado";
import {
  SENADO_ATTENDANCE_DISCLAIMER,
  SENADO_COVERAGE,
} from "./types";

export function serializeSenatorDetail(
  row: SenatorWithProfile,
): SenatorDetail {
  return {
    key: row.id,
    sphere: "senador",
    source: "senado",
    id: row.id,
    externalId: row.externalId,
    nome: row.nome,
    nomeCivil: row.nomeCivil,
    nomeEleitoral: row.nomeEleitoral,
    siglaPartido: row.siglaPartido,
    siglaUf: row.siglaUf,
    urlFoto: row.urlFoto,
    urlPagina: row.urlPagina,
    email: row.email,
    situacao: row.situacao,
    participacao: row.participacao,
    assemblyName: "Senado Federal",
    coverage: SENADO_COVERAGE,
    attendanceDisclaimer: SENADO_ATTENDANCE_DISCLAIMER,
    affiliations: row.affiliations.map((a) => ({
      codigoPartido: a.codigoPartido,
      siglaPartido: a.siglaPartido,
      nomePartido: a.nomePartido,
      dataFiliacao: a.dataFiliacao,
      dataDesfiliacao: a.dataDesfiliacao,
    })),
    mandates: row.mandates.map((m) => ({
      codigoMandato: m.codigoMandato,
      siglaUf: m.siglaUf,
      participacao: m.participacao,
      legislaturaInicio: m.legislaturaInicio,
      legislaturaFim: m.legislaturaFim,
      dataInicio: m.dataInicio,
      dataFim: m.dataFim,
    })),
    matters: row.matters.map((m) => ({
      id: m.id,
      externalId: m.externalId,
      siglaTipo: m.siglaTipo,
      numero: m.numero,
      ano: m.ano,
      ementa: m.ementa,
      dataApresentacao: m.dataApresentacao,
      identificacao: m.identificacao,
      autorPrincipal: m.autorPrincipal,
      urlPublica: m.urlPublica,
    })),
    profileSyncedAt: row.profileSyncedAt?.toISOString() ?? null,
    syncedAt: row.syncedAt?.toISOString() ?? null,
    href: `/parlamentares/senado/${row.externalId}`,
  };
}
