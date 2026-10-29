"use client";

import { Badge } from "@/components/ui/badge";
import type { EnrichedProposition, VoteItem } from "@/lib/api/types";
import {
  formatDate,
  formatDateTime,
  propositionLabel,
  voteApprovalLabel,
} from "@/lib/format";
import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function voteVariant(tipo: string) {
  const t = tipo.toLowerCase();
  if (t.includes("sim")) return "success" as const;
  if (t.includes("não") || t.includes("nao")) return "danger" as const;
  if (t.includes("obstru")) return "warn" as const;
  return "secondary" as const;
}

function approvalVariant(aprovacao: boolean | null) {
  if (aprovacao === true) return "success" as const;
  if (aprovacao === false) return "danger" as const;
  return "secondary" as const;
}

function mergeEnrichment(
  vote: VoteItem,
  byId: Map<number, EnrichedProposition>,
): VoteItem {
  const prop = vote.proposicao;
  if (!prop) return vote;
  const extra = byId.get(prop.id);
  if (!extra) return vote;
  return {
    ...vote,
    proposicao: {
      ...prop,
      ementa: prop.ementa || extra.ementa,
      dataApresentacao: prop.dataApresentacao || extra.dataApresentacao,
      statusResumo: prop.statusResumo || extra.statusResumo,
      siglaTipo: prop.siglaTipo || extra.siglaTipo,
      numero: prop.numero ?? extra.numero,
      ano: prop.ano ?? extra.ano,
      authorsResumo: prop.authorsResumo || extra.authorsResumo,
      authors: prop.authors.length > 0 ? prop.authors : extra.authors,
    },
  };
}

export function VotesPanel({
  items,
  total,
}: {
  items: VoteItem[];
  total: number;
}) {
  const [rows, setRows] = useState(items);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    setRows(items);
  }, [items]);

  useEffect(() => {
    const needs = items
      .map((v) => v.proposicao)
      .filter(
        (p): p is NonNullable<VoteItem["proposicao"]> =>
          !!p &&
          (p.authors.length === 0 ||
            !p.authorsResumo ||
            !p.dataApresentacao ||
            !p.statusResumo),
      )
      .map((p) => p.id);

    // Primeira leva: autoria/status via Câmara (cacheia no SQLite para as próximas visitas)
    const unique = [...new Set(needs)].slice(0, 20);
    if (unique.length === 0) return;

    let cancelled = false;
    setEnriching(true);

    void (async () => {
      try {
        const res = await fetch("/api/proposicoes/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: unique }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { items?: EnrichedProposition[] };
        if (!data.items?.length || cancelled) return;
        const byId = new Map(data.items.map((p) => [p.id, p]));
        setRows((prev) => prev.map((vote) => mergeEnrichment(vote, byId)));
      } catch {
        // mantém dados sincronizados; o link da Câmara cobre o restante
      } finally {
        if (!cancelled) setEnriching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (rows.length === 0) {
    return (
      <p className="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Ainda não há votações sincronizadas para este perfil.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {enriching ? (
        <p
          className="flex items-center gap-2 text-xs text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Completando autoria, partido e status dos projetos na Câmara…
        </p>
      ) : null}
      <ul className="divide-y divide-border border border-border bg-card">
        {rows.map((vote) => {
          const prop = vote.proposicao;
          const approval = voteApprovalLabel(vote.votacao.aprovacao);
          const label = prop
            ? propositionLabel(prop) || `Proposição ${prop.id}`
            : null;
          return (
            <li key={vote.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={voteVariant(vote.tipoVoto)}>
                  Voto: {vote.tipoVoto}
                </Badge>
                <Badge variant={approvalVariant(vote.votacao.aprovacao)}>
                  {approval}
                </Badge>
                {vote.votacao.siglaOrgao ? (
                  <span className="text-xs text-muted-foreground">
                    Órgão: {vote.votacao.siglaOrgao}
                  </span>
                ) : null}
              </div>

              {prop && label ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <a
                      href={prop.urlCamara}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-base font-semibold text-primary underline underline-offset-2"
                    >
                      {label}
                      <ExternalLink
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        — ler ficha completa na Câmara (abre em nova aba)
                      </span>
                    </a>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground">
                    <span className="font-medium">Do que se trata: </span>
                    {prop.ementa || "Ementa não disponível."}
                  </p>

                  <dl className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="inline font-medium text-foreground">
                        Quando foi apresentado:{" "}
                      </dt>
                      <dd className="inline">
                        {formatDate(prop.dataApresentacao)}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-foreground">
                        Status do projeto:{" "}
                      </dt>
                      <dd className="inline">
                        {prop.statusResumo || "Não informado"}
                      </dd>
                    </div>
                  </dl>

                  {prop.authors.length > 0 ? (
                    <div className="text-sm">
                      <p className="font-medium text-foreground">
                        Quem fez (autoria e partido)
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                        {prop.authors.map((author) => (
                          <li key={author.id}>
                            <Link
                              href={`/deputados/${author.id}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {author.nome}
                            </Link>
                            {" · "}
                            {[author.siglaPartido, author.siglaUf]
                              .filter(Boolean)
                              .join(" · ") || "partido/UF não informados"}
                            {author.proponente ? " · proponente" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : prop.authorsResumo ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Quem fez (autoria e partido):{" "}
                      </span>
                      {prop.authorsResumo}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Autoria e partido do autor estão na{" "}
                      <a
                        href={prop.urlCamara}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        ficha da proposição na Câmara
                      </a>
                      .
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Proposição não vinculada a esta votação no arquivo
                  sincronizado. A descrição da sessão abaixo ainda indica o
                  objeto da votação.
                </p>
              )}

              <div className="border-t border-border pt-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Como foi a votação:{" "}
                  </span>
                  {vote.votacao.descricao ||
                    "Sem descrição detalhada da sessão."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Resultado oficial: {approval}. Registrado em{" "}
                  {formatDateTime(
                    vote.dataRegistro || vote.votacao.dataHoraRegistro,
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {total > rows.length ? (
        <p className="text-xs text-muted-foreground">
          Mostrando {rows.length} de {total} votos.
        </p>
      ) : null}
    </div>
  );
}
