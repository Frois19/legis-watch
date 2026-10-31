"use client";

import { DeputyPhoto } from "@/components/deputy-photo";
import { FavoriteButton } from "@/components/favorite-button";
import { ProfileFreshness } from "@/components/profile-meta";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SenatorDetail } from "@/lib/api/types";
import { favoriteKey } from "@/lib/favorites/storage";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function SenatorProfileView({ detail }: { detail: SenatorDetail }) {
  const name = detail.nomeEleitoral || detail.nome;
  const meta = [
    detail.siglaPartido,
    detail.siglaUf,
    detail.participacao,
    detail.situacao,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="space-y-6">
      <Link
        href={`/?esfera=senador${detail.siglaUf ? `&uf=${encodeURIComponent(detail.siglaUf)}` : ""}`}
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← Voltar à busca
      </Link>

      <header className="space-y-3 rounded-xl border border-border bg-card/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-start gap-4">
          <DeputyPhoto
            id={Number(detail.externalId) || -1}
            name={name}
            urlFoto={detail.urlFoto}
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Senador(a)</Badge>
              <Badge variant="secondary">{detail.assemblyName}</Badge>
            </div>
            <h1 className="font-display text-3xl font-semibold text-primary">
              {name}
            </h1>
            {detail.nomeCivil && detail.nomeCivil !== name ? (
              <p className="text-sm text-muted-foreground">{detail.nomeCivil}</p>
            ) : null}
            {meta ? <p className="text-muted-foreground">{meta}</p> : null}
            {detail.email ? (
              <p className="text-sm text-muted-foreground">{detail.email}</p>
            ) : null}
            <ProfileFreshness
              label="Perfil sincronizado"
              syncedAt={detail.profileSyncedAt ?? detail.syncedAt}
            />
            <div className="flex flex-wrap gap-3 text-sm font-medium text-primary">
              {detail.urlPagina ? (
                <a
                  href={detail.urlPagina}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  Página no Senado
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
              <a
                href="https://legis.senado.leg.br/dadosabertos/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
              >
                Dados abertos do Senado
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
          </div>
          <FavoriteButton
            item={{
              key: favoriteKey("senador", "senado", detail.externalId),
              sphere: "senador",
              source: "senado",
              externalId: detail.externalId,
              nome: name,
              siglaPartido: detail.siglaPartido,
              siglaUf: detail.siglaUf,
              urlFoto: detail.urlFoto,
              href: detail.href,
            }}
          />
        </div>
      </header>

      <Tabs defaultValue="materias">
          <TabsList aria-label="Seções do perfil do senador">
          <TabsTrigger value="materias">
            Matérias ({detail.matters.length})
          </TabsTrigger>
          <TabsTrigger value="votacoes">
            Votações ({detail.votes?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="filiacoes">
            Filiações ({detail.affiliations.length})
          </TabsTrigger>
          <TabsTrigger value="mandatos">
            Mandatos ({detail.mandates.length})
          </TabsTrigger>
          <TabsTrigger value="cobertura">Cobertura</TabsTrigger>
        </TabsList>

        <TabsContent value="materias" className="space-y-3">
          {detail.matters.length === 0 ? (
            <p className="border border-border bg-card p-4 text-sm text-muted-foreground">
              Nenhuma matéria de autoria sincronizada ainda. Abra o perfil de
              novo após o sync, ou rode{" "}
              <code className="text-foreground">
                npm run sync -- senador-perfil --codigo={detail.externalId}
              </code>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border border border-border bg-card">
              {detail.matters.map((matter) => {
                const label =
                  matter.identificacao ||
                  [matter.siglaTipo, matter.numero, matter.ano]
                    .filter((v) => v != null && v !== "")
                    .join(" / ");
                return (
                  <li key={matter.id} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{label}</p>
                      {matter.autorPrincipal ? (
                        <Badge variant="success">Autor principal</Badge>
                      ) : null}
                    </div>
                    {matter.ementa ? (
                      <p className="text-sm text-muted-foreground">
                        {matter.ementa}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {matter.dataApresentacao ? (
                        <span>
                          Apresentação: {formatDate(matter.dataApresentacao)}
                        </span>
                      ) : null}
                      {matter.urlPublica ? (
                        <a
                          href={matter.urlPublica}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
                        >
                          Ver no Senado
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

        <TabsContent value="votacoes" className="space-y-3">
          {(detail.votes?.length ?? 0) === 0 ? (
            <p className="border border-border bg-card p-4 text-sm text-muted-foreground">
              Nenhuma votação nominal sincronizada ainda. Abra o perfil de novo
              após o sync de perfil.
            </p>
          ) : (
            <ul className="divide-y divide-border border border-border bg-card">
              {detail.votes!.map((vote) => (
                <li key={vote.id} className="space-y-1 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        /sim/i.test(vote.tipoVoto || "")
                          ? "success"
                          : /n[aã]o/i.test(vote.tipoVoto || "")
                            ? "secondary"
                            : "secondary"
                      }
                    >
                      {vote.tipoVoto || "Voto"}
                    </Badge>
                    <p className="font-medium text-foreground">
                      {vote.materiaIdentificacao ||
                        vote.descricaoVotacao ||
                        "Votação"}
                    </p>
                  </div>
                  {vote.descricaoVotacao &&
                  vote.descricaoVotacao !== vote.materiaIdentificacao ? (
                    <p className="text-sm text-muted-foreground">
                      {vote.descricaoVotacao}
                    </p>
                  ) : null}
                  {vote.materiaEmenta ? (
                    <p className="text-sm text-muted-foreground">
                      {vote.materiaEmenta}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {vote.dataSessao ? (
                      <span>Sessão: {formatDate(vote.dataSessao)}</span>
                    ) : null}
                    {vote.descricaoResultado ? (
                      <span>Resultado: {vote.descricaoResultado}</span>
                    ) : null}
                    {vote.urlPublica ? (
                      <a
                        href={vote.urlPublica}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
                      >
                        Ver matéria
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

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
                  <div>
                    <p className="font-medium text-foreground">
                      {row.siglaPartido || "Partido"}
                      {row.nomePartido ? (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {row.nomePartido}
                        </span>
                      ) : null}
                    </p>
                  </div>
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
              {detail.mandates.map((row, index) => {
                const legs = [
                  row.legislaturaInicio,
                  row.legislaturaFim &&
                  row.legislaturaFim !== row.legislaturaInicio
                    ? row.legislaturaFim
                    : null,
                ]
                  .filter(Boolean)
                  .join("–");
                return (
                  <li
                    key={`${row.codigoMandato}-${index}`}
                    className="space-y-1 px-4 py-3"
                  >
                    <p className="font-medium text-foreground">
                      {[row.siglaUf, row.participacao, legs ? `Leg. ${legs}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(row.dataInicio)} → {formatDate(row.dataFim)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="cobertura" className="space-y-4">
          <section className="space-y-2 border border-border bg-card p-4">
            <h2 className="font-display text-xl font-semibold">
              Cobertura no Senado
            </h2>
            <p className="text-sm text-muted-foreground">
              Cadastro, filiações, mandatos e matérias de autoria vêm dos Dados
              Abertos. Votações nominais ainda não; presença exige disclaimer.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["Busca / perfil", detail.coverage.profile],
                  ["Proposições / matérias", detail.coverage.propositions],
                  ["Votações nominais", detail.coverage.votes],
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

          <aside
            className="border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground"
            role="note"
          >
            <p className="font-medium text-foreground">Sobre presença no Senado</p>
            <p className="mt-1">{detail.attendanceDisclaimer}</p>
            <a
              href="https://www12.senado.leg.br/assessoria-de-imprensa/tutorial-de-verificacao-da-assiduidade-dos-senadores"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
            >
              Tutorial de assiduidade (Senado)
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </aside>
        </TabsContent>
      </Tabs>
    </article>
  );
}
