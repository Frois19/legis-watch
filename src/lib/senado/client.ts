import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SenadoListRow, SenadoParliamentarian } from "./types";

const SENADO_LIST_URL =
  process.env.SENADO_API_BASE ??
  "https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json";

function httpsPhoto(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

function mapIdentificacao(
  idn: Record<string, unknown>,
  mandato?: Record<string, unknown>,
  raw?: unknown,
): SenadoParliamentarian | null {
  const codigo = String(idn.CodigoParlamentar ?? "").trim();
  const nome = String(idn.NomeParlamentar ?? "").trim();
  if (!codigo || !nome) return null;
  return {
    externalId: codigo,
    nome,
    nomeCivil: (idn.NomeCompletoParlamentar as string | undefined)?.trim() || null,
    nomeEleitoral: nome,
    siglaPartido:
      (idn.SiglaPartidoParlamentar as string | undefined)?.trim() || null,
    siglaUf: (idn.UfParlamentar as string | undefined)?.trim() || null,
    email: (idn.EmailParlamentar as string | undefined)?.trim() || null,
    urlFoto: httpsPhoto(idn.UrlFotoParlamentar as string | undefined),
    urlPagina: httpsPhoto(idn.UrlPaginaParlamentar as string | undefined),
    situacao: "Exercício",
    participacao:
      (mandato?.DescricaoParticipacao as string | undefined)?.trim() || null,
    raw,
  };
}

function mapFixtureRow(row: SenadoListRow): SenadoParliamentarian | null {
  return mapIdentificacao(
    {
      CodigoParlamentar: row.CodigoParlamentar,
      NomeParlamentar: row.NomeParlamentar,
      NomeCompletoParlamentar: row.NomeCompletoParlamentar,
      SiglaPartidoParlamentar: row.SiglaPartidoParlamentar,
      UfParlamentar: row.UfParlamentar,
      EmailParlamentar: row.EmailParlamentar,
      UrlFotoParlamentar: row.UrlFotoParlamentar,
      UrlPaginaParlamentar: row.UrlPaginaParlamentar,
    },
    { DescricaoParticipacao: row.DescricaoParticipacao },
    row,
  );
}

async function loadFixture(): Promise<SenadoParliamentarian[]> {
  const file = path.join(
    process.cwd(),
    "src/lib/senado/fixtures/senadores-atual.json",
  );
  const raw = await readFile(file, "utf8");
  const rows = JSON.parse(raw) as SenadoListRow[];
  return rows
    .map(mapFixtureRow)
    .filter((r): r is SenadoParliamentarian => !!r);
}

type LiveListPayload = {
  ListaParlamentarEmExercicio?: {
    Parlamentares?: {
      Parlamentar?: Array<{
        IdentificacaoParlamentar?: Record<string, unknown>;
        Mandato?: Record<string, unknown>;
      }>;
    };
  };
};

export async function listSenadoresAtual(): Promise<SenadoParliamentarian[]> {
  try {
    const response = await fetch(SENADO_LIST_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(
        Number(process.env.SENADO_TIMEOUT_MS ?? 20_000),
      ),
    });
    if (!response.ok) {
      throw new Error(`Senado HTTP ${response.status}`);
    }
    const data = (await response.json()) as LiveListPayload;
    const rows =
      data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? [];
    const mapped = rows
      .map((row) =>
        mapIdentificacao(
          row.IdentificacaoParlamentar ?? {},
          row.Mandato,
          row,
        ),
      )
      .filter((r): r is SenadoParliamentarian => !!r);
    if (mapped.length === 0) {
      throw new Error("Senado retornou lista vazia");
    }
    return mapped;
  } catch (error) {
    if (process.env.SENADO_REQUIRE_LIVE === "1") throw error;
    console.warn(
      "[senado] API indisponível; usando fixture local:",
      error instanceof Error ? error.message : error,
    );
    return loadFixture();
  }
}
