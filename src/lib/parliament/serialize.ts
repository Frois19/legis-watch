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
    dataMode: assembly?.dataMode ?? "fixture",
    isDemoData:
      (assembly?.dataMode ?? "fixture") === "fixture" ||
      (() => {
        try {
          const raw = row.rawJson ? JSON.parse(row.rawJson) : null;
          return Boolean(raw && typeof raw === "object" && raw.fixture);
        } catch {
          return false;
        }
      })(),
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
    attendance: (row.attendances ?? []).map((a) => ({
      dataSessao: a.dataSessao,
      year: a.year,
      status: a.status,
      observacao: a.observacao,
    })),
    attendanceSummary: (() => {
      const items = row.attendances ?? [];
      return {
        eventosConsiderados: items.length,
        presentes: items.filter((a) => a.status === "presente").length,
        justificados: items.filter((a) => a.status === "justificado").length,
        ausentes: items.filter((a) => a.status === "ausente").length,
      };
    })(),
    votes: (row.votes ?? []).map((v) => ({
      id: v.id,
      externalId: v.externalId,
      tipoVoto: v.tipoVoto,
      descricaoVotacao: v.descricaoVotacao,
      descricaoResultado: v.descricaoResultado,
      dataSessao: v.dataSessao,
      materiaExternalId: v.materiaExternalId,
      materiaIdentificacao: v.materiaIdentificacao,
      materiaEmenta: v.materiaEmenta,
      urlPublica: v.urlPublica,
    })),
    profileSyncedAt: row.profileSyncedAt?.toISOString() ?? null,
    syncedAt: row.syncedAt?.toISOString() ?? null,
    href: `/parlamentares/${row.source}/${row.externalId}`,
  };
}
