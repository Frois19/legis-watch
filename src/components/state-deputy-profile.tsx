"use client";

import { DeputyPhoto } from "@/components/deputy-photo";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StateDeputyDetail } from "@/lib/api/types";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function StateDeputyProfileView({
  detail,
  docsUrl,
}: {
  detail: StateDeputyDetail;
  docsUrl?: string | null;
}) {
  const name = detail.nomeEleitoral || detail.nome;
  const meta = [detail.siglaPartido, detail.siglaUf, detail.situacao]
    .filter(Boolean)
    .join(" · ");
  // Não usar id numérico da Assembleia no fallback da Câmara.
  const photoId = detail.urlFoto ? Number(detail.externalId) || -1 : -1;
  const hasEnrichment =
    detail.coverage.propositions ||
    detail.affiliations.length > 0 ||
    detail.mandates.length > 0 ||
    detail.propositions.length > 0;

  return (
    <article className="space-y-6">
      <Link
        href="/"
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← Voltar à busca
      </Link>

      <header className="space-y-3 border border-border bg-card p-4">
        <div className="flex flex-wrap items-start gap-4">
          <DeputyPhoto
            id={Number.isFinite(photoId) ? photoId : -1}
            name={name}
            urlFoto={detail.urlFoto}
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Deputado estadual</Badge>
              <Badge variant="secondary">{detail.assemblyName}</Badge>
            </div>
            <h1 className="font-display text-3xl font-semibold text-primary">
              {name}
            </h1>
            {meta ? <p className="text-muted-foreground">{meta}</p> : null}
            {detail.email ? (
              <p className="text-sm text-muted-foreground">{detail.email}</p>
            ) : null}
            {docsUrl ? (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2"
              >
                Dados abertos da casa
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {hasEnrichment ? (
        <Tabs defaultValue={detail.coverage.propositions ? "proposicoes" : "filiacoes"}>
          <TabsList aria-label="Seções do perfil estadual">
            {detail.coverage.propositions || detail.propositions.length > 0 ? (
              <TabsTrigger value="proposicoes">
                Proposições ({detail.propositions.length})
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="filiacoes">
              Filiações ({detail.affiliations.length})
            </TabsTrigger>
            <TabsTrigger value="mandatos">
              Mandatos ({detail.mandates.length})
            </TabsTrigger>
            <TabsTrigger value="cobertura">Cobertura</TabsTrigger>
          </TabsList>

          {(detail.coverage.propositions || detail.propositions.length > 0) && (
            <TabsContent value="proposicoes" className="space-y-3">
              {detail.propositions.length === 0 ? (
                <p className="border border-border bg-card p-4 text-sm text-muted-foreground">
                  Nenhuma proposição sincronizada ainda. Abra o perfil de novo
                  após o sync, ou rode{" "}
                  <code className="text-foreground">
                    npm run sync -- estadual-perfil --source={detail.source}{" "}
                    --codigo={detail.externalId}
                  </code>
                  .
                </p>
              ) : (
                <ul className="divide-y divide-border border border-border bg-card">
                  {detail.propositions.map((item) => {
                    const label = [item.siglaTipo, item.numero, item.ano]
                      .filter((v) => v != null && v !== "")
                      .join(" / ");
                    return (
                      <li key={item.id} className="space-y-1 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {label || item.externalId}
                          </p>
                          {item.statusResumo ? (
                            <Badge variant="secondary">{item.statusResumo}</Badge>
                          ) : null}
                        </div>
                        {item.ementa ? (
                          <p className="text-sm text-muted-foreground">
                            {item.ementa}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {item.dataApresentacao ? (
                            <span>
                              Apresentação: {formatDate(item.dataApresentacao)}
                            </span>
                          ) : null}
                          {item.urlPublica ? (
                            <a
                              href={item.urlPublica}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
                            >
                              Ver na Assembleia
                              <ExternalLink
                                className="size-3"
                                aria-hidden="true"
                              />
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
          )}

          <TabsContent value="filiacoes" className="space-y-3">
            {detail.affiliations.length === 0 ? (
              <p className="border border-border bg-card p-4 text-sm text-muted-foreground">
                Sem histórico de filiação sincronizado.
              </p>
            ) : (
              <ul className="divide-y divide-border border border-border bg-card">
                {detail.affiliations.map((row, index) => (
                  <li
                    key={`${row.siglaPartido}-${row.dataFiliacao}-${index}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                  >
                    <p className="font-medium text-foreground">
                      {row.siglaPartido || "Partido"}
                      {row.nomePartido ? (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {row.nomePartido}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(row.dataFiliacao)}
                      {" → "}
                      {row.dataDesfiliacao
                        ? formatDate(row.dataDesfiliacao)
                        : "atual"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="mandatos" className="space-y-3">
            {detail.mandates.length === 0 ? (
              <p className="border border-border bg-card p-4 text-sm text-muted-foreground">
                Sem mandatos sincronizados.
              </p>
            ) : (
              <ul className="divide-y divide-border border border-border bg-card">
                {detail.mandates.map((row, index) => (
                  <li
                    key={`${row.codigoMandato}-${index}`}
                    className="space-y-1 px-4 py-3"
                  >
                    <p className="font-medium text-foreground">
                      {[
                        row.siglaUf,
                        row.participacao,
                        row.legislaturaInicio
                          ? `Leg. ${row.legislaturaInicio}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(row.dataInicio)} → {formatDate(row.dataFim)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="cobertura">
            <CoverageSection detail={detail} />
          </TabsContent>
        </Tabs>
      ) : (
        <CoverageSection detail={detail} />
      )}
    </article>
  );
}

function CoverageSection({ detail }: { detail: StateDeputyDetail }) {
  return (
    <section className="space-y-2 border border-border bg-card p-4">
      <h2 className="font-display text-xl font-semibold">Cobertura nesta casa</h2>
      <p className="text-sm text-muted-foreground">
        Cadastro está disponível em todas as UFs. Proposições, filiações e
        mandatos entram quando a Assembleia publica API (SAPL/ALMG/ALEPE).
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["Busca / perfil", detail.coverage.profile],
            ["Proposições", detail.coverage.propositions],
            ["Votações", detail.coverage.votes],
            ["Presença", detail.coverage.attendance],
          ] as const
        ).map(([label, ok]) => (
          <li
            key={label}
            className="flex items-center justify-between border border-border px-3 py-2 text-sm"
          >
            <span>{label}</span>
            <Badge variant={ok ? "success" : "secondary"}>
              {ok ? "Disponível" : "Em breve"}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
