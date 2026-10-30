import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { cachedFetchText } from "@/lib/cache/http-cache";
import { readJsonCache, writeJsonCache } from "../file-cache";
import type {
  AdapterParliamentarian,
  AdapterProfileBundle,
  AdapterProposition,
  StateAssemblyAdapter,
} from "../types";
import { createFixtureAdapter } from "./fixture-assembly";
import { ASSEMBLY_CATALOG } from "../ufs";

const execFileAsync = promisify(execFile);

const ALESP_DEPUTADOS_URL =
  process.env.ALESP_DEPUTADOS_URL ??
  "https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml";
const ALESP_PROPOSITURAS_URL =
  process.env.ALESP_PROPOSITURAS_URL ??
  "https://www.al.sp.gov.br/repositorioDados/processo_legislativo/proposituras.zip";
const ALESP_AUTORES_URL =
  process.env.ALESP_AUTORES_URL ??
  "https://www.al.sp.gov.br/repositorioDados/processo_legislativo/documento_autor.zip";
const ALESP_NATUREZAS_URL =
  process.env.ALESP_NATUREZAS_URL ??
  "https://www.al.sp.gov.br/repositorioDados/processo_legislativo/naturezasSpl.xml";

const SITUACAO: Record<string, string> = {
  EXE: "Exercício",
  LIC: "Licenciado",
  REN: "Renunciou",
  REL: "Renunciou (outro cargo)",
  CAS: "Cassado",
  FAL: "Falecido",
  OUT: "Outros",
};

type PropIndex = {
  byDeputy: Record<string, AdapterProposition[]>;
};

let memoryIndex: { expiresAt: number; payload: PropIndex } | null = null;

function timeoutMs() {
  return Number(process.env.ALESP_TIMEOUT_MS ?? 120_000);
}

function cacheTtlMs() {
  return Number(process.env.ALESP_CACHE_TTL_MS ?? 12 * 60 * 60 * 1000);
}

function propositionYears(): number[] {
  const raw = process.env.ALESP_PROP_YEARS;
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

function tag(block: string, name: string): string | null {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  if (!match?.[1]) return null;
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() || null;
}

function mapBlock(block: string): AdapterParliamentarian | null {
  const id = tag(block, "IdDeputado");
  const nome = tag(block, "NomeParlamentar");
  if (!id || !nome) return null;
  const situacaoRaw = tag(block, "Situacao")?.toUpperCase() ?? "";
  return {
    externalId: id,
    nome,
    nomeEleitoral: nome,
    siglaPartido: tag(block, "Partido"),
    email: tag(block, "Email"),
    situacao: SITUACAO[situacaoRaw] ?? (situacaoRaw || "Exercício"),
    raw: {
      idSPL: tag(block, "IdSPL"),
      matricula: tag(block, "Matricula"),
      telefone: tag(block, "Telefone"),
      biografia: tag(block, "Biografia"),
    },
  };
}

export function parseDeputadosXml(xml: string): AdapterParliamentarian[] {
  const blocks = xml.match(/<Deputado>[\s\S]*?<\/Deputado>/gi) ?? [];
  return blocks
    .map(mapBlock)
    .filter((r): r is AdapterParliamentarian => !!r);
}

export function parseNaturezasXml(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const blocks =
    xml.match(/<idNatureza>\d+<\/idNatureza>[\s\S]*?(?=<idNatureza>|$)/gi) ??
    [];
  for (const block of blocks) {
    const id = tag(`<x>${block}</x>`, "idNatureza");
    if (!id) continue;
    const sg = tag(`<x>${block}</x>`, "sgNatureza");
    const nm = tag(`<x>${block}</x>`, "nmNatureza");
    out[id] = (sg || nm || id).trim();
  }
  return out;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string): Promise<string> {
  return cachedFetchText(url, {
    namespace: "alesp",
    headers: { Accept: "*/*" },
    timeoutMs: timeoutMs(),
    ttlMs: cacheTtlMs(),
  });
}

async function fetchZipXml(url: string): Promise<string> {
  // ZIP binário: baixa via fetch e ainda indexa o XML resultante no cache de índice.
  const response = await fetch(url, {
    headers: { Accept: "application/zip,*/*" },
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!response.ok) throw new Error(`ALESP HTTP ${response.status} em ${url}`);
  const buf = Buffer.from(await response.arrayBuffer());
  const dir = await mkdtemp(path.join(tmpdir(), "alesp-zip-"));
  const zipPath = path.join(dir, "data.zip");
  try {
    await writeFile(zipPath, buf);
    const { stdout } = await execFileAsync("unzip", ["-Z1", zipPath], {
      maxBuffer: 2 * 1024 * 1024,
    });
    const entry =
      stdout
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.toLowerCase().endsWith(".xml")) ?? "";
    if (!entry) throw new Error("ALESP zip sem XML");
    const { stdout: xml } = await execFileAsync(
      "unzip",
      ["-p", zipPath, entry],
      { maxBuffer: 256 * 1024 * 1024, encoding: "utf8" },
    );
    return xml;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function isoDate(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

export function buildAlespPropositionIndex(input: {
  deputies: AdapterParliamentarian[];
  autoresXml: string;
  propositurasXml: string;
  naturezas: Record<string, string>;
  years: number[];
  limit: number;
}): PropIndex {
  const yearSet = new Set(input.years);
  const byId = new Map(input.deputies.map((d) => [d.externalId, d]));
  const byName = new Map(
    input.deputies.map((d) => [normalizeName(d.nome), d.externalId]),
  );

  // autorId -> deputyExternalIds
  const autorToDeps = new Map<string, Set<string>>();
  const docToDeps = new Map<string, Set<string>>();

  const autorBlocks =
    input.autoresXml.match(/<DocumentoAutor>[\s\S]*?<\/DocumentoAutor>/gi) ??
    [];
  for (const block of autorBlocks) {
    const autorId = tag(block, "IdAutor");
    const docId = tag(block, "IdDocumento");
    const nome = tag(block, "NomeAutor");
    if (!autorId || !docId) continue;

    const deps = new Set<string>();
    if (byId.has(autorId)) deps.add(autorId);
    if (nome) {
      const viaName = byName.get(normalizeName(nome));
      if (viaName) deps.add(viaName);
    }
    if (deps.size === 0) continue;

    let set = autorToDeps.get(autorId);
    if (!set) {
      set = new Set();
      autorToDeps.set(autorId, set);
    }
    for (const depId of deps) set.add(depId);

    let docs = docToDeps.get(docId);
    if (!docs) {
      docs = new Set();
      docToDeps.set(docId, docs);
    }
    for (const depId of deps) docs.add(depId);
  }

  const collected = new Map<string, AdapterProposition[]>();
  for (const dep of input.deputies) collected.set(dep.externalId, []);

  const propBlocks =
    input.propositurasXml.match(/<propositura>[\s\S]*?<\/propositura>/gi) ?? [];
  for (const block of propBlocks) {
    const docId = tag(block, "IdDocumento");
    if (!docId) continue;
    const depIds = docToDeps.get(docId);
    if (!depIds || depIds.size === 0) continue;

    const ano = Number(tag(block, "AnoLegislativo"));
    if (!Number.isFinite(ano) || !yearSet.has(ano)) continue;

    const numero = Number(tag(block, "NroLegislativo"));
    const naturezaId = tag(block, "IdNatureza");
    const siglaTipo = naturezaId
      ? input.naturezas[naturezaId] || null
      : null;
    const ementa = tag(block, "Ementa");
    const data =
      isoDate(tag(block, "DtEntradaSistema")) ||
      isoDate(tag(block, "DtPublicacao"));

    const prop: AdapterProposition = {
      externalId: docId,
      siglaTipo,
      numero: Number.isFinite(numero) ? numero : null,
      ano,
      ementa,
      dataApresentacao: data,
      statusResumo: null,
      urlPublica: `https://www.al.sp.gov.br/propositura/?id=${docId}`,
    };

    for (const depId of depIds) {
      const list = collected.get(depId);
      if (!list) continue;
      list.push({ ...prop, authorExternalId: depId });
    }
  }

  const byDeputy: Record<string, AdapterProposition[]> = {};
  for (const [depId, list] of collected) {
    list.sort((a, b) => {
      const ay = a.ano ?? 0;
      const by = b.ano ?? 0;
      if (by !== ay) return by - ay;
      return (b.numero ?? 0) - (a.numero ?? 0);
    });
    byDeputy[depId] = list.slice(0, input.limit);
  }
  return { byDeputy };
}

async function loadFixtureRows(): Promise<AdapterParliamentarian[]> {
  const catalog = ASSEMBLY_CATALOG.find((c) => c.source === "alesp")!;
  return createFixtureAdapter(catalog).listParliamentarians();
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
    return data.alesp?.[externalId] ?? data.alesp?.default ?? null;
  } catch {
    return null;
  }
}

async function ensurePropositionIndex(
  deputies: AdapterParliamentarian[],
): Promise<PropIndex> {
  if (memoryIndex && memoryIndex.expiresAt > Date.now()) {
    return memoryIndex.payload;
  }
  const disk = await readJsonCache<PropIndex>("alesp-props-v1.json");
  if (disk) {
    memoryIndex = disk;
    return disk.payload;
  }

  const [naturezasXml, autoresXml, propositurasXml] = await Promise.all([
    fetchText(ALESP_NATUREZAS_URL),
    fetchZipXml(ALESP_AUTORES_URL),
    fetchZipXml(ALESP_PROPOSITURAS_URL),
  ]);
  const index = buildAlespPropositionIndex({
    deputies,
    autoresXml,
    propositurasXml,
    naturezas: parseNaturezasXml(naturezasXml),
    years: propositionYears(),
    limit: Math.max(propositionLimit(), 120),
  });
  memoryIndex = { expiresAt: Date.now() + cacheTtlMs(), payload: index };
  await writeJsonCache("alesp-props-v1.json", index, cacheTtlMs());
  return index;
}

export function clearAlespCaches() {
  memoryIndex = null;
}

export const alespAdapter: StateAssemblyAdapter = {
  info: {
    source: "alesp",
    uf: "SP",
    name: "Assembleia Legislativa de São Paulo",
    sphere: "estadual_deputado",
    dataMode: "live",
    coverage: {
      search: true,
      profile: true,
      propositions: true,
      votes: false,
      attendance: false,
    },
    docsUrl: "https://www.al.sp.gov.br/dados-abertos/",
  },

  async listParliamentarians() {
    try {
      const xml = await fetchText(ALESP_DEPUTADOS_URL);
      const mapped = parseDeputadosXml(xml);
      if (mapped.length === 0) throw new Error("ALESP retornou lista vazia");
      return mapped;
    } catch (error) {
      if (process.env.ALESP_REQUIRE_LIVE === "1") throw error;
      console.warn(
        "[alesp] API indisponível; usando fixture:",
        error instanceof Error ? error.message : error,
      );
      return loadFixtureRows();
    }
  },

  async getParliamentarian(externalId: string) {
    const rows = await this.listParliamentarians();
    return rows.find((r) => r.externalId === String(externalId)) ?? null;
  },

  async listPropositions(authorExternalId: string) {
    const deputies = await this.listParliamentarians();
    const index = await ensurePropositionIndex(deputies);
    return (index.byDeputy[String(authorExternalId)] ?? []).slice(
      0,
      propositionLimit(),
    );
  },

  async fetchProfileBundle(externalId: string) {
    try {
      const deputies = await this.listParliamentarians();
      const index = await ensurePropositionIndex(deputies);
      return {
        affiliations: [],
        mandates: [],
        propositions: (index.byDeputy[String(externalId)] ?? []).slice(
          0,
          propositionLimit(),
        ),
      };
    } catch (error) {
      if (process.env.ALESP_REQUIRE_LIVE === "1") throw error;
      console.warn(
        `[alesp] perfil ${externalId} indisponível; fixture:`,
        error instanceof Error ? error.message : error,
      );
      const fixture = await loadProfileFixture(externalId);
      if (fixture) return fixture;
      throw error;
    }
  },
};
