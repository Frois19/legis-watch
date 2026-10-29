import { Agent, fetch as undiciFetch } from "undici";
import type {
  CamaraBulkAttendance,
  CamaraBulkEvent,
  CamaraBulkVote,
  CamaraBulkVoteProposition,
  CamaraBulkVoteSession,
  CamaraDeputyDetail,
  CamaraDeputyHistorico,
  CamaraDeputyListItem,
  CamaraLegislature,
  CamaraListResponse,
  CamaraParty,
  CamaraProposition,
  CamaraPropositionAuthor,
} from "./types";

const API_BASE =
  process.env.CAMARA_API_BASE ?? "https://dadosabertos.camara.leg.br/api/v2";
const FILES_BASE =
  process.env.CAMARA_ARQUIVOS_BASE ??
  "https://dadosabertos.camara.leg.br/arquivos";

const DEFAULT_DELAY_MS = Number(process.env.CAMARA_REQUEST_DELAY_MS ?? 600);
const MAX_RETRIES = Number(process.env.CAMARA_MAX_RETRIES ?? 3);
const CONNECT_TIMEOUT_MS = Number(
  process.env.CAMARA_CONNECT_TIMEOUT_MS ?? 60_000,
);
const BODY_TIMEOUT_MS = Number(process.env.CAMARA_BODY_TIMEOUT_MS ?? 120_000);

const camaraAgent = new Agent({
  connect: { timeout: CONNECT_TIMEOUT_MS },
  bodyTimeout: BODY_TIMEOUT_MS,
  headersTimeout: BODY_TIMEOUT_MS,
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function partyIdFromUri(uri?: string | null): number | null {
  if (!uri) return null;
  const match = uri.match(/\/partidos\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export { partyIdFromUri };

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  try {
    const response = await undiciFetch(url, {
      method: "GET",
      dispatcher: camaraAgent,
      headers: {
        Accept: "application/json",
      },
    });

    if (
      (response.status === 429 ||
        response.status === 503 ||
        response.status === 504) &&
      attempt < MAX_RETRIES
    ) {
      await sleep(DEFAULT_DELAY_MS * attempt * 2);
      return fetchJson<T>(url, attempt + 1);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Câmara API ${response.status} for ${url}: ${body.slice(0, 300)}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      await sleep(DEFAULT_DELAY_MS * attempt * 2);
      return fetchJson<T>(url, attempt + 1);
    }
    throw error;
  }
}

async function fetchAllPages<T>(
  firstUrl: string,
  maxPages = 200,
): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = firstUrl;
  let page = 0;

  while (url && page < maxPages) {
    page += 1;
    const payload: CamaraListResponse<T> = await fetchJson(url);
    items.push(...(payload.dados ?? []));
    const next = payload.links?.find((l) => l.rel === "next")?.href ?? null;
    url = next;
    if (url) await sleep(DEFAULT_DELAY_MS);
  }

  return items;
}

export async function listDeputies(params: {
  nome?: string;
  siglaPartido?: string;
  siglaUf?: string;
  idLegislatura?: number;
  itens?: number;
}): Promise<CamaraDeputyListItem[]> {
  const search = new URLSearchParams();
  search.set("ordem", "ASC");
  search.set("ordenarPor", "nome");
  search.set("itens", String(params.itens ?? 100));
  if (params.nome) search.set("nome", params.nome);
  if (params.siglaPartido) search.set("siglaPartido", params.siglaPartido);
  if (params.siglaUf) search.set("siglaUf", params.siglaUf);
  if (params.idLegislatura)
    search.set("idLegislatura", String(params.idLegislatura));

  return fetchAllPages<CamaraDeputyListItem>(
    `${API_BASE}/deputados?${search.toString()}`,
  );
}

export async function getDeputy(id: number): Promise<CamaraDeputyDetail> {
  const payload = await fetchJson<{ dados: CamaraDeputyDetail }>(
    `${API_BASE}/deputados/${id}`,
  );
  return payload.dados;
}

export async function listLegislatures(opts?: {
  itens?: number;
  maxPages?: number;
}): Promise<CamaraLegislature[]> {
  const search = new URLSearchParams({
    itens: String(opts?.itens ?? 100),
    ordem: "DESC",
    ordenarPor: "id",
  });
  return fetchAllPages<CamaraLegislature>(
    `${API_BASE}/legislaturas?${search.toString()}`,
    opts?.maxPages ?? 5,
  );
}

export async function getDeputyHistorico(
  id: number,
): Promise<CamaraDeputyHistorico[]> {
  const payload = await fetchJson<CamaraListResponse<CamaraDeputyHistorico>>(
    `${API_BASE}/deputados/${id}/historico`,
  );
  return payload.dados ?? [];
}

export async function listParties(idLegislatura: number): Promise<CamaraParty[]> {
  const search = new URLSearchParams({
    idLegislatura: String(idLegislatura),
    itens: "100",
    ordem: "ASC",
    ordenarPor: "sigla",
  });
  return fetchAllPages<CamaraParty>(`${API_BASE}/partidos?${search}`);
}

export async function getParty(id: number): Promise<CamaraParty> {
  const payload = await fetchJson<{ dados: CamaraParty }>(
    `${API_BASE}/partidos/${id}`,
  );
  return payload.dados;
}

export async function listPartyMembers(
  partyId: number,
  idLegislatura?: number,
): Promise<CamaraDeputyListItem[]> {
  const search = new URLSearchParams({ itens: "100" });
  if (idLegislatura) search.set("idLegislatura", String(idLegislatura));
  return fetchAllPages<CamaraDeputyListItem>(
    `${API_BASE}/partidos/${partyId}/membros?${search}`,
  );
}

export async function listPropositionsByAuthor(
  deputyId: number,
  opts?: {
    siglaTipo?: string;
    ano?: number;
    itens?: number;
    maxPages?: number;
  },
): Promise<CamaraProposition[]> {
  const search = new URLSearchParams({
    idDeputadoAutor: String(deputyId),
    ordem: "DESC",
    ordenarPor: "id",
    itens: String(opts?.itens ?? 100),
  });
  if (opts?.siglaTipo) search.set("siglaTipo", opts.siglaTipo);
  if (opts?.ano) search.set("ano", String(opts.ano));
  return fetchAllPages<CamaraProposition>(
    `${API_BASE}/proposicoes?${search}`,
    opts?.maxPages ?? 5,
  );
}

export async function getProposition(id: number): Promise<CamaraProposition> {
  const payload = await fetchJson<{ dados: CamaraProposition }>(
    `${API_BASE}/proposicoes/${id}`,
  );
  return payload.dados;
}

export async function listPropositionAuthors(
  id: number,
): Promise<CamaraPropositionAuthor[]> {
  const payload = await fetchJson<CamaraListResponse<CamaraPropositionAuthor>>(
    `${API_BASE}/proposicoes/${id}/autores`,
  );
  return payload.dados ?? [];
}

async function downloadBulkJson<T>(path: string): Promise<T[]> {
  const url = `${FILES_BASE}/${path}`;
  const data = await fetchJson<T[] | { dados?: T[] }>(url);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.dados)) return data.dados;
  return [];
}

export async function downloadVoteSessions(
  year: number,
): Promise<CamaraBulkVoteSession[]> {
  return downloadBulkJson<CamaraBulkVoteSession>(
    `votacoes/json/votacoes-${year}.json`,
  );
}

export async function downloadVotes(year: number): Promise<CamaraBulkVote[]> {
  return downloadBulkJson<CamaraBulkVote>(
    `votacoesVotos/json/votacoesVotos-${year}.json`,
  );
}

export async function downloadVotePropositions(
  year: number,
): Promise<CamaraBulkVoteProposition[]> {
  return downloadBulkJson<CamaraBulkVoteProposition>(
    `votacoesProposicoes/json/votacoesProposicoes-${year}.json`,
  );
}

export async function downloadEvents(year: number): Promise<CamaraBulkEvent[]> {
  return downloadBulkJson<CamaraBulkEvent>(`eventos/json/eventos-${year}.json`);
}

export async function downloadAttendances(
  year: number,
): Promise<CamaraBulkAttendance[]> {
  return downloadBulkJson<CamaraBulkAttendance>(
    `eventosPresencaDeputados/json/eventosPresencaDeputados-${year}.json`,
  );
}

export function currentLegislatura(): number {
  const raw = process.env.LEGISLATURA_ATUAL;
  const parsed = Number(raw ?? 57);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 57;
}
