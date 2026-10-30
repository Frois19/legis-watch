export type SphereFilter =
  | "federal_deputado"
  | "estadual_deputado"
  | "senador"
  | "todos";

export type SearchQueryState = {
  esfera: SphereFilter;
  nome: string;
  siglaUf: string;
  siglaPartido: string;
  legislaturaId: number | "";
};

const SPHERES = new Set<SphereFilter>([
  "federal_deputado",
  "estadual_deputado",
  "senador",
  "todos",
]);

export function parseSearchQuery(
  params: URLSearchParams,
  fallbackLegislaturaId: number | null = null,
): SearchQueryState {
  const rawEsfera = params.get("esfera") ?? params.get("sphere") ?? "";
  const esfera = SPHERES.has(rawEsfera as SphereFilter)
    ? (rawEsfera as SphereFilter)
    : "federal_deputado";

  const legRaw = params.get("legislaturaId") ?? params.get("legislatura") ?? "";
  const legNum = Number(legRaw);
  const legislaturaId =
    Number.isFinite(legNum) && legNum > 0
      ? legNum
      : esfera === "federal_deputado" || esfera === "todos"
        ? (fallbackLegislaturaId ?? "")
        : "";

  return {
    esfera,
    nome: (params.get("nome") ?? "").trim(),
    siglaUf: (params.get("uf") ?? params.get("siglaUf") ?? "")
      .trim()
      .toUpperCase(),
    siglaPartido: (params.get("partido") ?? params.get("siglaPartido") ?? "")
      .trim()
      .toUpperCase(),
    legislaturaId,
  };
}

/** Serializa estado da busca para a querystring (omite vazios). */
export function buildSearchQuery(state: SearchQueryState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("esfera", state.esfera);
  if (state.nome) params.set("nome", state.nome);
  if (state.siglaUf) params.set("uf", state.siglaUf);
  if (state.siglaPartido) params.set("partido", state.siglaPartido);
  if (
    state.legislaturaId !== "" &&
    (state.esfera === "federal_deputado" || state.esfera === "todos")
  ) {
    params.set("legislaturaId", String(state.legislaturaId));
  }
  return params;
}

export function sameSearchQuery(
  a: SearchQueryState,
  b: SearchQueryState,
): boolean {
  return (
    a.esfera === b.esfera &&
    a.nome === b.nome &&
    a.siglaUf === b.siglaUf &&
    a.siglaPartido === b.siglaPartido &&
    String(a.legislaturaId) === String(b.legislaturaId)
  );
}

export function searchQueryHasFilters(state: SearchQueryState): boolean {
  return Boolean(
    state.nome ||
      state.siglaUf ||
      state.siglaPartido ||
      state.esfera !== "federal_deputado" ||
      state.legislaturaId !== "",
  );
}
