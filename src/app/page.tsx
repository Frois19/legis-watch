import { SearchPanel } from "@/components/search-panel";
import { listLegislatures } from "@/lib/api/server";
import { defaultLegislaturaId } from "@/lib/legislatures";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const all = await listLegislatures();
  // Busca foca nas legislaturas recentes; o perfil lista todos os mandatos do parlamentar.
  const legislatures = all.filter((l) => l.id >= 52);
  const initialLegislaturaId =
    legislatures.find((l) => l.id === defaultLegislaturaId())?.id ??
    legislatures[0]?.id ??
    null;

  return (
    <div className="space-y-8">
      <header className="relative space-y-3 overflow-hidden rounded-xl border border-border bg-card/70 px-5 py-8 sm:px-8 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_20%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_60%)]"
        />
        <p className="font-display text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
          Legis Watch
        </p>
        <h1 className="max-w-2xl text-lg font-medium text-foreground sm:text-xl">
          Transparência parlamentar com dados públicos
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Busque deputados federais, estaduais (27 UFs) ou senadores. Favorite
          perfis e acompanhe projetos, votações e presença quando a casa
          publicar.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Carregando busca…</p>
        }
      >
        <SearchPanel
          legislatures={legislatures}
          initialLegislaturaId={initialLegislaturaId}
        />
      </Suspense>
    </div>
  );
}
