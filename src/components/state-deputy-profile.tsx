"use client";

import { DeputyPhoto } from "@/components/deputy-photo";
import { FavoriteButton } from "@/components/favorite-button";
import { DemoDataBanner, ProfileFreshness } from "@/components/profile-meta";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StateDeputyDetail } from "@/lib/api/types";
import { favoriteKey } from "@/lib/favorites/storage";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

const ATTENDANCE_PAGE = 20;

type AttendanceFilter = "todos" | "faltas" | "presentes" | "justificados";

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
  const photoId = detail.urlFoto ? Number(detail.externalId) || -1 : -1;
  const hasEnrichment =
    detail.coverage.propositions ||
    detail.coverage.attendance ||
    detail.affiliations.length > 0 ||
    detail.mandates.length > 0 ||
    detail.propositions.length > 0 ||
    detail.attendance.length > 0;

  const [attendanceFilter, setAttendanceFilter] =
    useState<AttendanceFilter>("todos");
  const [attendancePage, setAttendancePage] = useState(0);
  const [propsPage, setPropsPage] = useState(0);

  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === "faltas") {
      return detail.attendance.filter((r) => r.status === "ausente");
    }
    if (attendanceFilter === "presentes") {
      return detail.attendance.filter((r) => r.status === "presente");
    }
    if (attendanceFilter === "justificados") {
      return detail.attendance.filter((r) => r.status === "justificado");
    }
    return detail.attendance;
  }, [detail.attendance, attendanceFilter]);

  const attendanceSlice = filteredAttendance.slice(
    attendancePage * ATTENDANCE_PAGE,
    attendancePage * ATTENDANCE_PAGE + ATTENDANCE_PAGE,
  );
  const attendancePages = Math.max(
    1,
    Math.ceil(filteredAttendance.length / ATTENDANCE_PAGE),
  );

  const propsSlice = detail.propositions.slice(
    propsPage * ATTENDANCE_PAGE,
    propsPage * ATTENDANCE_PAGE + ATTENDANCE_PAGE,
  );
  const propsPages = Math.max(
    1,
    Math.ceil(detail.propositions.length / ATTENDANCE_PAGE),
  );

  return (
    <article className="space-y-6">
      <Link
        href={`/?esfera=estadual_deputado&uf=${encodeURIComponent(detail.siglaUf)}`}
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← Voltar à busca ({detail.siglaUf})
      </Link>

      {detail.isDemoData ? (
        <DemoDataBanner
          assemblyName={detail.assemblyName}
          docsUrl={docsUrl}
        />
      ) : null}

      <header className="space-y-3 border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
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
                {detail.dataMode === "live" ? (
                  <Badge variant="success">API live</Badge>
                ) : (
                  <Badge variant="warn">Fixture</Badge>
                )}
              </div>
              <h1 className="font-display text-3xl font-semibold text-primary">
                {name}
              </h1>
              {meta ? <p className="text-muted-foreground">{meta}</p> : null}
              {detail.email ? (
                <p className="text-sm text-muted-foreground">{detail.email}</p>
              ) : null}
              <ProfileFreshness
                label="Cadastro sincronizado"
                syncedAt={detail.profileSyncedAt ?? detail.syncedAt}
              />
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
          <FavoriteButton
            item={{
              key: favoriteKey(
                "estadual_deputado",
                detail.source,
                detail.externalId,
              ),
              sphere: "estadual_deputado",
              source: detail.source,
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

      {hasEnrichment ? (
        <Tabs
          defaultValue={
            detail.coverage.propositions
              ? "proposicoes"
              : detail.coverage.attendance
                ? "presenca"
                : "filiacoes"
          }
        >
          <TabsList
            aria-label="Seções do perfil estadual"
            className="h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto"
          >
            {detail.coverage.propositions || detail.propositions.length > 0 ? (
              <TabsTrigger value="proposicoes">
                Proposições ({detail.propositions.length})
              </TabsTrigger>
            ) : null}
            {detail.coverage.attendance || detail.attendance.length > 0 ? (
              <TabsTrigger value="presenca">
                Presença ({detail.attendanceSummary.ausentes} faltas)
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
                <EmptyBlock
                  title="Nenhuma proposição sincronizada"
                  hint={
                    docsUrl
                      ? "Consulte o portal da Assembleia ou reabra o perfil após o sync."
                      : "Rode o sync de perfil desta casa e tente de novo."
                  }
                  docsUrl={docsUrl}
                />
              ) : (
                <>
                  <ul className="divide-y divide-border border border-border bg-card">
                    {propsSlice.map((item) => {
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
                              <Badge variant="secondary">
                                {item.statusResumo}
                              </Badge>
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
                  <Pager
                    page={propsPage}
                    pages={propsPages}
                    total={detail.propositions.length}
                    onChange={setPropsPage}
                  />
                </>
              )}
            </TabsContent>
          )}

          {(detail.coverage.attendance || detail.attendance.length > 0) && (
            <TabsContent value="presenca" className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-4">
                {(
                  [
                    ["Sessões", detail.attendanceSummary.eventosConsiderados],
                    ["Presentes", detail.attendanceSummary.presentes],
                    ["Justificados", detail.attendanceSummary.justificados],
                    ["Ausentes", detail.attendanceSummary.ausentes],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="border border-border bg-card px-3 py-2 text-sm"
                  >
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-display text-xl font-semibold text-foreground">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Filtrar presença"
              >
                {(
                  [
                    ["todos", "Todas"],
                    ["faltas", "Só faltas"],
                    ["presentes", "Só presentes"],
                    ["justificados", "Só justificados"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={attendanceFilter === value}
                    onClick={() => {
                      setAttendanceFilter(value);
                      setAttendancePage(0);
                    }}
                    className={
                      attendanceFilter === value
                        ? "border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                        : "border border-border bg-background px-3 py-1.5 text-sm hover:bg-secondary"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredAttendance.length === 0 ? (
                <EmptyBlock
                  title="Nenhuma sessão neste filtro"
                  hint="Troque o filtro ou aguarde um novo sync de presença."
                  docsUrl={docsUrl}
                />
              ) : (
                <>
                  <ul className="divide-y divide-border border border-border bg-card">
                    {attendanceSlice.map((row) => (
                      <li
                        key={row.dataSessao}
                        className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            Sessão {formatDate(row.dataSessao)}
                          </p>
                          {row.observacao ? (
                            <p className="text-xs text-muted-foreground">
                              {row.observacao}
                            </p>
                          ) : null}
                        </div>
                        <Badge
                          variant={
                            row.status === "presente"
                              ? "success"
                              : row.status === "justificado"
                                ? "secondary"
                                : "danger"
                          }
                        >
                          {row.status === "presente"
                            ? "Presente"
                            : row.status === "justificado"
                              ? "Justificado"
                              : "Ausente"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <Pager
                    page={attendancePage}
                    pages={attendancePages}
                    total={filteredAttendance.length}
                    onChange={setAttendancePage}
                  />
                </>
              )}
            </TabsContent>
          )}

          <TabsContent value="filiacoes" className="space-y-3">
            {detail.affiliations.length === 0 ? (
              <EmptyBlock
                title="Sem histórico de filiação sincronizado"
                hint="Esta casa ainda não publica filiações na API usada pelo Legis Watch."
                docsUrl={docsUrl}
              />
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
              <EmptyBlock
                title="Sem mandatos sincronizados"
                hint="Quando a Assembleia publicar legislaturas na API, elas aparecem aqui."
                docsUrl={docsUrl}
              />
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
            <CoverageSection detail={detail} docsUrl={docsUrl} />
          </TabsContent>
        </Tabs>
      ) : (
        <CoverageSection detail={detail} docsUrl={docsUrl} />
      )}
    </article>
  );
}

function Pager({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <p>
        Página {page + 1} de {pages} · {total} itens
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="border border-border px-3 py-1.5 disabled:opacity-40"
          disabled={page <= 0}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="border border-border px-3 py-1.5 disabled:opacity-40"
          disabled={page >= pages - 1}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function EmptyBlock({
  title,
  hint,
  docsUrl,
}: {
  title: string;
  hint: string;
  docsUrl?: string | null;
}) {
  return (
    <div className="space-y-2 border border-border bg-card p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p>{hint}</p>
      {docsUrl ? (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
        >
          Abrir portal da casa
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

function CoverageSection({
  detail,
  docsUrl,
}: {
  detail: StateDeputyDetail;
  docsUrl?: string | null;
}) {
  return (
    <section className="space-y-2 border border-border bg-card p-4">
      <h2 className="font-display text-xl font-semibold">Cobertura nesta casa</h2>
      <p className="text-sm text-muted-foreground">
        Cadastro está disponível em todas as UFs. Proposições, filiações,
        mandatos e presença entram quando a Assembleia publica API.
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
      {docsUrl ? (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2"
        >
          Portal / dados abertos
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </section>
  );
}
