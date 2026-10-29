import { FavoritesPanel } from "@/components/favorites-panel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favoritos",
};

export default function FavoritosPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
          Favoritos
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Parlamentares salvos neste dispositivo. Não é preciso criar conta.
        </p>
      </header>
      <FavoritesPanel />
    </div>
  );
}
