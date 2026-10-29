import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AdapterAffiliation,
  AdapterMandate,
  AdapterParliamentarian,
  AdapterProfileBundle,
  StateAssemblyAdapter,
} from "../types";
import { createFixtureAdapter } from "./fixture-assembly";
import { ASSEMBLY_CATALOG } from "../ufs";

const ALMG_BASE =
  process.env.ALMG_API_BASE ?? "https://dadosabertos.almg.gov.br/api/v2";

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

function ts(value: AlmgTimestamp): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value === "object" && value.$) return String(value.$).slice(0, 10);
  return null;
}

function timeoutMs() {
  return Number(process.env.ALMG_TIMEOUT_MS ?? 20_000);
}

async function almgFetch<T>(apiPath: string): Promise<T> {
  const url = apiPath.startsWith("http")
    ? apiPath
    : `${ALMG_BASE.replace(/\/$/, "")}${apiPath}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!response.ok) {
    throw new Error(`ALMG HTTP ${response.status} em ${apiPath}`);
  }
  return (await response.json()) as T;
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
    coverage: {
      search: true,
      profile: true,
      // Pesquisa de proposições da ALMG retorna 403 neste ambiente.
      propositions: false,
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
      return mapDetail(data.deputado ?? {}) ;
    } catch {
      return null;
    }
  },

  async fetchProfileBundle(externalId: string) {
    try {
      const data = await almgFetch<{ deputado?: AlmgDetail }>(
        `/deputados/${encodeURIComponent(externalId)}?formato=json`,
      );
      const dep = data.deputado ?? {};
      return {
        affiliations: mapAffiliations(dep.filiacoes),
        mandates: mapMandates(dep.legislaturas),
        propositions: [],
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
