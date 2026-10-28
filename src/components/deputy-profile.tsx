"use client";

import { FavoriteButton } from "@/components/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAttendances,
  getPropositions,
  getVotes,
} from "@/lib/api/client";
import type {
  AttendanceResponse,
  DeputyDetail,
  Paginated,
  PropositionItem,
  VoteItem,
} from "@/lib/api/types";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

function voteVariant(tipo: string) {
  const t = tipo.toLowerCase();
  if (t.includes("sim")) return "success" as const;
  if (t.includes("não") || t.includes("nao")) return "danger" as const;
  if (t.includes("obstru")) return "warn" as const;
  return "secondary" as const;
}

export function DeputyProfile({ deputy }: { deputy: DeputyDetail }) {
  const [propsData, setPropsData] = useState<Paginated<PropositionItem> | null>(
    null,
  );
  const [votesData, setVotesData] = useState<Paginated<VoteItem> | null>(null);
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [loadingTab, setLoadingTab] = useState<string | null>("proposicoes");
  const [tabError, setTabError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingTab("proposicoes");
    setTabError(null);
    getPropositions(deputy.id)
      .then((data) => {
        if (!cancelled) setPropsData(data);
      })
      .catch((err) => {
        if (!cancelled)
          setTabError(err instanceof Error ? err.message : "Erro ao carregar");
      })
      .finally(() => {
        if (!cancelled) setLoadingTab(null);
      });
    return () => {
      cancelled = true;
    };
  }, [deputy.id]);

  async function loadVotes() {
    if (votesData) return;
    setLoadingTab("votos");
    setTabError(null);
    try {
      setVotesData(await getVotes(deputy.id));
    } catch (err) {
      setTabError(err instanceof Error ? err.message : "Erro ao carregar votos");
    } finally {
      setLoadingTab(null);
    }
  }

  async function loadAttendance() {
    if (attendance) return;
    setLoadingTab("presenca");
    setTabError(null);
    try {
      setAttendance(await getAttendances(deputy.id));
    } catch (err) {
      setTabError(
        err instanceof Error ? err.message : "Erro ao carregar presença",
      );
    } finally {
      setLoadingTab(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="animate-rise overflow-hidden rounded-2xl border border-border/80 bg-white/85 shadow-sm">
        <div className="h-24 bg-gradient-to-r from-primary via-[#17685c] to-accent sm:h-28" />
        <div className="relative px-4 pb-6 sm:px-6">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-muted ring-4 ring-white sm:h-28 sm:w-28">
                {deputy.urlFoto ? (
                  <Image
                    src={deputy.urlFoto}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="112px"
                    unoptimized
                    priority
                  />
                ) : null}
              </div>
              <div className="pb-1">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {deputy.nomeEleitoral || deputy.nome}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[deputy.siglaPartido, deputy.siglaUf, deputy.situacao]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <FavoriteButton
              deputy={{
                id: deputy.id,
                nome: deputy.nomeEleitoral || deputy.nome,
                siglaPartido: deputy.siglaPartido,
                siglaUf: deputy.siglaUf,
                urlFoto: deputy.urlFoto,
              }}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {deputy.condicaoEleitoral ? (
              <Badge variant="secondary">{deputy.condicaoEleitoral}</Badge>
            ) : null}
            {deputy.escolaridade ? (
              <Badge variant="outline">{deputy.escolaridade}</Badge>
            ) : null}
            {deputy.municipioNascimento ? (
              <Badge variant="outline">
                Nascido em {deputy.municipioNascimento}
              </Badge>
            ) : null}
          </div>

          {deputy.redesSociais.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {deputy.redesSociais.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-secondary"
                >
                  {labelSocial(url)}
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Redes sociais ainda não sincronizadas para este perfil. Rode{" "}
              <code className="text-xs">DEPUTY_DETAIL_LIMIT</code> no sync.
            </p>
          )}
        </div>
      </section>

      <Tabs
        defaultValue="proposicoes"
        onValueChange={(value) => {
          if (value === "votos") void loadVotes();
          if (value === "presenca") void loadAttendance();
        }}
      >
        <TabsList>
          <TabsTrigger value="proposicoes">Projetos</TabsTrigger>
          <TabsTrigger value="votos">Votações</TabsTrigger>
          <TabsTrigger value="presenca">Presença</TabsTrigger>
          <TabsTrigger value="partido">Partido</TabsTrigger>
        </TabsList>

        {tabError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {tabError}
          </p>
        ) : null}

        <TabsContent value="proposicoes" className="animate-fade">
          {loadingTab === "proposicoes" && (
            <p className="text-sm text-muted-foreground">Carregando projetos…</p>
          )}
          {propsData && propsData.items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma proposição sincronizada. Rode{" "}
              <code className="text-xs">
                npm run sync -- propositions --deputy={deputy.id}
              </code>
              .
            </p>
          )}
          <ul className="space-y-3">
            {propsData?.items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border/70 bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {[item.siglaTipo, item.numero, item.ano]
                      .filter((v) => v != null && v !== "")
                      .join(" ")}
                  </Badge>
                  {item.statusResumo ? (
                    <span className="text-xs text-muted-foreground">
                      {item.statusResumo}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {item.ementa || "Sem ementa disponível."}
                </p>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="votos" className="animate-fade">
          {loadingTab === "votos" && (
            <p className="text-sm text-muted-foreground">Carregando votações…</p>
          )}
          {votesData && votesData.items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum voto sincronizado ainda. Rode{" "}
              <code className="text-xs">
                npm run sync -- votes --year={new Date().getFullYear()}
              </code>
              .
            </p>
          )}
          <ul className="space-y-3">
            {votesData?.items.map((vote) => (
              <li
                key={vote.id}
                className="rounded-lg border border-border/70 bg-white/70 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={voteVariant(vote.tipoVoto)}>
                    {vote.tipoVoto}
                  </Badge>
                  {vote.proposicao ? (
                    <span className="text-xs font-medium text-foreground">
                      {[
                        vote.proposicao.siglaTipo,
                        vote.proposicao.numero,
                        vote.proposicao.ano,
                      ]
                        .filter((v) => v != null && v !== "")
                        .join(" ")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Proposição não vinculada
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {vote.votacao.descricao ||
                    vote.proposicao?.ementa ||
                    "Sem descrição."}
                </p>
                {vote.votacao.dataHoraRegistro ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {vote.votacao.dataHoraRegistro}
                    {vote.votacao.siglaOrgao
                      ? ` · ${vote.votacao.siglaOrgao}`
                      : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="presenca" className="animate-fade">
          {loadingTab === "presenca" && (
            <p className="text-sm text-muted-foreground">Carregando presença…</p>
          )}
          {attendance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Stat
                  label="Eventos"
                  value={attendance.summary.eventosConsiderados}
                />
                <Stat label="Presente" value={attendance.summary.presentes} />
                <Stat label="Faltas*" value={attendance.summary.faltas} />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                * {attendance.summary.metodologia}
              </p>
              {attendance.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem eventos/presenças sincronizados. Rode{" "}
                  <code className="text-xs">
                    npm run sync -- attendance --year={attendance.year}
                  </code>
                  .
                </p>
              ) : (
                <ul className="space-y-2">
                  {attendance.items.map((row) => (
                    <li
                      key={row.eventId}
                      className="flex items-start justify-between gap-3 border-b border-border/60 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {row.descricaoTipo || "Evento"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.dataHoraInicio || "Data indisponível"}
                          {row.localCamara ? ` · ${row.localCamara}` : ""}
                        </p>
                      </div>
                      <Badge variant={row.presente ? "success" : "danger"}>
                        {row.presente ? "Presente" : "Falta"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="partido" className="animate-fade">
          <div className="mb-4">
            <h2 className="font-display text-xl font-semibold">
              {deputy.party?.nome || deputy.siglaPartido || "Partido"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Outros membros na mesma legislatura
            </p>
          </div>
          {deputy.partyMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum outro membro encontrado no banco local.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {deputy.partyMembers.map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/deputados/${member.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-white/70 px-3 py-2 transition-colors hover:bg-secondary/60"
                  >
                    <div className="relative h-9 w-9 overflow-hidden rounded-full bg-muted">
                      {member.urlFoto ? (
                        <Image
                          src={member.urlFoto}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="36px"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.siglaUf}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-white/70 px-3 py-3 text-center">
      <p className="font-display text-2xl font-semibold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function labelSocial(url: string) {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    if (host.includes("twitter") || host.includes("x.com")) return "X / Twitter";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("youtube")) return "YouTube";
    return host;
  } catch {
    return "Rede social";
  }
}
