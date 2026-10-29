import { readFile } from "node:fs/promises";
import path from "node:path";
import { cachedFetchJson, cachedFetchText } from "@/lib/cache/http-cache";
import { slugifyExternalId } from "../slug";
import type {
  AdapterParliamentarian,
  AdapterProfileBundle,
  AdapterProposition,
  StateAssemblyAdapter,
} from "../types";

type AlepeRow = {
  nomeParlamentar?: string;
  nome?: string;
  partido?: string;
  email?: string;
  foto?: string;
  situacao?: string;
};

const ALEPE_URL =
  process.env.ALEPE_API_BASE ??
  "https://dadosabertos.alepe.pe.gov.br/api/v1/parlamentares/?formato=json";

const ALEPE_PROP_BASE =
  process.env.ALEPE_PROP_BASE ??
  "https://dadosabertos.alepe.pe.gov.br/api/v1/proposicoes";

const PROP_TYPES = [
  { path: "projetos", sigla: "PL" },
  { path: "indicacoes", sigla: "IND" },
  { path: "requerimentos", sigla: "REQ" },
] as const;

function timeoutMs() {
  return Number(process.env.ALEPE_TIMEOUT_MS ?? 20_000);
}

function propositionYears(): number[] {
  const raw = process.env.ALEPE_PROP_YEARS;
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

function cacheTtlMs() {
  return Number(process.env.ALEPE_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);
}

function mapRow(row: AlepeRow): AdapterParliamentarian | null {
  const nome = (row.nomeParlamentar || row.nome || "").trim();
  if (!nome) return null;
  return {
    externalId: slugifyExternalId(nome),
    nome,
    nomeEleitoral: nome,
    siglaPartido: row.partido?.trim() || null,
    email: row.email?.trim() || null,
    urlFoto: row.foto?.trim() || null,
    situacao: row.situacao?.trim() || "Exercício",
    raw: row,
  };
}

async function loadFixture(): Promise<AdapterParliamentarian[]> {
  const file = path.join(
    process.cwd(),
    "src/lib/parliament/fixtures/alepe-parlamentares.json",
  );
  const raw = await readFile(file, "utf8");
  const rows = JSON.parse(raw) as AlepeRow[];
  return rows.map(mapRow).filter((r): r is AdapterParliamentarian => !!r);
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
    return data.alepe?.[externalId] ?? data.alepe?.default ?? null;
  } catch {
    return null;
  }
}

function tag(block: string, name: string): string | null {
  const match = block.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"),
  );
  if (!match?.[1]) return null;
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() || null;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai proposições de XML ALEPE (listagem ou detalhe). */
export function parseAlepePropositionsXml(
  xml: string,
  opts: { siglaTipo: string; authorSlug?: string; authorName?: string },
): AdapterProposition[] {
  const blocks =
    xml.match(
      /<(?:projeto|indicacao|requerimento|proposicao|item)[\s\S]*?<\/(?:projeto|indicacao|requerimento|proposicao|item)>/gi,
    ) ?? [];
  const out: AdapterProposition[] = [];
  const wantedSlug = opts.authorSlug;
  const wantedName = opts.authorName
    ? normalizeName(opts.authorName)
    : null;

  for (const block of blocks) {
    const autor =
      tag(block, "autor") ||
      tag(block, "autores") ||
      tag(block, "nomeAutor") ||
      tag(block, "deputado") ||
      tag(block, "parlamentar");
    if (wantedSlug || wantedName) {
      if (!autor) continue;
      const autorSlug = slugifyExternalId(autor);
      const autorNorm = normalizeName(autor);
      const ok =
        (wantedSlug && autorSlug === wantedSlug) ||
        (wantedName &&
          (autorNorm === wantedName || autorNorm.includes(wantedName)));
      if (!ok) continue;
    }

    const numero = Number(
      tag(block, "numero") || tag(block, "Numero") || tag(block, "nro"),
    );
    const ano = Number(tag(block, "ano") || tag(block, "Ano"));
    const ementa =
      tag(block, "ementa") ||
      tag(block, "Ementa") ||
      tag(block, "resumo") ||
      null;
    const data =
      tag(block, "data") ||
      tag(block, "dataApresentacao") ||
      tag(block, "Data") ||
      null;
    const externalId =
      tag(block, "id") ||
      [opts.siglaTipo, Number.isFinite(numero) ? numero : "x", Number.isFinite(ano) ? ano : "x"].join(
        "-",
      );

    out.push({
      externalId,
      siglaTipo: opts.siglaTipo,
      numero: Number.isFinite(numero) ? numero : null,
      ano: Number.isFinite(ano) ? ano : null,
      ementa,
      dataApresentacao: data ? data.slice(0, 10) : null,
      statusResumo:
        tag(block, "situacao") || tag(block, "status") || null,
      urlPublica: null,
      authorExternalId: wantedSlug ?? null,
    });
  }
  return out;
}

async function fetchXml(url: string): Promise<string> {
  return cachedFetchText(url, {
    namespace: "alepe",
    headers: { Accept: "application/xml,text/xml,*/*" },
    timeoutMs: timeoutMs(),
    ttlMs: cacheTtlMs(),
  });
}

async function fetchPropositionsForAuthor(
  author: AdapterParliamentarian,
): Promise<AdapterProposition[]> {
  const years = propositionYears();
  const limit = propositionLimit();
  const collected: AdapterProposition[] = [];
  const seen = new Set<string>();

  for (const year of years) {
    for (const tipo of PROP_TYPES) {
      const url = `${ALEPE_PROP_BASE.replace(/\/$/, "")}/${tipo.path}/?ano=${year}&formato=xml`;
      try {
        const xml = await fetchXml(url);
        const rows = parseAlepePropositionsXml(xml, {
          siglaTipo: tipo.sigla,
          authorSlug: author.externalId,
          authorName: author.nome,
        });
        for (const row of rows) {
          if (seen.has(row.externalId)) continue;
          seen.add(row.externalId);
          collected.push(row);
        }
      } catch (error) {
        console.warn(
          `[alepe] proposições ${tipo.path}/${year}:`,
          error instanceof Error ? error.message : error,
        );
      }
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

export const alepeAdapter: StateAssemblyAdapter = {
  info: {
    source: "alepe",
    uf: "PE",
    name: "Assembleia Legislativa de Pernambuco",
    sphere: "estadual_deputado",
    coverage: {
      search: true,
      profile: true,
      propositions: true,
      votes: false,
      attendance: false,
    },
    docsUrl: "https://dadosabertos.alepe.pe.gov.br/?documentacao=parlamentares",
  },

  async listParliamentarians() {
    try {
      const data = await cachedFetchJson<AlepeRow[] | { dados?: AlepeRow[] }>(
        ALEPE_URL,
        {
          namespace: "alepe",
          headers: { Accept: "application/json" },
          timeoutMs: timeoutMs(),
          ttlMs: cacheTtlMs(),
        },
      );
      const rows = Array.isArray(data) ? data : (data.dados ?? []);
      const mapped = rows
        .map(mapRow)
        .filter((r): r is AdapterParliamentarian => !!r);
      if (mapped.length === 0) {
        throw new Error("ALEPE retornou lista vazia");
      }
      return mapped;
    } catch (error) {
      if (process.env.ALEPE_REQUIRE_LIVE === "1") throw error;
      console.warn(
        "[alepe] API indisponível; usando fixture local:",
        error instanceof Error ? error.message : error,
      );
      return loadFixture();
    }
  },

  async getParliamentarian(externalId: string) {
    const rows = await this.listParliamentarians();
    return rows.find((r) => r.externalId === String(externalId)) ?? null;
  },

  async listPropositions(authorExternalId: string) {
    const author = await this.getParliamentarian?.(authorExternalId);
    if (!author) return [];
    try {
      return await fetchPropositionsForAuthor(author);
    } catch {
      const fixture = await loadProfileFixture(authorExternalId);
      return fixture?.propositions ?? [];
    }
  },

  async fetchProfileBundle(externalId: string) {
    try {
      const author = await this.getParliamentarian?.(externalId);
      if (!author) {
        const fixture = await loadProfileFixture(externalId);
        if (fixture) return fixture;
        return { affiliations: [], mandates: [], propositions: [] };
      }
      const propositions = await fetchPropositionsForAuthor(author);
      if (propositions.length === 0) {
        const fixture = await loadProfileFixture(externalId);
        if (fixture?.propositions?.length) {
          return {
            affiliations: fixture.affiliations ?? [],
            mandates: fixture.mandates ?? [],
            propositions: fixture.propositions,
          };
        }
      }
      return { affiliations: [], mandates: [], propositions };
    } catch (error) {
      if (process.env.ALEPE_REQUIRE_LIVE === "1") throw error;
      console.warn(
        `[alepe] perfil ${externalId} indisponível; fixture:`,
        error instanceof Error ? error.message : error,
      );
      const fixture = await loadProfileFixture(externalId);
      if (fixture) return fixture;
      throw error;
    }
  },
};
