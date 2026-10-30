import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AdapterParliamentarian,
  AssemblyInfo,
  StateAssemblyAdapter,
} from "../types";
import { slugifyExternalId } from "../slug";
import {
  ASSEMBLY_CATALOG,
  type AssemblyCatalogEntry,
  type BrazilUf,
} from "../ufs";

type FixtureRow = {
  nome: string;
  partido?: string;
  email?: string;
  foto?: string;
  situacao?: string;
};

type FixtureMap = Partial<Record<BrazilUf, FixtureRow[]>>;

let fixtureCache: FixtureMap | null = null;

async function loadFixtureMap(): Promise<FixtureMap> {
  if (fixtureCache) return fixtureCache;
  const file = path.join(
    process.cwd(),
    "src/lib/parliament/fixtures/estaduais-por-uf.json",
  );
  const raw = await readFile(file, "utf8");
  fixtureCache = JSON.parse(raw) as FixtureMap;
  return fixtureCache;
}

function mapRow(row: FixtureRow): AdapterParliamentarian {
  return {
    externalId: slugifyExternalId(row.nome),
    nome: row.nome,
    nomeEleitoral: row.nome,
    siglaPartido: row.partido?.trim() || null,
    email: row.email?.trim() || null,
    urlFoto: row.foto?.trim() || null,
    situacao: row.situacao?.trim() || "Exercício",
    raw: { ...row, fixture: true },
  };
}

export function createFixtureAdapter(
  entry: AssemblyCatalogEntry,
): StateAssemblyAdapter {
  const info: AssemblyInfo = {
    source: entry.source,
    uf: entry.uf,
    name: entry.name,
    sphere: "estadual_deputado",
    dataMode: "fixture",
    coverage: {
      search: true,
      profile: true,
      propositions: false,
      votes: false,
      attendance: false,
    },
    docsUrl: entry.docsUrl,
  };

  return {
    info,
    async listParliamentarians() {
      const map = await loadFixtureMap();
      const rows = map[entry.uf as BrazilUf] ?? [];
      if (rows.length === 0) {
        throw new Error(`fixture_vazia:${entry.uf}`);
      }
      return rows.map(mapRow);
    },
  };
}

/** Adapters fixture para todas as UFs do catálogo (inclui PE). */
export function createAllFixtureAdapters(): StateAssemblyAdapter[] {
  return ASSEMBLY_CATALOG.map(createFixtureAdapter);
}

/** Limpa cache (útil em testes). */
export function resetFixtureCache() {
  fixtureCache = null;
}
