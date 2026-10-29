import { SEARCH_CACHE_PREFIX } from "./memory-cache";

export type SearchCacheParams = {
  esfera?: string | null;
  legislaturaId?: string | number | null;
  nome?: string | null;
  siglaPartido?: string | null;
  siglaUf?: string | null;
  page?: string | number | null;
  pageSize?: string | number | null;
};

function token(value: string | number | null | undefined): string {
  if (value == null) return "_";
  const text = String(value).trim();
  return text.length === 0 ? "_" : text;
}

/** Chave estável para cache de buscas de parlamentares. */
export function searchCacheKey(params: SearchCacheParams): string {
  const esfera = token(params.esfera ?? "federal_deputado").toLowerCase();
  const legislaturaId = token(params.legislaturaId);
  const nome = token(params.nome).toLowerCase();
  const partido = token(params.siglaPartido).toUpperCase();
  const uf = token(params.siglaUf).toUpperCase();
  const page = token(params.page ?? 1);
  const pageSize = token(params.pageSize ?? 20);
  return `${SEARCH_CACHE_PREFIX}${esfera}:${legislaturaId}:${nome}:${partido}:${uf}:${page}:${pageSize}`;
}
