import { resolveDeputyPhotoUrl } from "@/lib/camara/photo";
import { prisma } from "@/lib/db/prisma";
import { camaraPropositionUrl } from "@/lib/format";
import {
  defaultLegislaturaId,
  formatLegislaturaLabel,
  yearsForLegislature,
} from "@/lib/legislatures";
import { isApprovedPropositionStatus } from "@/lib/propositions/status";
import type {
  AttendanceResponse,
  DeputyDetail,
  LegislatureItem,
  MandateItem,
  Paginated,
  PropositionItem,
  PropositionStats,
  VoteItem,
} from "./types";

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function listLegislatures(): Promise<LegislatureItem[]> {
  const rows = await prisma.legislature.findMany({
    orderBy: { id: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    dataInicio: row.dataInicio,
    dataFim: row.dataFim,
    label: formatLegislaturaLabel(row),
  }));
}

async function getLegislatureOrThrow(id: number) {
  const row = await prisma.legislature.findUnique({ where: { id } });
  if (!row) throw new Error("legislature_not_found");
  return row;
}

function mandateFromRow(row: {
  legislaturaId: number;
  siglaPartido: string | null;
  siglaUf: string | null;
  situacao: string | null;
  condicaoEleitoral: string | null;
  nomeEleitoral: string | null;
  legislature: { dataInicio: string; dataFim: string };
}): MandateItem {
  return {
    legislaturaId: row.legislaturaId,
    siglaPartido: row.siglaPartido,
    siglaUf: row.siglaUf,
    situacao: row.situacao,
    condicaoEleitoral: row.condicaoEleitoral,
    nomeEleitoral: row.nomeEleitoral,
    dataInicio: row.legislature.dataInicio,
    dataFim: row.legislature.dataFim,
    label: formatLegislaturaLabel({
      id: row.legislaturaId,
      dataInicio: row.legislature.dataInicio,
      dataFim: row.legislature.dataFim,
    }),
  };
}

export async function getDeputy(
  id: number,
  legislaturaId?: number | null,
): Promise<DeputyDetail> {
  const deputy = await prisma.deputy.findUnique({
    where: { id },
    include: {
      party: true,
      mandates: {
        include: { legislature: true },
        orderBy: { legislaturaId: "desc" },
      },
    },
  });

  if (!deputy) {
    throw new Error("not_found");
  }

  const mandates = deputy.mandates.map(mandateFromRow);
  const preferred =
    legislaturaId && mandates.some((m) => m.legislaturaId === legislaturaId)
      ? legislaturaId
      : deputy.legislaturaId &&
          mandates.some((m) => m.legislaturaId === deputy.legislaturaId)
        ? deputy.legislaturaId
        : (mandates[0]?.legislaturaId ??
          deputy.legislaturaId ??
          defaultLegislaturaId());

  const selectedMandate =
    mandates.find((m) => m.legislaturaId === preferred) ?? null;

  const partyIdForMembers =
    selectedMandate?.legislaturaId != null
      ? (
          await prisma.deputyMandate.findUnique({
            where: {
              deputyId_legislaturaId: {
                deputyId: id,
                legislaturaId: selectedMandate.legislaturaId,
              },
            },
            select: { partyId: true },
          })
        )?.partyId
      : deputy.partyId;

  const partyMembers = partyIdForMembers
    ? await prisma.deputy.findMany({
        where: {
          id: { not: deputy.id },
          OR: [
            {
              mandates: {
                some: {
                  legislaturaId: preferred,
                  partyId: partyIdForMembers,
                },
              },
            },
            {
              partyId: partyIdForMembers,
              legislaturaId: preferred,
            },
          ],
        },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, siglaUf: true, urlFoto: true },
        take: 100,
      })
    : [];

  const party =
    selectedMandate?.siglaPartido != null
      ? await prisma.party.findFirst({
          where: {
            legislaturaId: preferred,
            sigla: selectedMandate.siglaPartido,
          },
        })
      : deputy.party;

  return {
    id: deputy.id,
    nome: deputy.nome,
    nomeCivil: deputy.nomeCivil,
    nomeEleitoral:
      selectedMandate?.nomeEleitoral ??
      deputy.nomeEleitoral ??
      deputy.nome,
    siglaPartido: selectedMandate?.siglaPartido ?? deputy.siglaPartido,
    siglaUf: selectedMandate?.siglaUf ?? deputy.siglaUf,
    legislaturaId: preferred,
    urlFoto: resolveDeputyPhotoUrl(deputy.id, deputy.urlFoto),
    email: deputy.email,
    situacao: selectedMandate?.situacao ?? deputy.situacao,
    condicaoEleitoral:
      selectedMandate?.condicaoEleitoral ?? deputy.condicaoEleitoral,
    dataNascimento: deputy.dataNascimento,
    municipioNascimento: deputy.municipioNascimento,
    escolaridade: deputy.escolaridade,
    redesSociais: parseJsonArray(deputy.redesSociais),
    gabinete: parseJsonObject(deputy.gabineteJson),
    party: party
      ? {
          id: party.id,
          sigla: party.sigla,
          nome: party.nome,
          uri: party.uri,
          legislaturaId: party.legislaturaId,
        }
      : null,
    partyMembers: partyMembers.map((m) => ({
      ...m,
      urlFoto: resolveDeputyPhotoUrl(m.id, m.urlFoto),
    })),
    mandates,
    selectedLegislaturaId: preferred,
    syncedAt: deputy.syncedAt?.toISOString() ?? null,
  };
}

function propositionWhere(
  deputyId: number,
  range?: { dataInicio: string; dataFim: string; years: number[] } | null,
) {
  if (!range) {
    return { authors: { some: { deputyId } } };
  }

  return {
    authors: { some: { deputyId } },
    OR: [
      {
        AND: [
          { dataApresentacao: { gte: range.dataInicio } },
          { dataApresentacao: { lte: `${range.dataFim}T23:59:59` } },
        ],
      },
      {
        AND: [
          { OR: [{ dataApresentacao: null }, { dataApresentacao: "" }] },
          { ano: { in: range.years } },
        ],
      },
    ],
  };
}

export async function getDeputyPropositions(
  deputyId: number,
  pageSize = 20,
  legislaturaId?: number | null,
): Promise<Paginated<PropositionItem> & { stats: PropositionStats }> {
  let range: { dataInicio: string; dataFim: string; years: number[] } | null =
    null;
  if (legislaturaId) {
    const legislature = await getLegislatureOrThrow(legislaturaId);
    range = {
      dataInicio: legislature.dataInicio,
      dataFim: legislature.dataFim,
      years: yearsForLegislature(legislature),
    };
  }

  const where = propositionWhere(deputyId, range);
  const [total, items, statusRows] = await Promise.all([
    prisma.proposition.count({ where }),
    prisma.proposition.findMany({
      where,
      orderBy: [{ ano: "desc" }, { numero: "desc" }, { id: "desc" }],
      take: pageSize,
      include: {
        authors: {
          where: { deputyId },
          select: { proponente: true },
        },
      },
    }),
    prisma.proposition.findMany({
      where,
      select: { statusResumo: true },
    }),
  ]);

  const aprovados = statusRows.filter((p) =>
    isApprovedPropositionStatus(p.statusResumo),
  ).length;

  return {
    page: 1,
    pageSize,
    total,
    stats: {
      apresentados: total,
      aprovados,
    },
    items: items.map((p) => ({
      id: p.id,
      uri: p.uri,
      siglaTipo: p.siglaTipo,
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      dataApresentacao: p.dataApresentacao,
      statusResumo: p.statusResumo,
      proponente: p.authors[0]?.proponente ?? false,
      urlCamara: camaraPropositionUrl(p.id),
    })),
  };
}

export async function getDeputyVotes(
  deputyId: number,
  pageSize = 20,
  legislaturaId?: number | null,
): Promise<Paginated<VoteItem>> {
  let years: number[] | undefined;
  if (legislaturaId) {
    const legislature = await getLegislatureOrThrow(legislaturaId);
    years = yearsForLegislature(legislature);
  }

  const where = {
    deputyId,
    ...(years ? { year: { in: years } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.vote.count({ where }),
    prisma.vote.findMany({
      where,
      orderBy: [{ dataRegistro: "desc" }, { id: "desc" }],
      take: pageSize,
      include: {
        voteSession: {
          include: {
            proposition: {
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
            },
          },
        },
      },
    }),
  ]);

  return {
    page: 1,
    pageSize,
    total,
    items: items.map((v) => {
      const prop = v.voteSession.proposition;
      return {
        id: v.id,
        tipoVoto: v.tipoVoto,
        dataRegistro: v.dataRegistro,
        year: v.year,
        votacao: {
          id: v.voteSession.id,
          descricao: v.voteSession.descricao,
          dataHoraRegistro: v.voteSession.dataHoraRegistro,
          aprovacao: v.voteSession.aprovacao,
          siglaOrgao: v.voteSession.siglaOrgao,
        },
        proposicao: prop
          ? {
              id: prop.id,
              uri: prop.uri,
              siglaTipo: prop.siglaTipo,
              numero: prop.numero,
              ano: prop.ano,
              ementa: prop.ementa,
              dataApresentacao: prop.dataApresentacao,
              statusResumo: prop.statusResumo,
              authorsResumo: prop.authorsResumo,
              urlCamara: camaraPropositionUrl(prop.id),
              authors: prop.authors.map((a) => ({
                id: a.deputy.id,
                nome: a.deputy.nomeEleitoral || a.deputy.nome,
                siglaPartido: a.deputy.siglaPartido,
                siglaUf: a.deputy.siglaUf,
                proponente: a.proponente,
              })),
            }
          : null,
      };
    }),
  };
}

export async function getDeputyAttendance(
  deputyId: number,
  legislaturaId?: number | null,
): Promise<AttendanceResponse> {
  let years: number[];
  if (legislaturaId) {
    const legislature = await getLegislatureOrThrow(legislaturaId);
    years = yearsForLegislature(legislature);
  } else {
    years = [new Date().getFullYear()];
  }

  const presentEventIds = new Set(
    (
      await prisma.attendance.findMany({
        where: { deputyId, year: { in: years } },
        select: { eventId: true },
      })
    ).map((a) => a.eventId),
  );

  const events = await prisma.event.findMany({
    where: {
      year: { in: years },
      descricaoTipo: "Sessão Deliberativa",
      situacao: { not: "Cancelada" },
      localCamara: { contains: "Plenário da Câmara" },
    },
    orderBy: { dataHoraInicio: "desc" },
  });

  const items = events.map((event) => {
    const presente = presentEventIds.has(event.id);
    return {
      eventId: event.id,
      dataHoraInicio: event.dataHoraInicio,
      dataHoraFim: event.dataHoraFim,
      descricaoTipo: event.descricaoTipo,
      descricao: event.descricao,
      localCamara: event.localCamara,
      situacao: event.situacao,
      presente,
      status: presente ? "presente" : "falta",
    };
  });

  const presentes = items.filter((r) => r.presente).length;
  const yearLabel =
    years.length === 1 ? years[0] : years.length ? years[years.length - 1] : null;

  return {
    year: yearLabel,
    years,
    page: 1,
    pageSize: items.length,
    total: items.length,
    summary: {
      eventosConsiderados: items.length,
      presentes,
      faltas: items.length - presentes,
      metodologia:
        "Apenas Sessões Deliberativas não canceladas no Plenário da Câmara, cruzadas com o registro oficial de presença. Ausência no arquivo = falta candidata.",
    },
    items,
  };
}

export async function getDeputyProfileBundle(
  id: number,
  legislaturaId?: number | null,
) {
  const deputy = await getDeputy(id, legislaturaId);
  const selected = deputy.selectedLegislaturaId;
  const [propositions, votes, attendance] = await Promise.all([
    getDeputyPropositions(id, 100, selected),
    getDeputyVotes(id, 40, selected),
    getDeputyAttendance(id, selected),
  ]);
  return { deputy, propositions, votes, attendance };
}
