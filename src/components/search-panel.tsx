"use client";

import { DeputyRow } from "@/components/deputy-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listLegislatures, searchDeputies } from "@/lib/api/client";
import type { DeputyListItem, LegislatureItem } from "@/lib/api/types";
import { Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useId, useState } from "react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function SearchPanel() {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [nome, setNome] = useState("");
  const [siglaUf, setSiglaUf] = useState("");
  const [siglaPartido, setSiglaPartido] = useState("");
  const [legislaturaId, setLegislaturaId] = useState<number | "">("");
  const [legislatures, setLegislatures] = useState<LegislatureItem[]>([]);
  const [items, setItems] = useState<DeputyListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listLegislatures()
      .then((res) => {
        if (cancelled) return;
        setLegislatures(res.items);
        if (res.items[0] && legislaturaId === "") {
          setLegislaturaId(res.items[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setLegislatures([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(next?: {
    nome?: string;
    siglaUf?: string;
    siglaPartido?: string;
    legislaturaId?: number | "";
  }) {
    const query = {
      nome: (next?.nome ?? nome).trim(),
      siglaUf: next?.siglaUf ?? siglaUf,
      siglaPartido: (next?.siglaPartido ?? siglaPartido).trim().toUpperCase(),
      legislaturaId: next?.legislaturaId ?? legislaturaId,
    };

    setNome(query.nome);
    setSiglaUf(query.siglaUf);
    setSiglaPartido(query.siglaPartido);
    setLegislaturaId(query.legislaturaId);
    setError(null);
    setSearched(true);
    setPending(true);

    try {
      const result = await searchDeputies({
        nome: query.nome || undefined,
        siglaUf: query.siglaUf || undefined,
        siglaPartido: query.siglaPartido || undefined,
        legislaturaId:
          query.legislaturaId === "" ? undefined : Number(query.legislaturaId),
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
          : "Não foi possível buscar deputados agora.",
      );
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void runSearch();
  }

  let statusText = "Digite um nome, partido ou UF para buscar.";
  if (pending) statusText = "Buscando deputados…";
  else if (error) statusText = error;
  else if (searched && items)
    statusText =
      total === 0
        ? "Nenhum deputado encontrado com esses filtros."
        : `${total} resultado${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}.`;

  const selectedLegislatura =
    legislaturaId === "" ? null : Number(legislaturaId);

  return (
    <section aria-labelledby={`${formId}-title`} className="space-y-5">
      <h2 id={`${formId}-title`} className="sr-only">
        Busca de deputados
      </h2>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-[1fr_7.5rem_6.5rem_6.5rem_auto]"
        aria-describedby={statusId}
      >
        <div className="space-y-1.5">
          <label htmlFor={`${formId}-nome`} className="text-sm font-medium">
            Nome
          </label>
          <Input
            id={`${formId}-nome`}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Janones"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-legislatura`}
            className="text-sm font-medium"
          >
            Mandato
          </label>
          <select
            id={`${formId}-legislatura`}
            className="flex h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={legislaturaId}
            onChange={(e) =>
              setLegislaturaId(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
          >
            {legislatures.length === 0 ? (
              <option value="">Carregando…</option>
            ) : (
              legislatures.map((leg) => (
                <option key={leg.id} value={leg.id}>
                  {leg.label}
                </option>
              ))
            )}
          </select>
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
          <label htmlFor={`${formId}-partido`} className="text-sm font-medium">
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
      </form>

      <p className="text-sm text-muted-foreground">
        Exemplo:{" "}
        <button
          type="button"
          className="font-medium text-primary underline underline-offset-2"
          onClick={() => void runSearch({ nome: "Janones" })}
        >
          buscar Janones
        </button>{" "}
        ou{" "}
        <Link
          href="/deputados/204515"
          className="font-medium text-primary underline underline-offset-2"
        >
          abrir o perfil
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
          {items.map((deputy) => (
            <DeputyRow
              key={`${deputy.id}-${deputy.legislaturaId ?? "x"}`}
              deputy={deputy}
              legislaturaId={selectedLegislatura}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
