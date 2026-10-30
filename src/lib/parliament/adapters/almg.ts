import { readFile } from "node:fs/promises";
import path from "node:path";
import { cachedFetchJson, cachedFetchText } from "@/lib/cache/http-cache";
import { parseCsv } from "../csv";
import type {
  AdapterAffiliation,
  AdapterMandate,
  AdapterParliamentarian,
  AdapterProfileBundle,
  AdapterProposition,
  StateAssemblyAdapter,
} from "../types";
import { createFixtureAdapter } from "./fixture-assembly";
import { ASSEMBLY_CATALOG } from "../ufs";

const ALMG_BASE =
  process.env.ALMG_API_BASE ?? "https://dadosabertos.almg.gov.br/api/v2";

const ALMG_CSV_BASE =
  process.env.ALMG_CSV_BASE ?? "https://dadosabertos.almg.gov.br/arquivo";

type AlmgListRow = {
  id: number;
  nome?: string;
  partido?: string;
};

type AlmgTimestamp = { $?: string } | string | null | undefined;

type AlmgDetail = {
  id?: number;
  nome?: string;
  partido?: string;
  situacao?: string;
  emails?: Array<{ endereco?: string }>;
  filiacoes?: unknown;
  legislaturas?: unknown;
};

type CsvCacheEntry = {
  expiresAt: number;
  rows: AdapterProposition[];
};

const propositionCache = new Map<string, CsvCacheEntry>();

export function clearAlmgPropositionCache() {
  propositionCache.clear();
}

function ts(value: AlmgTimestamp): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value === "object" && value.$) return String(value.$).slice(0, 10);
  return null;
}

function timeoutMs() {
  return Number(process.env.ALMG_TIMEOUT_MS ?? 45_000);
}

function csvCacheTtlMs() {
  return Number(process.env.ALMG_CSV_TTL_MS ?? 6 * 60 * 60 * 1000);
}

function propositionYears(): number[] {
  const raw = process.env.ALMG_PROP_YEARS;
  if (raw) {
    return raw
      .split(",")
      .map((y) => Number(y.trim()))
      .filter((y) => Number.isFinite(y));
  }
  const current = new Date().getUTCFullYear();
  return [current, current - 1];
}

function propositionLimit() {
  return Number(process.env.ESTADUAL_MATTER_LIMIT ?? 60);
}

function brDateToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return value.slice(0, 10);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

async function almgFetch<T>(apiPath: string): Promise<T> {
  const url = apiPath.startsWith("http")
    ? apiPath
    : `${ALMG_BASE.replace(/\/$/, "")}${apiPath}`;
  return cachedFetchJson<T>(url, {
    namespace: "almg",
    headers: { Accept: "application/json" },
    timeoutMs: timeoutMs(),
    ttlMs: csvCacheTtlMs(),
  });
}

function mapEmail(
  emails: Array<{ endereco?: string }> | undefined,
): string | null {
  const raw = emails?.[0]?.endereco?.trim();
  if (!raw) return null;
  if (raw.includes("@")) return raw;
  return `${raw}@almg.gov.br`;
}

function mapListRow(row: AlmgListRow): AdapterParliamentarian | null {
  const nome = row.nome?.trim();
  if (!row.id || !nome) return null;
  return {
    externalId: String(row.id),
    nome,
    nomeEleitoral: nome,
    siglaPartido: row.partido?.trim() || null,
    situacao: "Exercício",
    raw: row,
  };
}

function mapDetail(dep: AlmgDetail): AdapterParliamentarian | null {
  const nome = dep.nome?.trim();
  if (!dep.id || !nome) return null;
  return {
    externalId: String(dep.id),
    nome,
    nomeEleitoral: nome,
    siglaPartido: dep.partido?.trim() || null,
    email: mapEmail(dep.emails),
    situacao: dep.situacao?.trim() || "Exercício",
    raw: dep,
  };
}

function mapAffiliations(filiacoes: unknown): AdapterAffiliation[] {
  if (!Array.isArray(filiacoes)) return [];
  return filiacoes.map((row) => {
    const item = row as {
      dataInicio?: AlmgTimestamp;
      dataTermino?: AlmgTimestamp;
      partido?: { id?: number; sigla?: string; nome?: string };
    };
    const fim = ts(item.dataTermino);
    return {
      codigoPartido:
        item.partido?.id != null ? String(item.partido.id) : null,
      siglaPartido: item.partido?.sigla?.trim() || null,
      nomePartido: item.partido?.nome?.trim() || null,
      dataFiliacao: ts(item.dataInicio),
      dataDesfiliacao: fim && fim.startsWith("2999") ? null : fim,
    };
  });
}

function mapMandates(legislaturas: unknown): AdapterMandate[] {
  if (!Array.isArray(legislaturas)) return [];
  return legislaturas.map((row) => {
    const item = row as {
      numeroLegislatura?: number;
      inicioLegislatura?: AlmgTimestamp;
      terminoLegislatura?: AlmgTimestamp;
      tipoMandato?: string;
    };
    return {
      codigoMandato:
        item.numeroLegislatura != null
          ? String(item.numeroLegislatura)
          : null,
      siglaUf: "MG",
      participacao: item.tipoMandato?.trim() || "Efetivo",
      legislaturaInicio: item.numeroLegislatura ?? null,
      legislaturaFim: item.numeroLegislatura ?? null,
      dataInicio: ts(item.inicioLegislatura),
      dataFim: ts(item.terminoLegislatura),
    };
  });
}

function mapCsvRow(
  row: Record<string, string>,
  authorId: string,
): AdapterProposition | null {
  let authors: Array<{ id?: number | string }> = [];
  try {
    authors = JSON.parse(row.Autores || "[]") as Array<{ id?: number | string }>;
  } catch {
    return null;
  }
  if (!authors.some((a) => String(a.id) === authorId)) return null;

  const numero = Number(row.Numero);
  const ano = Number(row.Ano);
  const sigla = row.SiglaTipoProposicao?.trim() || null;
  const codigo = row.Codigo?.trim() || null;
  const externalId =
    codigo ||
    [sigla, Number.isFinite(numero) ? numero : null, Number.isFinite(ano) ? ano : null]
      .filter((v) => v != null && v !== "")
      .join("-");
  if (!externalId) return null;

  return {
    externalId,
    siglaTipo: sigla,
    numero: Number.isFinite(numero) ? numero : null,
    ano: Number.isFinite(ano) ? ano : null,
    ementa: row.Ementa?.trim() || row.Resumo?.trim() || null,
    dataApresentacao: brDateToIso(row.DataPublicacao),
    statusResumo: row.Situacao?.trim() || row.NomeFaseAtual?.trim() || null,
    urlPublica: row.LinkTextos?.trim() || null,
    authorExternalId: authorId,
  };
}

async function loadYearPropositions(year: number): Promise<AdapterProposition[]> {
  const cacheKey = `year:${year}`;
  const cached = propositionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rows;
  }

  const url = `${ALMG_CSV_BASE.replace(/\/$/, "")}/proposicoes/download?ano=${year}`;
  const text = await cachedFetchText(url, {
    namespace: "almg",
    headers: { Accept: "text/csv,application/octet-stream,*/*" },
    timeoutMs: timeoutMs(),
    ttlMs: csvCacheTtlMs(),
  });
  const parsed = parseCsv(text);
  // Guarda todas as linhas mapeáveis sem filtro de autor — o filtro é por id na hora.
  const rows: AdapterProposition[] = [];
  for (const row of parsed) {
    let authors: Array<{ id?: number | string }> = [];
    try {
      authors = JSON.parse(row.Autores || "[]") as Array<{
        id?: number | string;
      }>;
    } catch {
      continue;
    }
    for (const author of authors) {
      const authorId = author.id != null ? String(author.id) : "";
      if (!authorId) continue;
      const mapped = mapCsvRow(row, authorId);
      if (mapped) rows.push(mapped);
    }
  }

  propositionCache.set(cacheKey, {
    expiresAt: Date.now() + csvCacheTtlMs(),
    rows,
  });
  return rows;
}

async function fetchPropositionsForAuthor(
  authorId: string,
): Promise<AdapterProposition[]> {
  const years = propositionYears();
  const limit = propositionLimit();
  const collected: AdapterProposition[] = [];
  const seen = new Set<string>();

  for (const year of years) {
    try {
      const yearRows = await loadYearPropositions(year);
      for (const row of yearRows) {
        if (row.authorExternalId !== authorId) continue;
        if (seen.has(row.externalId)) continue;
        seen.add(row.externalId);
        collected.push(row);
      }
    } catch (error) {
      console.warn(
        `[almg] CSV proposições ${year}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  collected.sort((a, b) => {
    const ay = a.ano ?? 0;
    const by = b.ano ?? 0;
    if (by !== ay) return by - ay;
    return (b.numero ?? 0) - (a.numero ?? 0);
  });
  return collected.slice(0, limit);
}

async function loadProfileFixture(
  externalId: string,
): Promise<AdapterProfileBundle | null> {
  const file = path.join(
    process.cwd(),
    "src/lib/parliament/fixtures/estadual-perfil.json",
  );
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as Record<
      string,
      Record<string, AdapterProfileBundle>
    >;
    return data.almg?.[externalId] ?? data.almg?.default ?? null;
  } catch {
    return null;
  }
}

const catalog = ASSEMBLY_CATALOG.find((c) => c.source === "almg")!;
const fixtureFallback = createFixtureAdapter(catalog);

export const almgAdapter: StateAssemblyAdapter = {
  info: {
    source: "almg",
    uf: "MG",
    name: "Assembleia Legislativa de Minas Gerais",
    sphere: "estadual_deputado",
    dataMode: "live",
    coverage: {
      search: true,
      profile: true,
      // API REST de proposições costuma 403; CSV anual público funciona.
      propositions: true,
      votes: false,
      attendance: false,
    },
    docsUrl: "https://dadosabertos.almg.gov.br/",
  },

  async listParliamentarians() {
    try {
      const data = await almgFetch<{ list?: AlmgListRow[] }>(
        "/deputados/em_exercicio?formato=json",
      );
      const mapped = (data.list ?? [])
        .map(mapListRow)
        .filter((r): r is AdapterParliamentarian => !!r);
      if (mapped.length === 0) throw new Error("ALMG retornou lista vazia");
      return mapped;
    } catch (error) {
      if (process.env.ALMG_REQUIRE_LIVE === "1") throw error;
      console.warn(
        "[almg] API indisponível; usando fixture:",
        error instanceof Error ? error.message : error,
      );
      return fixtureFallback.listParliamentarians();
    }
  },

  async getParliamentarian(externalId: string) {
    try {
      const data = await almgFetch<{ deputado?: AlmgDetail }>(
        `/deputados/${encodeURIComponent(externalId)}?formato=json`,
      );
      return mapDetail(data.deputado ?? {});
    } catch {
      return null;
    }
  },

  async listPropositions(authorExternalId: string) {
    return fetchPropositionsForAuthor(String(authorExternalId));
  },

  async fetchProfileBundle(externalId: string) {
    try {
      const data = await almgFetch<{ deputado?: AlmgDetail }>(
        `/deputados/${encodeURIComponent(externalId)}?formato=json`,
      );
      const dep = data.deputado ?? {};
      const propositions = await fetchPropositionsForAuthor(String(externalId));
      return {
        affiliations: mapAffiliations(dep.filiacoes),
        mandates: mapMandates(dep.legislaturas),
        propositions,
      };
    } catch (error) {
      if (process.env.ALMG_REQUIRE_LIVE === "1") throw error;
      console.warn(
        `[almg] perfil ${externalId} indisponível; fixture:`,
        error instanceof Error ? error.message : error,
      );
      const fixture = await loadProfileFixture(externalId);
      if (fixture) return fixture;
      throw error;
    }
  },
};

export { mapCsvRow as mapAlmgCsvRowForTests };
