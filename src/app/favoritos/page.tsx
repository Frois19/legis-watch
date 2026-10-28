import { FavoritesPanel } from "@/components/favorites-panel";

export default function FavoritosPage() {
  return (
    <div className="space-y-6">
      <section className="animate-rise">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-primary">
          Favoritos
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Seus parlamentares salvos neste dispositivo. Não é preciso criar
          conta.
        </p>
      </section>
      <FavoritesPanel />
    </div>
  );
}
