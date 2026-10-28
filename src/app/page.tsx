import { SearchPanel } from "@/components/search-panel";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="animate-rise max-w-2xl">
        <p className="font-display text-5xl font-semibold tracking-tight text-primary sm:text-6xl">
          Legis Watch
        </p>
        <h1 className="mt-3 text-xl font-medium text-foreground sm:text-2xl">
          Acompanhe o mandato de quem você elegeu
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          Pesquise deputados federais, favorite um ou mais perfis e veja
          projetos, votações, presença e partido — com dados públicos da Câmara.
        </p>
      </section>

      <SearchPanel />
    </div>
  );
}
