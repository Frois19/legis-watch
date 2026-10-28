"use client";

import { DeputyRow } from "@/components/deputy-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchDeputies } from "@/lib/api/client";
import type { DeputyListItem } from "@/lib/api/types";
import { Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function SearchPanel() {
  const [nome, setNome] = useState("");
  const [siglaUf, setSiglaUf] = useState("");
  const [siglaPartido, setSiglaPartido] = useState("");
  const [items, setItems] = useState<DeputyListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch(next?: {
    nome?: string;
    siglaUf?: string;
    siglaPartido?: string;
  }) {
    const query = {
      nome: (next?.nome ?? nome).trim(),
      siglaUf: next?.siglaUf ?? siglaUf,
      siglaPartido: (next?.siglaPartido ?? siglaPartido).trim().toUpperCase(),
    };

    setNome(query.nome);
    setSiglaUf(query.siglaUf);
    setSiglaPartido(query.siglaPartido);
    setError(null);
    setSearched(true);
    setPending(true);

    try {
      const result = await searchDeputies({
        nome: query.nome || undefined,
        siglaUf: query.siglaUf || undefined,
        siglaPartido: query.siglaPartido || undefined,
        pageSize: 30,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Falha na busca");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void runSearch();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="animate-rise-delay-1 grid gap-3 rounded-xl border border-border/80 bg-white/80 p-4 shadow-sm sm:grid-cols-[1fr_7rem_7rem_auto] sm:p-5"
      >
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nome
          </span>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Favacho, Tabata, Nikolas"
            aria-label="Buscar por nome"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            UF
          </span>
          <select
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={siglaUf}
            onChange={(e) => setSiglaUf(e.target.value)}
            aria-label="Filtrar por UF"
          >
            <option value="">Todas</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Partido
          </span>
          <Input
            value={siglaPartido}
            onChange={(e) => setSiglaPartido(e.target.value)}
            placeholder="PT, PL…"
            aria-label="Filtrar por partido"
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            <Search />
            {pending ? "Buscando…" : "Buscar"}
          </Button>
        </div>
      </form>

      {!searched && (
        <p className="animate-rise-delay-2 text-sm text-muted-foreground">
          Sugestão:{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => void runSearch({ nome: "Favacho" })}
          >
            buscar Favacho
          </button>{" "}
          ou abrir o{" "}
          <Link
            href="/deputados/204379"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            perfil de exemplo
          </Link>
          .
        </p>
      )}

      <div className="animate-rise-delay-2 rounded-xl border border-border/80 bg-white/80 p-4 shadow-sm sm:p-5">
        {!searched && (
          <p className="text-sm text-muted-foreground">
            Digite um nome, partido ou UF para encontrar deputados da legislatura
            atual.
          </p>
        )}
        {pending && (
          <p className="animate-fade text-sm text-muted-foreground">
            Consultando o banco local…
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!pending && searched && items && items.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            Nenhum deputado encontrado com esses filtros. Rode o sync se a base
            estiver vazia.
          </p>
        )}
        {!pending && items && items.length > 0 && (
          <>
            <p className="mb-2 text-sm text-muted-foreground">
              {total} resultado{total === 1 ? "" : "s"}
            </p>
            <ul>
              {items.map((deputy, index) => (
                <DeputyRow key={deputy.id} deputy={deputy} index={index} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
