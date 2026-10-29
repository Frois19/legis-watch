import { prisma } from "@/lib/db/prisma";
import type {
  AttendanceResponse,
  DeputyDetail,
  Paginated,
  PropositionItem,
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

export async function getDeputy(id: number): Promise<DeputyDetail> {
  const deputy = await prisma.deputy.findUnique({
    where: { id },
    include: { party: true },
  });

  if (!deputy) {
    throw new Error("not_found");
  }

  const partyMembers = deputy.partyId
    ? await prisma.deputy.findMany({
        where: {
          partyId: deputy.partyId,
          id: { not: deputy.id },
          legislaturaId: deputy.legislaturaId ?? undefined,
        },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, siglaUf: true, urlFoto: true },
        take: 100,
      })
    : [];

  return {
    id: deputy.id,
    nome: deputy.nome,
    nomeCivil: deputy.nomeCivil,
    nomeEleitoral: deputy.nomeEleitoral,
    siglaPartido: deputy.siglaPartido,
    siglaUf: deputy.siglaUf,
    legislaturaId: deputy.legislaturaId,
    urlFoto: deputy.urlFoto,
    email: deputy.email,
    situacao: deputy.situacao,
    condicaoEleitoral: deputy.condicaoEleitoral,
    dataNascimento: deputy.dataNascimento,
    municipioNascimento: deputy.municipioNascimento,
    escolaridade: deputy.escolaridade,
    redesSociais: parseJsonArray(deputy.redesSociais),
    gabinete: parseJsonObject(deputy.gabineteJson),
    party: deputy.party,
    partyMembers,
    syncedAt: deputy.syncedAt?.toISOString() ?? null,
  };
}

export async function getDeputyPropositions(
  deputyId: number,
  pageSize = 20,
): Promise<Paginated<PropositionItem>> {
  const where = { authors: { some: { deputyId } } };
  const [total, items] = await Promise.all([
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
  ]);

  return {
    page: 1,
    pageSize,
    total,
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
    })),
  };
}

export async function getDeputyVotes(
  deputyId: number,
  pageSize = 20,
): Promise<Paginated<VoteItem>> {
  const where = { deputyId };
  const [total, items] = await Promise.all([
    prisma.vote.count({ where }),
    prisma.vote.findMany({
      where,
      orderBy: { id: "desc" },
      take: pageSize,
      include: {
        voteSession: { include: { proposition: true } },
      },
    }),
  ]);

  return {
    page: 1,
    pageSize,
    total,
    items: items.map((v) => ({
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
      proposicao: v.voteSession.proposition
        ? {
            id: v.voteSession.proposition.id,
            siglaTipo: v.voteSession.proposition.siglaTipo,
            numero: v.voteSession.proposition.numero,
            ano: v.voteSession.proposition.ano,
            ementa: v.voteSession.proposition.ementa,
          }
        : null,
    })),
  };
}

export async function getDeputyAttendance(
  deputyId: number,
  year = new Date().getFullYear(),
): Promise<AttendanceResponse> {
  const presentEventIds = new Set(
    (
      await prisma.attendance.findMany({
        where: { deputyId, year },
        select: { eventId: true },
      })
    ).map((a) => a.eventId),
  );

  const events = await prisma.event.findMany({
    where: {
      year,
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

  return {
    year,
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

export async function getDeputyProfileBundle(id: number) {
  const deputy = await getDeputy(id);
  const [propositions, votes, attendance] = await Promise.all([
    getDeputyPropositions(id),
    getDeputyVotes(id),
    getDeputyAttendance(id),
  ]);
  return { deputy, propositions, votes, attendance };
}
