import { readFile } from "node:fs/promises";
import path from "node:path";
import { cachedFetchJson } from "@/lib/cache/http-cache";
import type {
  AdapterAffiliation,
  AdapterMandate,
  AdapterParliamentarian,
  AdapterProfileBundle,
  AdapterProposition,
  AssemblyInfo,
  StateAssemblyAdapter,
} from "../types";
import type { AssemblyCatalogEntry } from "../ufs";
import { ASSEMBLY_CATALOG } from "../ufs";
import { createFixtureAdapter } from "./fixture-assembly";

export type SaplHouseConfig = {
  source: string;
  uf: string;
  name: string;
  baseUrl: string;
  docsUrl?: string;
};

/** Casas com API SAPL pública verificada (parlamentares + matérias). */
export const SAPL_HOUSES: SaplHouseConfig[] = [
  {
    source: "aleac",
    uf: "AC",
    name: "Assembleia Legislativa do Acre",
    baseUrl: "https://sapl.al.ac.leg.br",
    docsUrl: "https://sapl.al.ac.leg.br/api/",
  },
  {
    source: "aleal",
    uf: "AL",
    name: "Assembleia Legislativa de Alagoas",
    baseUrl: "https://sapl.al.al.leg.br",
    docsUrl: "https://sapl.al.al.leg.br/api/",
  },
  {
    source: "aleam",
    uf: "AM",
    name: "Assembleia Legislativa do Amazonas",
    baseUrl: "https://sapl.al.am.leg.br",
    docsUrl: "https://sapl.al.am.leg.br/api/",
  },
  {
    source: "alepb",
    uf: "PB",
    name: "Assembleia Legislativa da Paraíba",
    baseUrl: "https://sapl.al.pb.leg.br",
    docsUrl: "https://sapl.al.pb.leg.br/api/",
  },
  {
    source: "alepi",
    uf: "PI",
    name: "Assembleia Legislativa do Piauí",
    baseUrl: "https://sapl.al.pi.leg.br",
    docsUrl: "https://sapl.al.pi.leg.br/api/",
  },
  {
    source: "alero",
    uf: "RO",
    name: "Assembleia Legislativa de Rondônia",
    baseUrl: "https://sapl.al.ro.leg.br",
    docsUrl: "https://sapl.al.ro.leg.br/api/",
  },
  {
    source: "aleto",
    uf: "TO",
    name: "Assembleia Legislativa do Tocantins",
    baseUrl: "https://sapl.al.to.leg.br",
    docsUrl: "https://sapl.al.to.leg.br/api/",
  },
];

type SaplPage<T> = {
  pagination?: { next_page?: number | null; total_entries?: number };
  results?: T[];
};

type SaplParlamentar = {
  id: number;
  nome_parlamentar?: string;
  nome_completo?: string;
  ativo?: boolean;
  email?: string | null;
  fotografia?: string | null;
};

function httpsUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

function matterLimit() {
  return Number(process.env.ESTADUAL_MATTER_LIMIT ?? 60);
}

function timeoutMs() {
  return Number(process.env.SAPL_TIMEOUT_MS ?? 20_000);
}

function cacheTtlMs() {
  return Number(process.env.SAPL_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);
}

async function saplFetch<T>(baseUrl: string, apiPath: string): Promise<T> {
  const url = apiPath.startsWith("http")
    ? apiPath
    : `${baseUrl.replace(/\/$/, "")}${apiPath}`;
  return cachedFetchJson<T>(url, {
    namespace: "sapl",
    headers: { Accept: "application/json" },
    timeoutMs: timeoutMs(),
    ttlMs: cacheTtlMs(),
  });
}

async function saplFetchAllPages<T>(
  baseUrl: string,
  apiPath: string,
  maxPages = 20,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  const joiner = apiPath.includes("?") ? "&" : "?";
  while (page <= maxPages) {
    const data = await saplFetch<SaplPage<T>>(
      baseUrl,
      `${apiPath}${joiner}page=${page}&page_size=100`,
    );
    const batch = data.results ?? [];
    rows.push(...batch);
    if (!data.pagination?.next_page) break;
    page = data.pagination.next_page;
  }
  return rows;
}

function mapParlamentar(row: SaplParlamentar): AdapterParliamentarian | null {
  const nome = (row.nome_parlamentar || row.nome_completo || "").trim();
  if (!row.id || !nome) return null;
  return {
    externalId: String(row.id),
    nome,
    nomeEleitoral: row.nome_parlamentar?.trim() || nome,
    email: row.email?.trim() || null,
    urlFoto: httpsUrl(row.fotografia),
    situacao: row.ativo === false ? "Inativo" : "Exercício",
    raw: row,
  };
}

async function resolveAutorId(
  baseUrl: string,
  parlamentarId: string,
): Promise<number | null> {
  const data = await saplFetch<SaplPage<{ id: number }>>(
    baseUrl,
    `/api/base/autor/?object_id=${encodeURIComponent(parlamentarId)}&page_size=5`,
  );
  return data.results?.[0]?.id ?? null;
}

const tipoCache = new Map<string, Map<number, string>>();

async function tipoSigla(
  baseUrl: string,
  tipoId: number | null | undefined,
): Promise<string | null> {
  if (!tipoId) return null;
  let cache = tipoCache.get(baseUrl);
  if (!cache) {
    cache = new Map();
    tipoCache.set(baseUrl, cache);
  }
  if (cache.has(tipoId)) return cache.get(tipoId) ?? null;
  try {
    const tipo = await saplFetch<{ sigla?: string }>(
      baseUrl,
      `/api/materia/tipomaterialegislativa/${tipoId}/`,
    );
    const sigla = tipo.sigla?.trim() || null;
    cache.set(tipoId, sigla ?? "");
    return sigla;
  } catch {
    cache.set(tipoId, "");
    return null;
  }
}

async function partidoInfo(
  baseUrl: string,
  partidoId: number | null | undefined,
): Promise<{ sigla: string | null; nome: string | null }> {
  if (!partidoId) return { sigla: null, nome: null };
  try {
    const partido = await saplFetch<{
      sigla?: string;
      nome?: string;
    }>(baseUrl, `/api/parlamentares/partido/${partidoId}/`);
    return {
      sigla: partido.sigla?.trim() || null,
      nome: partido.nome?.trim() || null,
    };
  } catch {
    return { sigla: null, nome: null };
  }
}

async function loadProfileLive(
  config: SaplHouseConfig,
  externalId: string,
): Promise<AdapterProfileBundle> {
  const limit = matterLimit();
  const autorId = await resolveAutorId(config.baseUrl, externalId);

  const [filiacoes, mandatos, autorias] = await Promise.all([
    saplFetchAllPages<{
      data?: string;
      data_desfiliacao?: string | null;
      partido?: number;
    }>(
      config.baseUrl,
      `/api/parlamentares/filiacao/?parlamentar=${encodeURIComponent(externalId)}`,
      5,
    ),
    saplFetchAllPages<{
      id?: number;
      data_inicio_mandato?: string | null;
      data_fim_mandato?: string | null;
      titular?: boolean;
      legislatura?: number;
    }>(
      config.baseUrl,
      `/api/parlamentares/mandato/?parlamentar=${encodeURIComponent(externalId)}`,
      5,
    ),
    autorId
      ? saplFetchAllPages<{
          materia?: number;
          primeiro_autor?: boolean;
        }>(
          config.baseUrl,
          `/api/materia/autoria/?autor=${autorId}`,
          10,
        )
      : Promise.resolve([]),
  ]);

  const affiliations: AdapterAffiliation[] = [];
  for (const row of filiacoes) {
    const partido = await partidoInfo(config.baseUrl, row.partido);
    affiliations.push({
      codigoPartido: row.partido != null ? String(row.partido) : null,
      siglaPartido: partido.sigla,
      nomePartido: partido.nome,
      dataFiliacao: row.data?.slice(0, 10) || null,
      dataDesfiliacao: row.data_desfiliacao?.slice(0, 10) || null,
    });
  }

  const mandates: AdapterMandate[] = mandatos.map((row) => ({
    codigoMandato: row.id != null ? String(row.id) : null,
    siglaUf: config.uf,
    participacao: row.titular === false ? "Suplente" : "Titular",
    legislaturaInicio: row.legislatura ?? null,
    legislaturaFim: row.legislatura ?? null,
    dataInicio: row.data_inicio_mandato?.slice(0, 10) || null,
    dataFim: row.data_fim_mandato?.slice(0, 10) || null,
  }));

  const propositions: AdapterProposition[] = [];
  for (const autoria of autorias) {
    if (propositions.length >= limit) break;
    const materiaId = autoria.materia;
    if (!materiaId) continue;
    try {
      const materia = await saplFetch<{
        id: number;
        numero?: number;
        ano?: number;
        ementa?: string;
        data_apresentacao?: string;
        tipo?: number;
        resultado?: string;
        em_tramitacao?: boolean;
        __str__?: string;
      }>(config.baseUrl, `/api/materia/materialegislativa/${materiaId}/`);
      const sigla = await tipoSigla(config.baseUrl, materia.tipo);
      propositions.push({
        externalId: String(materia.id),
        siglaTipo: sigla,
        numero: materia.numero ?? null,
        ano: materia.ano ?? null,
        ementa: materia.ementa?.trim() || materia.__str__ || null,
        dataApresentacao: materia.data_apresentacao?.slice(0, 10) || null,
        statusResumo: materia.resultado?.trim()
          || (materia.em_tramitacao ? "Em tramitação" : null),
        urlPublica: `${config.baseUrl}/materia/${materia.id}`,
        authorExternalId: externalId,
      });
    } catch {
      // matéria individual pode falhar; segue
    }
  }

  return { affiliations, mandates, propositions };
}

async function loadProfileFixture(
  source: string,
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
    return data[source]?.[externalId] ?? data[source]?.default ?? null;
  } catch {
    return null;
  }
}

export function createSaplAdapter(config: SaplHouseConfig): StateAssemblyAdapter {
  const catalog = ASSEMBLY_CATALOG.find((c) => c.source === config.source);
  const fixtureFallback = createFixtureAdapter(
    (catalog ?? {
      source: config.source,
      uf: config.uf as AssemblyCatalogEntry["uf"],
      name: config.name,
      docsUrl: config.docsUrl,
    }) as AssemblyCatalogEntry,
  );

  const info: AssemblyInfo = {
    source: config.source,
    uf: config.uf,
    name: config.name,
    sphere: "estadual_deputado",
    coverage: {
      search: true,
      profile: true,
      propositions: true,
      votes: false,
      attendance: false,
    },
    docsUrl: config.docsUrl ?? catalog?.docsUrl,
  };

  return {
    info,

    async listParliamentarians() {
      try {
        const rows = await saplFetchAllPages<SaplParlamentar>(
          config.baseUrl,
          "/api/parlamentares/parlamentar/?ativo=True",
          10,
        );
        const mapped = rows
          .map(mapParlamentar)
          .filter((r): r is AdapterParliamentarian => !!r);
        if (mapped.length === 0) {
          throw new Error("SAPL retornou lista vazia");
        }
        return mapped;
      } catch (error) {
        if (process.env.SAPL_REQUIRE_LIVE === "1") throw error;
        console.warn(
          `[sapl:${config.source}] API indisponível; usando fixture:`,
          error instanceof Error ? error.message : error,
        );
        return fixtureFallback.listParliamentarians();
      }
    },

    async listPropositions(authorExternalId: string) {
      const bundle = await this.fetchProfileBundle!(authorExternalId);
      return bundle.propositions;
    },

    async fetchProfileBundle(externalId: string) {
      try {
        return await loadProfileLive(config, externalId);
      } catch (error) {
        if (process.env.SAPL_REQUIRE_LIVE === "1") throw error;
        console.warn(
          `[sapl:${config.source}] perfil ${externalId} indisponível; fixture:`,
          error instanceof Error ? error.message : error,
        );
        const fixture = await loadProfileFixture(config.source, externalId);
        if (fixture) return fixture;
        throw error;
      }
    },
  };
}

export function createAllSaplAdapters(): StateAssemblyAdapter[] {
  return SAPL_HOUSES.map(createSaplAdapter);
}

export const SAPL_SOURCES = new Set(SAPL_HOUSES.map((h) => h.source));
