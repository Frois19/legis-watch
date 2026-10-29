import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AdapterParliamentarian,
  StateAssemblyAdapter,
} from "../types";
import { createFixtureAdapter } from "./fixture-assembly";
import { ASSEMBLY_CATALOG } from "../ufs";

const ALESP_DEPUTADOS_URL =
  process.env.ALESP_DEPUTADOS_URL ??
  "https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml";

const SITUACAO: Record<string, string> = {
  EXE: "Exercício",
  LIC: "Licenciado",
  REN: "Renunciou",
  REL: "Renunciou (outro cargo)",
  CAS: "Cassado",
  FAL: "Falecido",
  OUT: "Outros",
};

function timeoutMs() {
  return Number(process.env.ALESP_TIMEOUT_MS ?? 30_000);
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

function parseDeputadosXml(xml: string): AdapterParliamentarian[] {
  const blocks = xml.match(/<Deputado>[\s\S]*?<\/Deputado>/gi) ?? [];
  return blocks
    .map(mapBlock)
    .filter((r): r is AdapterParliamentarian => !!r);
}

async function loadFixture(): Promise<AdapterParliamentarian[]> {
  const catalog = ASSEMBLY_CATALOG.find((c) => c.source === "alesp")!;
  return createFixtureAdapter(catalog).listParliamentarians();
}

export const alespAdapter: StateAssemblyAdapter = {
  info: {
    source: "alesp",
    uf: "SP",
    name: "Assembleia Legislativa de São Paulo",
    sphere: "estadual_deputado",
    coverage: {
      search: true,
      profile: true,
      // Proposituras/presença existem em XML/ZIP grandes; cadastro live primeiro.
      propositions: false,
      votes: false,
      attendance: false,
    },
    docsUrl: "https://www.al.sp.gov.br/dados-abertos/",
  },

  async listParliamentarians() {
    try {
      const response = await fetch(ALESP_DEPUTADOS_URL, {
        headers: { Accept: "application/xml,text/xml,*/*" },
        signal: AbortSignal.timeout(timeoutMs()),
      });
      if (!response.ok) {
        throw new Error(`ALESP HTTP ${response.status}`);
      }
      const xml = await response.text();
      const mapped = parseDeputadosXml(xml);
      if (mapped.length === 0) throw new Error("ALESP retornou lista vazia");
      return mapped;
    } catch (error) {
      if (process.env.ALESP_REQUIRE_LIVE === "1") throw error;
      console.warn(
        "[alesp] API indisponível; usando fixture:",
        error instanceof Error ? error.message : error,
      );
      return loadFixture();
    }
  },

  async getParliamentarian(externalId: string) {
    const rows = await this.listParliamentarians();
    return rows.find((r) => r.externalId === String(externalId)) ?? null;
  },
};

export { parseDeputadosXml };

/** Carrega fixture de perfil se existir (para testes offline). */
export async function loadAlespProfileFixture(externalId: string) {
  const file = path.join(
    process.cwd(),
    "src/lib/parliament/fixtures/estadual-perfil.json",
  );
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    return data.alesp?.[externalId] ?? data.alesp?.default ?? null;
  } catch {
    return null;
  }
}
