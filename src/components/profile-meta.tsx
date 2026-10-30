"use client";

import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import { ExternalLink } from "lucide-react";

export function ProfileFreshness({
  label = "Perfil atualizado",
  syncedAt,
}: {
  label?: string;
  syncedAt: string | null | undefined;
}) {
  return (
    <p className="text-xs text-muted-foreground">
      {label} {formatRelativeTime(syncedAt)}
      {syncedAt ? (
        <span className="sr-only">
          {" "}
          ({new Date(syncedAt).toLocaleString("pt-BR")})
        </span>
      ) : null}
    </p>
  );
}

export function DemoDataBanner({
  assemblyName,
  docsUrl,
}: {
  assemblyName: string;
  docsUrl?: string | null;
}) {
  return (
    <div
      role="status"
      className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warn">Dados de demonstração</Badge>
        <p>
          O cadastro de <strong>{assemblyName}</strong> ainda usa fixture local
          — a Assembleia não tem adapter live neste ambiente.
        </p>
      </div>
      {docsUrl ? (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-medium underline underline-offset-2"
        >
          Abrir portal da casa
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

export function ProfileTabsSkeleton({ label }: { label: string }) {
  return (
    <div
      className="space-y-3 border border-border bg-card p-4"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">Atualizando {label}…</p>
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded bg-muted" />
    </div>
  );
}
