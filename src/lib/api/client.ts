import type {
  AttendanceResponse,
  DeputyDetail,
  DeputyListItem,
  LegislatureItem,
  Paginated,
  PropositionItem,
  VoteItem,
} from "./types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Erro ${res.status} em ${path}`);
  }
  return (await res.json()) as T;
}

export function listLegislatures(): Promise<{ items: LegislatureItem[] }> {
  return getJson("/api/legislaturas");
}

export function searchDeputies(params: {
  nome?: string;
  siglaPartido?: string;
  siglaUf?: string;
  legislaturaId?: number;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<DeputyListItem>> {
  const q = new URLSearchParams();
  if (params.nome) q.set("nome", params.nome);
  if (params.siglaPartido) q.set("siglaPartido", params.siglaPartido);
  if (params.siglaUf) q.set("siglaUf", params.siglaUf);
  if (params.legislaturaId) q.set("legislaturaId", String(params.legislaturaId));
  q.set("page", String(params.page ?? 1));
  q.set("pageSize", String(params.pageSize ?? 20));
  return getJson(`/api/deputados?${q}`);
}

export function getDeputy(id: number): Promise<DeputyDetail> {
  return getJson(`/api/deputados/${id}`);
}

export function getPropositions(
  id: number,
  page = 1,
): Promise<Paginated<PropositionItem>> {
  return getJson(
    `/api/deputados/${id}/proposicoes?page=${page}&pageSize=15`,
  );
}

export function getVotes(
  id: number,
  page = 1,
): Promise<Paginated<VoteItem>> {
  return getJson(`/api/deputados/${id}/votos?page=${page}&pageSize=15`);
}

export function getAttendances(
  id: number,
  year = new Date().getFullYear(),
  faltas = false,
): Promise<AttendanceResponse> {
  return getJson(
    `/api/deputados/${id}/presencas?year=${year}&pageSize=40&faltas=${faltas ? 1 : 0}`,
  );
}
