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
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="font-display text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
          Legis Watch
        </p>
        <h1 className="text-lg text-foreground sm:text-xl">
          Acompanhe parlamentares federais, estaduais e senadores
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Busque deputados federais, estaduais (27 UFs) ou senadores, favorite
          perfis e veja projetos, votações e presença — com dados públicos.
          A busca aceita link compartilhável (
          <code className="rounded bg-muted px-1 text-xs">
            ?esfera=&amp;uf=&amp;nome=
          </code>
          ).
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
