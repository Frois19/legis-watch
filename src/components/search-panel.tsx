"use client";

import { ParliamentarianRow } from "@/components/parliamentarian-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { searchParliamentarians } from "@/lib/api/client";
import type {
  LegislatureItem,
  ParliamentarianListItem,
} from "@/lib/api/types";
import {
  buildSearchQuery,
  parseSearchQuery,
  sameSearchQuery,
  searchQueryHasFilters,
  type SearchQueryState,
  type SphereFilter,
} from "@/lib/search/query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function SearchPanel({
  legislatures,
  initialLegislaturaId,
}: {
  legislatures: LegislatureItem[];
  initialLegislaturaId: number | null;
}) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(
    () => parseSearchQuery(new URLSearchParams(searchParams.toString()), initialLegislaturaId),
    // só na montagem / mudança externa da URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams],
  );

  const [esfera, setEsfera] = useState<SphereFilter>(initial.esfera);
  const [nome, setNome] = useState(initial.nome);
  const [siglaUf, setSiglaUf] = useState(initial.siglaUf);
  const [siglaPartido, setSiglaPartido] = useState(initial.siglaPartido);
  const [legislaturaId, setLegislaturaId] = useState<number | "">(
    initial.legislaturaId === ""
      ? (initialLegislaturaId ?? "")
      : initial.legislaturaId,
  );
  const [items, setItems] = useState<ParliamentarianListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const skipDebounceRef = useRef(false);
  const bootstrappedRef = useRef(false);

  const debouncedNome = useDebouncedValue(nome, 300);
  const debouncedPartido = useDebouncedValue(siglaPartido, 300);
  const isFederal = esfera === "federal_deputado" || esfera === "todos";
  const isSenador = esfera === "senador";
  const isEstadual = esfera === "estadual_deputado";

  function currentState(overrides?: Partial<SearchQueryState>): SearchQueryState {
    return {
      esfera: overrides?.esfera ?? esfera,
      nome: (overrides?.nome ?? nome).trim(),
      siglaUf: overrides?.siglaUf ?? siglaUf,
      siglaPartido: (overrides?.siglaPartido ?? siglaPartido).trim().toUpperCase(),
      legislaturaId: overrides?.legislaturaId ?? legislaturaId,
    };
  }

  function syncUrl(state: SearchQueryState) {
    const qs = buildSearchQuery(state).toString();
    const parsedCurrent = parseSearchQuery(
      new URLSearchParams(searchParams.toString()),
      initialLegislaturaId,
    );
    if (sameSearchQuery(parsedCurrent, state)) return;
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }

  async function runSearch(next?: Partial<SearchQueryState>) {
    const query = currentState(next);

    setEsfera(query.esfera);
    setNome(query.nome);
    setSiglaUf(query.siglaUf);
    setSiglaPartido(query.siglaPartido);
    setLegislaturaId(query.legislaturaId);
    setError(null);
    setSearched(true);
    setPending(true);
    syncUrl(query);

    try {
      const result = await searchParliamentarians({
        esfera: query.esfera,
        nome: query.nome || undefined,
        siglaUf: query.siglaUf || undefined,
        siglaPartido: query.siglaPartido || undefined,
        legislaturaId:
          query.esfera === "estadual_deputado" ||
          query.esfera === "senador" ||
          query.legislaturaId === ""
            ? undefined
            : Number(query.legislaturaId),
        pageSize: 30,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível buscar parlamentares agora.",
      );
    } finally {
      setPending(false);
    }
  }

  // Deep-link / links de exemplo: aplica querystring na busca
  useEffect(() => {
    const fromUrl = parseSearchQuery(
      new URLSearchParams(searchParams.toString()),
      initialLegislaturaId,
    );
    const first = !bootstrappedRef.current;
    bootstrappedRef.current = true;
    if (!searchQueryHasFilters(fromUrl) && first) return;

    const local = currentState({
      legislaturaId:
        fromUrl.legislaturaId === "" &&
        (fromUrl.esfera === "federal_deputado" || fromUrl.esfera === "todos")
          ? (initialLegislaturaId ?? "")
          : fromUrl.legislaturaId,
    });
    // Já refletimos essa URL (ex.: acabamos de dar replace) — não rebusca.
    if (
      !first &&
      sameSearchQuery(local, {
        ...fromUrl,
        legislaturaId:
          fromUrl.legislaturaId === "" &&
          (fromUrl.esfera === "federal_deputado" || fromUrl.esfera === "todos")
            ? (initialLegislaturaId ?? "")
            : fromUrl.legislaturaId,
      }) &&
      searched
    ) {
      return;
    }

    skipDebounceRef.current = true;
    void runSearch({
      ...fromUrl,
      legislaturaId:
        fromUrl.legislaturaId === "" &&
        (fromUrl.esfera === "federal_deputado" || fromUrl.esfera === "todos")
          ? (initialLegislaturaId ?? "")
          : fromUrl.legislaturaId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!searched) return;
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }
    void runSearch({
      nome: debouncedNome,
      siglaPartido: debouncedPartido,
      siglaUf,
      legislaturaId,
      esfera,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedNome, debouncedPartido, siglaUf, legislaturaId, esfera]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    skipDebounceRef.current = true;
    void runSearch();
  }

  let statusText = "Digite um nome, partido ou UF para buscar.";
  if (pending) statusText = "Buscando parlamentares…";
  else if (error) statusText = error;
  else if (searched && items)
    statusText =
      total === 0
        ? "Nenhum parlamentar encontrado com esses filtros."
        : `${total} resultado${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}.`;

  return (
    <section aria-labelledby={`${formId}-title`} className="space-y-5">
      <h2 id={`${formId}-title`} className="sr-only">
        Busca de parlamentares
      </h2>

      <form
        onSubmit={onSubmit}
        className="space-y-3 border border-border bg-card p-4"
        aria-describedby={statusId}
      >
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Esfera</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Esfera">
            {(
              [
                ["federal_deputado", "Deputados federais"],
                ["estadual_deputado", "Deputados estaduais"],
                ["senador", "Senadores"],
                ["todos", "Todos"],
              ] as const
            ).map(([value, label]) => {
              const selected = esfera === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setEsfera(value)}
                  className={
                    selected
                      ? "border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                      : "border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {isFederal ? (
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Mandato federal</legend>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Legislatura"
            >
              {legislatures.map((leg) => {
                const selected = legislaturaId === leg.id;
                return (
                  <button
                    key={leg.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLegislaturaId(leg.id)}
                    className={
                      selected
                        ? "border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                        : "border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary"
                    }
                  >
                    {leg.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : isEstadual ? (
          <p className="text-xs text-muted-foreground">
            27 UFs · 11 casas live (PE, MG, SP, PR + 7 SAPL). UFs fixture
            mostram banner de demonstração no perfil. Sync:{" "}
            <code className="rounded bg-muted px-1">
              npm run sync -- estadual --source=all
            </code>
            .
          </p>
        ) : isSenador ? (
          <p className="text-xs text-muted-foreground">
            Senadores em exercício. Presença oficial não vem pela API — ver
            disclaimer no perfil.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Busca em federais, estaduais e senadores.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_6.5rem_6.5rem_auto]">
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-nome`} className="text-sm font-medium">
              Nome
            </label>
            <Input
              id={`${formId}-nome`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Janones, Gleide ou Alan Rick"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-uf`} className="text-sm font-medium">
              UF
            </label>
            <select
              id={`${formId}-uf`}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={siglaUf}
              onChange={(e) => setSiglaUf(e.target.value)}
            >
              <option value="">Todas</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`${formId}-partido`}
              className="text-sm font-medium"
            >
              Partido
            </label>
            <Input
              id={`${formId}-partido`}
              value={siglaPartido}
              onChange={(e) => setSiglaPartido(e.target.value)}
              placeholder="PT, PL…"
              autoComplete="off"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={pending}>
              <Search aria-hidden="true" />
              {pending ? "Buscando…" : "Buscar"}
            </Button>
          </div>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        Exemplo:{" "}
        <Link
          href="/?esfera=federal_deputado&nome=Janones&legislaturaId=56"
          className="font-medium text-primary underline underline-offset-2"
        >
          Janones (federal)
        </Link>
        ,{" "}
        <Link
          href="/?esfera=estadual_deputado&uf=PE"
          className="font-medium text-primary underline underline-offset-2"
        >
          estaduais de PE
        </Link>
        ,{" "}
        <Link
          href="/?esfera=estadual_deputado&uf=PR"
          className="font-medium text-primary underline underline-offset-2"
        >
          estaduais do PR
        </Link>
        ,{" "}
        <Link
          href="/?esfera=senador&uf=AC"
          className="font-medium text-primary underline underline-offset-2"
        >
          senadores do AC
        </Link>
        .
      </p>

      <div
        id={statusId}
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {statusText}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!pending && searched && items && items.length === 0 ? (
        <div className="border border-border bg-card p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Nenhum resultado</p>
          <p>
            Ajuste nome, UF ou partido. Em UFs fixture o cadastro é de
            demonstração até haver adapter live.
          </p>
        </div>
      ) : null}

      {!pending && items && items.length > 0 ? (
        <ul className="border border-border bg-card px-4" aria-label="Resultados">
          {items.map((item) => (
            <ParliamentarianRow key={item.key} item={item} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
