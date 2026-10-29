import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AdapterParliamentarian,
  StateAssemblyAdapter,
} from "../types";
import { slugifyExternalId } from "../slug";

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

export const alepeAdapter: StateAssemblyAdapter = {
  info: {
    source: "alepe",
    uf: "PE",
    name: "Assembleia Legislativa de Pernambuco",
    sphere: "estadual_deputado",
    coverage: {
      search: true,
      profile: true,
      propositions: false,
      votes: false,
      attendance: false,
    },
    docsUrl: "https://dadosabertos.alepe.pe.gov.br/?documentacao=parlamentares",
  },

  async listParliamentarians() {
    try {
      const response = await fetch(ALEPE_URL, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(
          Number(process.env.ALEPE_TIMEOUT_MS ?? 15_000),
        ),
      });
      if (!response.ok) {
        throw new Error(`ALEPE HTTP ${response.status}`);
      }
      const data = (await response.json()) as AlepeRow[] | { dados?: AlepeRow[] };
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
};
