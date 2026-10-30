"use client";

import { ProfileTabsSkeleton } from "@/components/profile-meta";
import { StateDeputyProfileView } from "@/components/state-deputy-profile";
import type { StateDeputyDetail } from "@/lib/api/types";
import { useEffect, useState } from "react";

/**
 * Mostra o cadastro imediato e enriquece via API (TTL/on-demand) com skeleton.
 */
export function StateDeputyProfileLoader({
  initial,
  docsUrl,
}: {
  initial: StateDeputyDetail;
  docsUrl?: string | null;
}) {
  const [detail, setDetail] = useState(initial);
  const [enriching, setEnriching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setEnriching(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/parlamentares/${encodeURIComponent(initial.source)}/${encodeURIComponent(initial.externalId)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const body = (await res.json()) as StateDeputyDetail;
        if (!cancelled) setDetail(body);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível atualizar o perfil agora.",
          );
        }
      } finally {
        if (!cancelled) setEnriching(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initial.source, initial.externalId]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Cadastro local exibido. Enrich falhou: {error}
        </p>
      ) : null}
      {enriching ? <ProfileTabsSkeleton label="dados da Assembleia" /> : null}
      <StateDeputyProfileView detail={detail} docsUrl={docsUrl} />
    </div>
  );
}
