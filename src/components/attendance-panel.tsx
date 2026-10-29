"use client";

import { Badge } from "@/components/ui/badge";
import type { AttendanceResponse, EventAta } from "@/lib/api/types";
import { formatDateTime, voteApprovalLabel } from "@/lib/format";
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

type AttendanceFilter = "todos" | "faltas" | "presentes";
type AttendanceRow = AttendanceResponse["items"][number];

const FILTER_OPTIONS: Array<{
  id: AttendanceFilter;
  label: string;
  description: string;
}> = [
  {
    id: "todos",
    label: "Todas as sessões",
    description: "Mostra presenças e faltas nas sessões deliberativas do plenário.",
  },
  {
    id: "faltas",
    label: "Só faltas",
    description:
      "Dias/sessões em que o deputado não aparece no registro oficial de presença. Abra a ata para ver o que foi votado na ausência.",
  },
  {
    id: "presentes",
    label: "Só presenças",
    description: "Sessões em que há registro oficial de presença.",
  },
];

function approvalVariant(aprovacao: boolean | null) {
  if (aprovacao === true) return "success" as const;
  if (aprovacao === false) return "danger" as const;
  return "secondary" as const;
}

function SessionAtaDetails({ eventId }: { eventId: number }) {
  const [ata, setAta] = useState<EventAta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(`/api/eventos/${eventId}/ata`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error || `Falha ao carregar ata (${res.status})`);
        }
        const data = (await res.json()) as EventAta;
        if (!cancelled) setAta(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar ata");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <p
        className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Carregando pauta e votações deste dia na Câmara…
      </p>
    );
  }

  if (error) {
    return (
      <p className="mt-3 text-xs text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!ata) return null;

  const hasPauta = ata.pauta.length > 0;
  const hasVotos = ata.votacoes.length > 0;

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <a
          href={ata.urlEvento}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
        >
          Página do evento na Câmara
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
        {ata.urlRegistro ? (
          <a
            href={ata.urlRegistro}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
          >
            Registro / vídeo
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {!hasPauta && !hasVotos ? (
        <p className="text-xs text-muted-foreground">
          Não encontramos pauta estruturada nem votações nominais sincronizadas
          para este dia. Use o link do evento na Câmara para o registro
          completo.
        </p>
      ) : null}

      {hasPauta ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Pauta / o que ocorreu
          </p>
          <ul className="space-y-3">
            {ata.pauta.map((item, index) => (
              <li
                key={`${item.proposicaoId ?? "x"}-${item.ordem ?? index}-${index}`}
                className="rounded-sm bg-secondary/40 px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {item.urlCamara && item.titulo ? (
                    <a
                      href={item.urlCamara}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-2"
                    >
                      {item.titulo}
                      <ExternalLink
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  ) : (
                    <span className="text-sm font-semibold">
                      {item.titulo || `Item ${item.ordem ?? index + 1}`}
                    </span>
                  )}
                  {item.topico ? (
                    <span className="text-xs text-muted-foreground">
                      {item.topico}
                    </span>
                  ) : null}
                </div>
                {item.ementa ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Do que se trata:{" "}
                    </span>
                    {item.ementa}
                  </p>
                ) : null}
                {item.situacaoItem ? (
                  <p className="mt-1 text-xs leading-relaxed text-foreground">
                    <span className="font-medium">O que foi feito/votado: </span>
                    {item.situacaoItem}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasVotos ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Votações nominais do dia
          </p>
          <ul className="space-y-2">
            {ata.votacoes.map((voto) => (
              <li
                key={voto.id}
                className="rounded-sm border border-border px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={approvalVariant(voto.aprovacao)}>
                    {voteApprovalLabel(voto.aprovacao)}
                  </Badge>
                  {voto.urlCamara && voto.proposicaoLabel ? (
                    <a
                      href={voto.urlCamara}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary underline underline-offset-2"
                    >
                      {voto.proposicaoLabel}
                    </a>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(voto.dataHoraRegistro)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {voto.descricao || "Sem descrição da votação."}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AttendanceRowItem({ row }: { row: AttendanceRow }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <li className="p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{row.descricaoTipo || "Sessão"}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(row.dataHoraInicio)}
            {row.situacao ? ` · ${row.situacao}` : ""}
          </p>
          {row.descricao ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {row.descricao}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-3.5" aria-hidden="true" />
            )}
            {open ? "Ocultar ata do dia" : "Ver ata do dia (pauta e votações)"}
          </button>
        </div>
        <Badge variant={row.presente ? "success" : "danger"}>
          {row.presente ? "Presente" : "Falta"}
        </Badge>
      </div>
      {open ? (
        <div id={panelId}>
          <SessionAtaDetails eventId={row.eventId} />
        </div>
      ) : null}
    </li>
  );
}

export function AttendancePanel({
  attendance,
}: {
  attendance: AttendanceResponse;
}) {
  const filterId = useId();
  const helpId = `${filterId}-help`;
  const [filter, setFilter] = useState<AttendanceFilter>("todos");

  const selected =
    FILTER_OPTIONS.find((option) => option.id === filter) ?? FILTER_OPTIONS[0];

  const filtered = useMemo(() => {
    if (filter === "faltas") {
      return attendance.items.filter((row) => !row.presente);
    }
    if (filter === "presentes") {
      return attendance.items.filter((row) => row.presente);
    }
    return attendance.items;
  }, [attendance.items, filter]);

  const visible = filtered.slice(0, 80);

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-3 gap-2"
        role="group"
        aria-label="Resumo de presença"
      >
        <button
          type="button"
          className="border border-border bg-card px-3 py-3 text-center transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-pressed={filter === "todos"}
          onClick={() => setFilter("todos")}
        >
          <p className="font-display text-2xl font-semibold text-primary">
            {attendance.summary.eventosConsiderados}
          </p>
          <p className="text-xs text-muted-foreground">Sessões</p>
        </button>
        <button
          type="button"
          className="border border-border bg-card px-3 py-3 text-center transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-pressed={filter === "presentes"}
          onClick={() => setFilter("presentes")}
        >
          <p className="font-display text-2xl font-semibold text-primary">
            {attendance.summary.presentes}
          </p>
          <p className="text-xs text-muted-foreground">Presente</p>
        </button>
        <button
          type="button"
          className="border border-border bg-card px-3 py-3 text-center transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-pressed={filter === "faltas"}
          onClick={() => setFilter("faltas")}
        >
          <p className="font-display text-2xl font-semibold text-primary">
            {attendance.summary.faltas}
          </p>
          <p className="text-xs text-muted-foreground">Faltas</p>
        </button>
      </div>

      <div className="space-y-2 border border-border bg-card p-4">
        <label htmlFor={filterId} className="text-sm font-medium">
          Filtrar presença
        </label>
        <select
          id={filterId}
          className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
          value={filter}
          aria-describedby={helpId}
          onChange={(event) =>
            setFilter(event.target.value as AttendanceFilter)
          }
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p id={helpId} className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{selected.label}: </span>
          {selected.description}
        </p>
        <p className="text-xs text-muted-foreground" role="status">
          Mostrando {visible.length}
          {filtered.length > visible.length ? ` de ${filtered.length}` : ""}{" "}
          {filter === "faltas"
            ? "faltas"
            : filter === "presentes"
              ? "presenças"
              : "sessões"}
          .
        </p>
      </div>

      {attendance.items.length === 0 ? (
        <p className="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Ainda não há sessões de plenário sincronizadas.
        </p>
      ) : filtered.length === 0 ? (
        <p className="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {filter === "faltas"
            ? "Nenhuma falta registrada neste mandato para o critério atual."
            : "Nenhuma sessão com este filtro."}
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border bg-card">
          {visible.map((row) => (
            <AttendanceRowItem key={row.eventId} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
