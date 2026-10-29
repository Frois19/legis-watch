"use client";

import { Badge } from "@/components/ui/badge";
import type { PropositionItem } from "@/lib/api/types";
import { formatDate, propositionLabel } from "@/lib/format";
import {
  categoriesPresentIn,
  categorizePropositionStatus,
  explainPropositionStatus,
  getStatusCategoryMeta,
  type PropositionStatusCategory,
} from "@/lib/propositions/status-meta";
import { ExternalLink } from "lucide-react";
import { useId, useMemo, useState } from "react";

export function PropositionsPanel({
  items,
  total,
}: {
  items: PropositionItem[];
  total: number;
}) {
  const filterId = useId();
  const helpId = `${filterId}-help`;
  const [category, setCategory] =
    useState<PropositionStatusCategory>("todos");

  const available = useMemo(
    () => categoriesPresentIn(items.map((i) => i.statusResumo)),
    [items],
  );

  const filtered = useMemo(() => {
    if (category === "todos") return items;
    return items.filter(
      (item) => categorizePropositionStatus(item.statusResumo) === category,
    );
  }, [category, items]);

  const selectedMeta = getStatusCategoryMeta(category);

  if (items.length === 0) {
    return (
      <p className="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Ainda não há projetos sincronizados para este perfil.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 border border-border bg-card p-4">
        <label htmlFor={filterId} className="text-sm font-medium">
          Filtrar por status
        </label>
        <select
          id={filterId}
          className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
          value={category}
          aria-describedby={helpId}
          onChange={(event) =>
            setCategory(event.target.value as PropositionStatusCategory)
          }
        >
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p id={helpId} className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            {selectedMeta.label}:{" "}
          </span>
          {selectedMeta.description}
        </p>
        <p className="text-xs text-muted-foreground" role="status">
          Mostrando {filtered.length} de {items.length} listados
          {total > items.length ? ` (${total} no total neste mandato)` : ""}.
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhum projeto com este status na lista atual.
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border bg-card">
          {filtered.map((item) => {
            const statusHelp = explainPropositionStatus(item.statusResumo);
            return (
              <li key={item.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{propositionLabel(item)}</Badge>
                  {item.statusResumo ? (
                    <span
                      className="text-xs text-muted-foreground"
                      title={statusHelp}
                    >
                      {item.statusResumo}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Sem status
                    </span>
                  )}
                  <a
                    href={item.urlCamara}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
                  >
                    Ler na Câmara
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  {item.ementa || "Sem ementa disponível."}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {statusHelp}
                </p>
                {item.dataApresentacao ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Apresentado em {formatDate(item.dataApresentacao)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
