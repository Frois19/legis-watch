import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  cachedFetchJson,
  fetchBufferWithRetry,
} from "@/lib/cache/http-cache";
import { readJsonCache, writeJsonCache } from "../file-cache";
import type { AdapterParliamentarian, AdapterVote } from "../types";
import {
  brDateTimeToIsoDate,
  extractNominalVotes,
  parseXlsxSheetRows,
  sheetMetaMap,
} from "../xlsx-sheet";
import { authorMatchesDeputy } from "./alep-names";

const execFileAsync = promisify(execFile);

type SessaoMap = Record<string, string>;

type DadosAbertosPayload = {
  arquivo?: string;
  descricao?: string;
  nome_arquivo?: string;
  error?: string;
  mensagem?: string;
};

export type AlepVoteIndex = {
  byAuthor: Record<string, AdapterVote[]>;
};

function transparenciaBase() {
  return (
    process.env.ALEP_TRANSPARENCIA_BASE ??
    "https://transparencia.assembleia.pr.leg.br/api"
  ).replace(/\/$/, "");
}

function timeoutMs() {
  return Number(process.env.ALEP_TIMEOUT_MS ?? 30_000);
}

function cacheTtlMs() {
  return Number(process.env.ALEP_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000);
}

export function voteYears(): number[] {
  const raw = process.env.ALEP_VOTE_YEARS ?? process.env.ALEP_PROP_YEARS;
  if (raw) {
    return raw
      .split(",")
      .map((y) => Number(y.trim()))
      .filter((y) => Number.isFinite(y));
  }
  const current = new Date().getUTCFullYear();
  return [current, current - 1];
}

function sessionLimit() {
  return Number(process.env.ALEP_VOTE_SESSION_LIMIT ?? 20);
}

function voteLimit() {
  return Number(process.env.ESTADUAL_VOTE_LIMIT ?? 100);
}

/** Extrai id interno da votação do nome do arquivo XLSX. */
export function voteIdFromXlsxName(
  fileName: string,
  sessionId: string,
): string {
  const base = path.basename(fileName);
  const m = base.match(/--ITEM-(\d+)-(\d+)-/i);
  if (m) return `${sessionId}:${m[2]}`;
  const safe = base.replace(/[^\w.-]+/g, "_").slice(0, 80);
  return `${sessionId}:${safe}`;
}

export function normalizeTipoVoto(raw: string): string {
  const v = raw.trim().toUpperCase();
  if (v === "SIM") return "Sim";
  if (v === "NÃO" || v === "NAO") return "Não";
  if (v.includes("ABST")) return "Abstenção";
  if (v.includes("NÃO VOTOU") || v.includes("NAO VOTOU")) return "Não votou";
  if (v.includes("OBSTR")) return "Obstrução";
  return raw.trim() || "—";
}

export type ParsedAlepVoteRow = AdapterVote & { parlamentar: string };

export function parseAlepVoteSheet(
  sheetXml: string,
  sharedXml: string | null,
  sessionId: string,
  fileName: string,
): ParsedAlepVoteRow[] {
  const rows = parseXlsxSheetRows(sheetXml, sharedXml);
  const meta = sheetMetaMap(rows);
  const dataSessao = brDateTimeToIsoDate(meta["DATA"] ?? null);
  const materiaIdentificacao =
    rows[0]?.[1]?.trim() ||
    meta["ASSUNTO"] ||
    path.basename(fileName).replace(/\.xlsx$/i, "");
  const ementa = meta["EMENTA"] ?? null;
  const resultado =
    meta["RESULTADO DA VOTAÇÃO"] ?? meta["RESULTADO DA VOTACAO"] ?? null;
  const sessaoNome =
    meta["SESSÃO / REUNIÃO"] ?? meta["SESSAO / REUNIAO"] ?? null;
  const modelo = meta["MODELO"] ?? null;
  const descricaoVotacao =
    [sessaoNome, modelo].filter(Boolean).join(" · ") || null;
  const externalId = voteIdFromXlsxName(fileName, sessionId);
  const votes = extractNominalVotes(rows);
  return votes.map((row) => ({
    externalId: `${externalId}:${hashName(row.parlamentar)}`,
    tipoVoto: normalizeTipoVoto(row.voto),
    descricaoVotacao,
    descricaoResultado: resultado,
    dataSessao,
    materiaExternalId: externalId,
    materiaIdentificacao,
    materiaEmenta: ementa,
    urlPublica: null,
    parlamentar: row.parlamentar,
  }));
}

function hashName(nome: string): string {
  let h = 0;
  const n = nome.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  for (let i = 0; i < n.length; i += 1) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

async function listSessions(year: number): Promise<Array<{ id: string; nome: string }>> {
  const url = `${transparenciaBase()}/votacoes/sessoes?ano=${year}`;
  const payload = await cachedFetchJson<SessaoMap>(url, {
    namespace: "alep",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeoutMs: timeoutMs(),
    ttlMs: cacheTtlMs(),
  });
  return Object.entries(payload)
    .map(([id, nome]) => ({ id: String(id), nome: String(nome) }))
    .sort((a, b) => Number(b.id) - Number(a.id));
}

async function openDataUrl(sessionId: string): Promise<string | null> {
  const url = `${transparenciaBase()}/votacoes/dados-abertos?sessao=${sessionId}`;
  try {
    const payload = await cachedFetchJson<DadosAbertosPayload>(url, {
      namespace: "alep",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      timeoutMs: timeoutMs(),
      ttlMs: cacheTtlMs(),
    });
    return payload.arquivo?.trim() || null;
  } catch {
    return null;
  }
}

async function unzipList(zipPath: string): Promise<string[]> {
  const { stdout } = await execFileAsync("unzip", ["-Z1", zipPath], {
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

async function unzipEntry(zipPath: string, entry: string): Promise<Buffer> {
  const { stdout } = await execFileAsync("unzip", ["-p", zipPath, entry], {
    maxBuffer: 32 * 1024 * 1024,
    encoding: "buffer",
  });
  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
}

async function parseSessionZip(
  zipBuf: Buffer,
  sessionId: string,
): Promise<ParsedAlepVoteRow[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "alep-vote-"));
  const zipPath = path.join(dir, "sessao.zip");
  try {
    await writeFile(zipPath, zipBuf);
    const entries = await unzipList(zipPath);
    const xlsxEntries = entries.filter((e) =>
      e.toLowerCase().endsWith(".xlsx"),
    );
    const collected: ParsedAlepVoteRow[] = [];

    for (const entry of xlsxEntries) {
      const xlsxBuf = await unzipEntry(zipPath, entry);
      const xDir = await mkdtemp(path.join(dir, "x-"));
      const xPath = path.join(xDir, "vote.xlsx");
      await writeFile(xPath, xlsxBuf);
      try {
        const inner = await unzipList(xPath);
        const sheetEntry =
          inner.find((e) => /xl\/worksheets\/sheet1\.xml$/i.test(e)) ?? null;
        const sharedEntry =
          inner.find((e) => /xl\/sharedStrings\.xml$/i.test(e)) ?? null;
        if (!sheetEntry) continue;
        const sheetXml = (await unzipEntry(xPath, sheetEntry)).toString("utf8");
        const sharedXml = sharedEntry
          ? (await unzipEntry(xPath, sharedEntry)).toString("utf8")
          : null;
        collected.push(
          ...parseAlepVoteSheet(sheetXml, sharedXml, sessionId, entry),
        );
      } finally {
        await rm(xDir, { recursive: true, force: true });
      }
    }
    return collected;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Indexa votos nominais recentes (ZIPs por sessão) agrupados por matrícula do deputado.
 */
export async function buildAlepVoteIndex(
  deputies: AdapterParliamentarian[],
): Promise<AlepVoteIndex> {
  const years = voteYears();
  const limitSessions = sessionLimit();
  const limitVotes = voteLimit();
  const cacheName = `alep-votes-${years.join("-")}-s${limitSessions}.json`;
  const cached = await readJsonCache<AlepVoteIndex>(cacheName);
  if (cached) return cached.payload;

  const byAuthor: Record<string, AdapterVote[]> = {};
  for (const dep of deputies) byAuthor[dep.externalId] = [];

  let sessionsDone = 0;
  for (const year of years) {
    if (sessionsDone >= limitSessions) break;
    let sessions: Array<{ id: string; nome: string }>;
    try {
      sessions = await listSessions(year);
    } catch (error) {
      console.warn(
        `[alep] sessões voto ${year}:`,
        error instanceof Error ? error.message : error,
      );
      continue;
    }

    for (const sessao of sessions) {
      if (sessionsDone >= limitSessions) break;
      const arquivo = await openDataUrl(sessao.id);
      if (!arquivo) continue;
      try {
        const buf = await fetchBufferWithRetry(arquivo, {
          namespace: "alep-zip",
          headers: { Accept: "application/zip,*/*" },
          timeoutMs: Math.max(timeoutMs(), 60_000),
        });
        const rows = await parseSessionZip(buf, sessao.id);
        for (const row of rows) {
          for (const dep of deputies) {
            if (!authorMatchesDeputy(row.parlamentar, dep.nome)) continue;
            const { parlamentar: _, ...vote } = row;
            const bucket = byAuthor[dep.externalId]!;
            if (bucket.some((v) => v.externalId === vote.externalId)) continue;
            bucket.push(vote);
          }
        }
        sessionsDone += 1;
      } catch (error) {
        console.warn(
          `[alep] zip sessão ${sessao.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  for (const id of Object.keys(byAuthor)) {
    byAuthor[id]!.sort((a, b) =>
      (b.dataSessao ?? "").localeCompare(a.dataSessao ?? ""),
    );
    byAuthor[id] = byAuthor[id]!.slice(0, limitVotes);
  }

  const index: AlepVoteIndex = { byAuthor };
  await writeJsonCache(cacheName, index, cacheTtlMs());
  return index;
}

