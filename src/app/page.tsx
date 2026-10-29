import { SearchPanel } from "@/components/search-panel";
import { listLegislatures } from "@/lib/api/server";
import { defaultLegislaturaId } from "@/lib/legislatures";

export default async function HomePage() {
  const legislatures = await listLegislatures();
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
          Acompanhe deputados federais por mandato
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Busque um parlamentar em qualquer legislatura, favorite o perfil e
          veja projetos, votações, presença no plenário e partido — com dados
          públicos da Câmara.
        </p>
      </header>
      <SearchPanel
        legislatures={legislatures}
        initialLegislaturaId={initialLegislaturaId}
      />
    </div>
  );
}
