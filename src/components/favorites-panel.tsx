"use client";

import { DeputyRow } from "@/components/deputy-row";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { writeFavorites } from "@/lib/favorites/storage";
import Link from "next/link";

export function FavoritesPanel() {
  const { favorites, hydrated } = useFavorites();

  if (!hydrated) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Carregando favoritos…
      </p>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="border border-dashed border-border bg-card p-8 text-center">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Nenhum favorito ainda
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Busque um deputado e toque em Favoritar. Os favoritos ficam salvos
          neste navegador.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Ir para a busca</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {favorites.length} parlamentar{favorites.length === 1 ? "" : "es"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (
              window.confirm(
                "Remover todos os favoritos deste navegador?",
              )
            ) {
              writeFavorites([]);
            }
          }}
        >
          Limpar todos
        </Button>
      </div>
      <ul className="border border-border bg-card px-4" aria-label="Favoritos">
        {favorites.map((fav) => (
          <DeputyRow
            key={fav.id}
            deputy={{
              id: fav.id,
              nome: fav.nome,
              nomeEleitoral: fav.nome,
              siglaPartido: fav.siglaPartido,
              siglaUf: fav.siglaUf,
              legislaturaId: null,
              urlFoto: fav.urlFoto,
              email: null,
              situacao: null,
              redesSociais: [],
              party: null,
            }}
          />
        ))}
      </ul>
    </div>
  );
}
