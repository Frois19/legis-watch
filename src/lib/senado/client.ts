import { readFile } from "node:fs/promises";
import path from "node:path";
import { cachedFetchJson } from "@/lib/cache/http-cache";
import type {
  SenadoAffiliation,
  SenadoListRow,
  SenadoMandate,
  SenadoMatter,
  SenadoParliamentarian,
  SenadoProfileBundle,
  SenadoVote,
} from "./types";
import { SENADO_MATTER_URL } from "./types";

const SENADO_BASE =
  process.env.SENADO_API_ROOT ?? "https://legis.senado.leg.br/dadosabertos";

const SENADO_LIST_URL =
  process.env.SENADO_API_BASE ?? `${SENADO_BASE}/senador/lista/atual.json`;

function httpsPhoto(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//i, "https://");
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

async function loadProfileFixture(
  codigo: string,
): Promise<SenadoProfileBundle | null> {
  const file = path.join(
    process.cwd(),
    "src/lib/senado/fixtures/senador-perfil.json",
  );
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as Record<string, SenadoProfileBundle>;
    return data[codigo] ?? data.default ?? null;
  } catch {
    return null;
  }
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

function senadoTimeoutMs() {
  return Number(process.env.SENADO_TIMEOUT_MS ?? 20_000);
}

function senadoCacheTtlMs() {
  return Number(process.env.SENADO_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);
}

async function senadoFetch<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${SENADO_BASE}${path}`;
  return cachedFetchJson<T>(url, {
    namespace: "senado",
    headers: { Accept: "application/json" },
    timeoutMs: senadoTimeoutMs(),
    ttlMs: senadoCacheTtlMs(),
  });
}

export async function listSenadoresAtual(): Promise<SenadoParliamentarian[]> {
  try {
    const data = await cachedFetchJson<LiveListPayload>(SENADO_LIST_URL, {
      namespace: "senado",
      headers: { Accept: "application/json" },
      timeoutMs: senadoTimeoutMs(),
      ttlMs: senadoCacheTtlMs(),
    });
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

function mapAffiliations(payload: unknown): SenadoAffiliation[] {
  const root = payload as {
    FiliacaoParlamentar?: {
      Parlamentar?: {
        Filiacoes?: { Filiacao?: unknown };
      };
    };
  };
  const rows = asArray(
    root.FiliacaoParlamentar?.Parlamentar?.Filiacoes?.Filiacao as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  );
  return rows.map((row) => {
    const partido = (row.Partido as Record<string, unknown> | undefined) ?? {};
    return {
      codigoPartido: String(partido.CodigoPartido ?? "").trim() || null,
      siglaPartido: String(partido.SiglaPartido ?? "").trim() || null,
      nomePartido: String(partido.NomePartido ?? "").trim() || null,
      dataFiliacao: String(row.DataFiliacao ?? "").trim() || null,
      dataDesfiliacao: String(row.DataDesfiliacao ?? "").trim() || null,
    };
  });
}

function mapMandates(payload: unknown): SenadoMandate[] {
  const root = payload as {
    MandatoParlamentar?: {
      Parlamentar?: {
        Mandatos?: { Mandato?: unknown };
      };
    };
  };
  const rows = asArray(
    root.MandatoParlamentar?.Parlamentar?.Mandatos?.Mandato as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  );
  return rows.map((row) => {
    const first =
      (row.PrimeiraLegislaturaDoMandato as Record<string, unknown> | undefined) ??
      {};
    const second =
      (row.SegundaLegislaturaDoMandato as Record<string, unknown> | undefined) ??
      {};
    const legInicio = Number(first.NumeroLegislatura ?? NaN);
    const legFim = Number(second.NumeroLegislatura ?? first.NumeroLegislatura ?? NaN);
    return {
      codigoMandato: String(row.CodigoMandato ?? "").trim() || null,
      siglaUf: String(row.UfParlamentar ?? "").trim() || null,
      participacao: String(row.DescricaoParticipacao ?? "").trim() || null,
      legislaturaInicio: Number.isFinite(legInicio) ? legInicio : null,
      legislaturaFim: Number.isFinite(legFim) ? legFim : null,
      dataInicio: String(first.DataInicio ?? "").trim() || null,
      dataFim: String(second.DataFim ?? first.DataFim ?? "").trim() || null,
    };
  });
}

function mapMatters(payload: unknown, limit: number): SenadoMatter[] {
  const root = payload as {
    MateriasAutoriaParlamentar?: {
      Parlamentar?: {
        Autorias?: { Autoria?: unknown };
      };
    };
  };
  const rows = asArray(
    root.MateriasAutoriaParlamentar?.Parlamentar?.Autorias?.Autoria as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  );
  const mapped: SenadoMatter[] = [];
  for (const row of rows) {
    if (mapped.length >= limit) break;
    const materia = (row.Materia as Record<string, unknown> | undefined) ?? {};
    const externalId = String(materia.Codigo ?? "").trim();
    if (!externalId) continue;
    const numero = Number(materia.Numero ?? NaN);
    const ano = Number(materia.Ano ?? NaN);
    mapped.push({
      externalId,
      siglaTipo: String(materia.Sigla ?? "").trim() || null,
      numero: Number.isFinite(numero) ? numero : null,
      ano: Number.isFinite(ano) ? ano : null,
      ementa: String(materia.Ementa ?? "").trim() || null,
      dataApresentacao: String(materia.Data ?? "").trim() || null,
      identificacao:
        String(materia.DescricaoIdentificacao ?? "").trim() || null,
      autorPrincipal:
        String(row.IndicadorAutorPrincipal ?? "").trim().toLowerCase() === "sim",
      urlPublica: `${SENADO_MATTER_URL}${externalId}`,
    });
  }
  return mapped;
}

function mapVotes(payload: unknown, limit: number): SenadoVote[] {
  const root = payload as {
    VotacaoParlamentar?: {
      Parlamentar?: {
        Votacoes?: { Votacao?: unknown };
      };
    };
  };
  const rows = asArray(
    root.VotacaoParlamentar?.Parlamentar?.Votacoes?.Votacao as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  );
  const mapped: SenadoVote[] = [];
  for (const row of rows) {
    if (mapped.length >= limit) break;
    const sessao =
      (row.SessaoPlenaria as Record<string, unknown> | undefined) ?? {};
    const materia = (row.Materia as Record<string, unknown> | undefined) ?? {};
    const externalId = String(
      row.CodigoSessaoVotacao ?? `${sessao.CodigoSessao}-${row.Sequencial ?? ""}`,
    ).trim();
    if (!externalId) continue;
    const materiaId = String(materia.Codigo ?? "").trim() || null;
    mapped.push({
      externalId,
      tipoVoto: String(row.SiglaDescricaoVoto ?? "").trim() || null,
      descricaoVotacao: String(row.DescricaoVotacao ?? "").trim() || null,
      descricaoResultado: String(row.DescricaoResultado ?? "").trim() || null,
      dataSessao: String(sessao.DataSessao ?? "").trim() || null,
      materiaExternalId: materiaId,
      materiaIdentificacao:
        String(materia.DescricaoIdentificacao ?? "").trim() || null,
      materiaEmenta: String(materia.Ementa ?? "").trim() || null,
      urlPublica: materiaId ? `${SENADO_MATTER_URL}${materiaId}` : null,
    });
  }
  return mapped;
}

export async function fetchSenatorProfileBundle(
  codigo: string,
  opts?: { matterLimit?: number; voteLimit?: number },
): Promise<SenadoProfileBundle> {
  const matterLimit = opts?.matterLimit ?? Number(process.env.SENADO_MATTER_LIMIT ?? 80);
  const voteLimit = opts?.voteLimit ?? Number(process.env.SENADO_VOTE_LIMIT ?? 100);
  try {
    const [filiacoes, mandatos, autorias, votacoes] = await Promise.all([
      senadoFetch(`/senador/${codigo}/filiacoes.json`),
      senadoFetch(`/senador/${codigo}/mandatos.json`),
      senadoFetch(`/senador/${codigo}/autorias.json`),
      senadoFetch(`/senador/${codigo}/votacoes.json`),
    ]);
    return {
      affiliations: mapAffiliations(filiacoes),
      mandates: mapMandates(mandatos),
      matters: mapMatters(autorias, matterLimit),
      votes: mapVotes(votacoes, voteLimit),
    };
  } catch (error) {
    if (process.env.SENADO_REQUIRE_LIVE === "1") throw error;
    console.warn(
      `[senado] perfil ${codigo} indisponível; tentando fixture:`,
      error instanceof Error ? error.message : error,
    );
    const fixture = await loadProfileFixture(codigo);
    if (fixture) {
      return {
        affiliations: fixture.affiliations ?? [],
        mandates: fixture.mandates ?? [],
        matters: fixture.matters ?? [],
        votes: fixture.votes ?? [],
      };
    }
    throw error;
  }
}

export { mapAffiliations, mapMandates, mapMatters, mapVotes };
