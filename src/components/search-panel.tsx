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
import { Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type SphereFilter = "federal_deputado" | "estadual_deputado" | "todos";

export function SearchPanel({
  legislatures,
  initialLegislaturaId,
}: {
  legislatures: LegislatureItem[];
  initialLegislaturaId: number | null;
}) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [esfera, setEsfera] = useState<SphereFilter>("federal_deputado");
  const [nome, setNome] = useState("");
  const [siglaUf, setSiglaUf] = useState("");
  const [siglaPartido, setSiglaPartido] = useState("");
  const [legislaturaId, setLegislaturaId] = useState<number | "">(
    initialLegislaturaId ?? "",
  );
  const [items, setItems] = useState<ParliamentarianListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const skipDebounceRef = useRef(false);

  const debouncedNome = useDebouncedValue(nome, 300);
  const debouncedPartido = useDebouncedValue(siglaPartido, 300);
  const isFederal = esfera === "federal_deputado" || esfera === "todos";

  async function runSearch(next?: {
    esfera?: SphereFilter;
    nome?: string;
    siglaUf?: string;
    siglaPartido?: string;
    legislaturaId?: number | "";
  }) {
    const query = {
      esfera: next?.esfera ?? esfera,
      nome: (next?.nome ?? nome).trim(),
      siglaUf: next?.siglaUf ?? siglaUf,
      siglaPartido: (next?.siglaPartido ?? siglaPartido).trim().toUpperCase(),
      legislaturaId: next?.legislaturaId ?? legislaturaId,
    };

    setEsfera(query.esfera);
    setNome(query.nome);
    setSiglaUf(query.siglaUf);
    setSiglaPartido(query.siglaPartido);
    setLegislaturaId(query.legislaturaId);
    setError(null);
    setSearched(true);
    setPending(true);

    try {
      const result = await searchParliamentarians({
        esfera: query.esfera,
        nome: query.nome || undefined,
        siglaUf: query.siglaUf || undefined,
        siglaPartido: query.siglaPartido || undefined,
        legislaturaId:
          query.esfera === "estadual_deputado" || query.legislaturaId === ""
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
        ) : (
          <p className="text-xs text-muted-foreground">
            Cobertura estadual: 27 UFs (PE via ALEPE; demais com fixture de
            cadastro). Sync:{" "}
            <code className="rounded bg-muted px-1">
              npm run sync -- estadual --source=all
            </code>
            .
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
              placeholder="Ex.: Janones ou Gleide"
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
        <button
          type="button"
          className="font-medium text-primary underline underline-offset-2"
          onClick={() => {
            skipDebounceRef.current = true;
            void runSearch({
              esfera: "federal_deputado",
              nome: "Janones",
              legislaturaId: 56,
            });
          }}
        >
          Janones (federal)
        </button>
        ,{" "}
        <button
          type="button"
          className="font-medium text-primary underline underline-offset-2"
          onClick={() => {
            skipDebounceRef.current = true;
            void runSearch({
              esfera: "estadual_deputado",
              nome: "",
              siglaUf: "PE",
              legislaturaId: "",
            });
          }}
        >
          deputados estaduais de PE
        </button>{" "}
        ou{" "}
        <Link
          href="/deputados/204515?legislaturaId=56"
          className="font-medium text-primary underline underline-offset-2"
        >
          perfil de Janones
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
