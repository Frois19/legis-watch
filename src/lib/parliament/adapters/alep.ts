import { cachedFetchJson } from "@/lib/cache/http-cache";
import type {
  AdapterAttendance,
  AdapterParliamentarian,
  AdapterProfileBundle,
  AdapterProposition,
  StateAssemblyAdapter,
} from "../types";
import { createFixtureAdapter } from "./fixture-assembly";
import { ASSEMBLY_CATALOG } from "../ufs";

const ALEP_WS_BASE =
  process.env.ALEP_WS_BASE ??
  "http://webservices.assembleia.pr.leg.br/api/public";

const ALEP_TRANSPARENCIA_BASE =
  process.env.ALEP_TRANSPARENCIA_BASE ??
  "https://transparencia.assembleia.pr.leg.br/api";

type RemuneracaoRow = {
  id?: number;
  matricula?: string;
  nome?: string;
  cargo?: string;
  data_exoneracao?: string | null;
};

type RemuneracaoPayload = {
  remuneracoes?: RemuneracaoRow[];
  last_page?: number;
  current_page?: number;
};

type AlepPropRow = {
  codigo?: number;
  numero?: number;
  ano?: number;
  autor?: string;
  ementa?: string;
  status?: string;
  tipoProposicao?: string;
  siglaTipoProposicao?: string | null;
  dataRecebimento?: string | null;
  dataEntrada?: string | null;
};

type AlepFilterPayload = {
  sucesso?: boolean;
  lista?: AlepPropRow[];
};

type AlepPresencaSessao = {
  data?: string;
  linhas?: string[][];
};

type AlepPresencaPayload = {
  ano?: string | number;
  sessoes?: AlepPresencaSessao[];
};

type ParsedName = { nome: string; observacao: string | null };

const STOP = new Set([
  "DE",
  "DA",
  "DO",
  "DOS",
  "DAS",
  "E",
  "DEPUTADO",
  "DEPUTADA",
]);

let memoryProps: {
  expiresAt: number;
  byAuthor: Record<string, AdapterProposition[]>;
} | null = null;

export function clearAlepCaches() {
  memoryProps = null;
}

function timeoutMs() {
  return Number(process.env.ALEP_TIMEOUT_MS ?? 30_000);
}

function cacheTtlMs() {
  return Number(process.env.ALEP_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);
}

function propositionYears(): number[] {
  const raw = process.env.ALEP_PROP_YEARS;
  if (raw) {
    return raw
      .split(",")
      .map((y) => Number(y.trim()))
      .filter((y) => Number.isFinite(y));
  }
  const current = new Date().getUTCFullYear();
  return [current, current - 1];
}

function attendanceYears(): number[] {
  const raw = process.env.ALEP_ATTENDANCE_YEARS;
  if (raw) {
    return raw
      .split(",")
      .map((y) => Number(y.trim()))
      .filter((y) => Number.isFinite(y));
  }
  return propositionYears();
}

function attendanceLimit() {
  return Number(process.env.ESTADUAL_ATTENDANCE_LIMIT ?? 120);
}

function propositionLimit() {
  return Number(process.env.ESTADUAL_MATTER_LIMIT ?? 60);
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** True se o campo autor da proposição cobre o nome do deputado. */
export function authorMatchesDeputy(
  autorField: string,
  deputyName: string,
): boolean {
  const deputyTokens = nameTokens(deputyName);
  if (deputyTokens.length === 0) return false;
  const segments = normalizeName(autorField)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const segment of segments) {
    const segTokens = nameTokens(segment);
    if (segTokens.length === 0) continue;
    const matched = deputyTokens.filter((t) => segTokens.includes(t));
    // Exige pelo menos 2 tokens (ou o único token significativo).
    const need = Math.min(2, deputyTokens.length);
    if (matched.length >= need) return true;
  }
  return false;
}

function tipoSigla(row: AlepPropRow): string {
  if (row.siglaTipoProposicao?.trim()) return row.siglaTipoProposicao.trim();
  const tipo = (row.tipoProposicao ?? "").toUpperCase();
  if (tipo.includes("EMENDA À CONSTITUIÇÃO") || tipo.includes("PEC"))
    return "PEC";
  if (tipo.includes("COMPLEMENTAR")) return "PLC";
  if (tipo.includes("DECRETO LEGISLATIVO")) return "PDL";
  if (tipo.includes("RESOLUÇÃO") || tipo.includes("RESOLUCAO")) return "RES";
  if (tipo.includes("INDICAÇÃO") || tipo.includes("INDICACAO")) return "IND";
  if (tipo.includes("REQUERIMENTO")) return "REQ";
  if (tipo.includes("EMENDA")) return "EME";
  if (tipo.includes("PROJETO DE LEI") || tipo === "PROPOSIÇÃO") return "PL";
  return tipo.slice(0, 12) || "PROP";
}

export function mapAlepProposition(
  row: AlepPropRow,
  authorExternalId: string,
): AdapterProposition | null {
  const codigo = row.codigo != null ? String(row.codigo) : null;
  if (!codigo) return null;
  const data = row.dataRecebimento || row.dataEntrada || null;
  return {
    externalId: codigo,
    siglaTipo: tipoSigla(row),
    numero: row.numero ?? null,
    ano: row.ano ?? null,
    ementa: row.ementa?.trim() || null,
    dataApresentacao: data ? String(data).slice(0, 10) : null,
    statusResumo: row.status?.trim() || null,
    urlPublica: null,
    authorExternalId,
  };
}

function mapRemuneracao(row: RemuneracaoRow): AdapterParliamentarian | null {
  const nome = row.nome?.trim();
  const matricula = row.matricula?.trim();
  if (!nome || !matricula) return null;
  if (row.data_exoneracao) return null;
  return {
    externalId: matricula,
    nome,
    nomeEleitoral: nome,
    siglaPartido: null,
    situacao: "Exercício",
    raw: row,
  };
}

async function fetchRemuneracaoPage(
  year: number,
  month: number,
  page: number,
): Promise<RemuneracaoPayload> {
  const url = `${ALEP_TRANSPARENCIA_BASE.replace(/\/$/, "")}/remuneracao?t=${encodeURIComponent("deputado estadual")}&mes=${month}&ano=${year}&page=${page}`;
  return cachedFetchJson<RemuneracaoPayload>(url, {
    namespace: "alep",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeoutMs: timeoutMs(),
    ttlMs: cacheTtlMs(),
  });
}

async function listFromRemuneracao(): Promise<AdapterParliamentarian[]> {
  const now = new Date();
  const attempts: Array<{ year: number; month: number }> = [];
  for (let back = 0; back < 4; back += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    attempts.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }

  let lastError: unknown;
  for (const { year, month } of attempts) {
    try {
      const first = await fetchRemuneracaoPage(year, month, 1);
      const rows = [...(first.remuneracoes ?? [])];
      const lastPage = Math.max(1, first.last_page ?? 1);
      for (let page = 2; page <= lastPage; page += 1) {
        const next = await fetchRemuneracaoPage(year, month, page);
        rows.push(...(next.remuneracoes ?? []));
      }
      const mapped = rows
        .map(mapRemuneracao)
        .filter((r): r is AdapterParliamentarian => !!r);
      // Dedup por matrícula
      const byId = new Map<string, AdapterParliamentarian>();
      for (const row of mapped) byId.set(row.externalId, row);
      if (byId.size > 0) return [...byId.values()];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("ALEP remuneração indisponível");
}

async function fetchYearPropositions(year: number): Promise<AlepPropRow[]> {
  const url = `${ALEP_WS_BASE.replace(/\/$/, "")}/proposicao/filtrar`;
  const payload = await cachedFetchJson<AlepFilterPayload>(url, {
    namespace: "alep",
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ano: year,
      numeroMaximoRegistro: 50_000,
    }),
    timeoutMs: timeoutMs(),
    ttlMs: cacheTtlMs(),
  });
  if (payload.sucesso === false) {
    throw new Error(`ALEP filtrar ano=${year} sem sucesso`);
  }
  return payload.lista ?? [];
}

async function buildPropositionIndex(
  deputies: AdapterParliamentarian[],
): Promise<Record<string, AdapterProposition[]>> {
  if (memoryProps && memoryProps.expiresAt > Date.now()) {
    return memoryProps.byAuthor;
  }

  const years = propositionYears();
  const limit = propositionLimit();
  const byAuthor: Record<string, AdapterProposition[]> = {};
  for (const dep of deputies) byAuthor[dep.externalId] = [];

  for (const year of years) {
    try {
      const rows = await fetchYearPropositions(year);
      for (const row of rows) {
        if (!row.autor) continue;
        for (const dep of deputies) {
          if (!authorMatchesDeputy(row.autor, dep.nome)) continue;
          const mapped = mapAlepProposition(row, dep.externalId);
          if (!mapped) continue;
          const bucket = byAuthor[dep.externalId]!;
          if (bucket.some((p) => p.externalId === mapped.externalId)) continue;
          bucket.push(mapped);
        }
      }
    } catch (error) {
      console.warn(
        `[alep] proposições ${year}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  for (const id of Object.keys(byAuthor)) {
    byAuthor[id]!.sort((a, b) => {
      const ay = a.ano ?? 0;
      const by = b.ano ?? 0;
      if (by !== ay) return by - ay;
      return (b.numero ?? 0) - (a.numero ?? 0);
    });
    byAuthor[id] = byAuthor[id]!.slice(0, limit);
  }

  memoryProps = {
    expiresAt: Date.now() + cacheTtlMs(),
    byAuthor,
  };
  return byAuthor;
}

/** Converte "11/12/2024" → "2024-12-11". */
export function brSessionDateToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return value.slice(0, 10);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Extrai nome e observação de célula ("NOME (Req. …)"). */
export function parsePresenceCell(raw: string | null | undefined): ParsedName | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (match) {
    return { nome: match[1]!.trim(), observacao: match[2]!.trim() };
  }
  return { nome: trimmed, observacao: null };
}

/**
 * Colunas PRESENTES / JUSTIFICADOS / AUSENTES são listas independentes
 * alinhadas em linhas (não uma pessoa por linha).
 */
export function extractSessionStatuses(
  linhas: string[][] | undefined,
): Array<{ status: AdapterAttendance["status"]; nome: string; observacao: string | null }> {
  if (!linhas || linhas.length < 2) return [];
  const out: Array<{
    status: AdapterAttendance["status"];
    nome: string;
    observacao: string | null;
  }> = [];
  const statuses = ["presente", "justificado", "ausente"] as const;
  for (const row of linhas.slice(1)) {
    for (let col = 0; col < 3; col += 1) {
      const parsed = parsePresenceCell(row?.[col]);
      if (!parsed) continue;
      out.push({
        status: statuses[col]!,
        nome: parsed.nome,
        observacao: parsed.observacao,
      });
    }
  }
  return out;
}

async function fetchYearAttendance(year: number): Promise<AlepPresencaPayload> {
  const url = `${ALEP_TRANSPARENCIA_BASE.replace(/\/$/, "")}/presenca/ano?ano=${year}`;
  return cachedFetchJson<AlepPresencaPayload>(url, {
    namespace: "alep",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeoutMs: timeoutMs(),
    ttlMs: cacheTtlMs(),
  });
}

export function attendanceForDeputyName(
  payload: AlepPresencaPayload,
  deputyName: string,
): AdapterAttendance[] {
  const rows: AdapterAttendance[] = [];
  for (const sessao of payload.sessoes ?? []) {
    const dataSessao = brSessionDateToIso(sessao.data);
    if (!dataSessao) continue;
    const year = Number(dataSessao.slice(0, 4));
    const entries = extractSessionStatuses(sessao.linhas);
    const match = entries.find((e) => authorMatchesDeputy(e.nome, deputyName));
    if (!match) continue;
    rows.push({
      dataSessao,
      year: Number.isFinite(year) ? year : null,
      status: match.status,
      observacao: match.observacao,
    });
  }
  rows.sort((a, b) => b.dataSessao.localeCompare(a.dataSessao));
  return rows;
}

async function fetchAttendanceForDeputy(
  deputy: AdapterParliamentarian,
): Promise<AdapterAttendance[]> {
  const years = attendanceYears();
  const limit = attendanceLimit();
  const collected: AdapterAttendance[] = [];
  const seen = new Set<string>();

  for (const year of years) {
    try {
      const payload = await fetchYearAttendance(year);
      for (const row of attendanceForDeputyName(payload, deputy.nome)) {
        if (seen.has(row.dataSessao)) continue;
        seen.add(row.dataSessao);
        collected.push(row);
      }
    } catch (error) {
      console.warn(
        `[alep] presença ${year}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  collected.sort((a, b) => b.dataSessao.localeCompare(a.dataSessao));
  return collected.slice(0, limit);
}

const catalog = ASSEMBLY_CATALOG.find((c) => c.source === "alep")!;
const fixtureFallback = createFixtureAdapter(catalog);

export const alepAdapter: StateAssemblyAdapter = {
  info: {
    source: "alep",
    uf: "PR",
    name: "Assembleia Legislativa do Paraná",
    sphere: "estadual_deputado",
    dataMode: "live",
    coverage: {
      search: true,
      profile: true,
      propositions: true,
      votes: false,
      attendance: true,
    },
    docsUrl: "https://transparencia.assembleia.pr.leg.br/servicos/dados-abertos",
  },

  async listParliamentarians() {
    try {
      const rows = await listFromRemuneracao();
      if (rows.length === 0) throw new Error("ALEP retornou lista vazia");
      return rows;
    } catch (error) {
      if (process.env.ALEP_REQUIRE_LIVE === "1") throw error;
      console.warn(
        "[alep] API indisponível; usando fixture:",
        error instanceof Error ? error.message : error,
      );
      return fixtureFallback.listParliamentarians();
    }
  },

  async getParliamentarian(externalId: string) {
    const rows = await this.listParliamentarians();
    return rows.find((r) => r.externalId === String(externalId)) ?? null;
  },

  async listPropositions(authorExternalId: string) {
    const deputies = await this.listParliamentarians();
    const index = await buildPropositionIndex(deputies);
    return index[String(authorExternalId)] ?? [];
  },

  async fetchProfileBundle(externalId: string): Promise<AdapterProfileBundle> {
    const deputy = await this.getParliamentarian?.(String(externalId));
    const propositions = await this.listPropositions!(String(externalId));
    const attendance = deputy
      ? await fetchAttendanceForDeputy(deputy)
      : [];
    return {
      affiliations: [],
      mandates: [],
      propositions,
      attendance,
    };
  },
};
