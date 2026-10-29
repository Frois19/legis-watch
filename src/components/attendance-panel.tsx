"use client";

import { Badge } from "@/components/ui/badge";
import type { AttendanceResponse } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { useId, useMemo, useState } from "react";

type AttendanceFilter = "todos" | "faltas" | "presentes";

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
      "Dias/sessões em que o deputado não aparece no registro oficial de presença.",
  },
  {
    id: "presentes",
    label: "Só presenças",
    description: "Sessões em que há registro oficial de presença.",
  },
];

export function AttendancePanel({
  attendance,
}: {
  attendance: AttendanceResponse;
}) {
  const filterId = useId();
  const helpId = `${filterId}-help`;
  const [filter, setFilter] = useState<AttendanceFilter>("todos");

  const selected = FILTER_OPTIONS.find((o) => o.id === filter) ?? FILTER_OPTIONS[0];

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
          {filtered.length > visible.length
            ? ` de ${filtered.length}`
            : ""}{" "}
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
            <li
              key={row.eventId}
              className="flex items-start justify-between gap-3 p-3 text-sm"
            >
              <div>
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
              </div>
              <Badge variant={row.presente ? "success" : "danger"}>
                {row.presente ? "Presente" : "Falta"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
