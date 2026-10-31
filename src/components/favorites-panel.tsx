"use client";

import { DeputyPhoto } from "@/components/deputy-photo";
import { FavoriteButton } from "@/components/favorite-button";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import type { FavoriteItem } from "@/lib/favorites/storage";
import { writeFavorites } from "@/lib/favorites/storage";
import Link from "next/link";

function sphereLabel(item: FavoriteItem) {
  if (item.sphere === "senador") return "Senado";
  if (item.sphere === "estadual_deputado") return "Estadual";
  return "Federal";
}

function photoId(item: FavoriteItem) {
  if (item.sphere === "federal_deputado") {
    return Number(item.externalId) || -1;
  }
  if (item.sphere === "senador") {
    return Number(item.externalId) || -1;
  }
  return item.urlFoto ? Number(item.externalId) || -1 : -1;
}

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
          Busque um parlamentar (federal, estadual ou senador) e toque em
          Favoritar. Os favoritos ficam salvos neste navegador.
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
      <ul
        className="rounded-xl border border-border bg-card/80 px-4"
        aria-label="Favoritos"
      >
        {favorites.map((fav) => {
          const meta = [
            sphereLabel(fav),
            fav.siglaPartido,
            fav.siglaUf,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={fav.key} className="border-b border-border last:border-b-0">
              <div className="flex items-center gap-3 py-3">
                <Link
                  href={fav.href}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <DeputyPhoto
                    id={photoId(fav)}
                    name={fav.nome}
                    urlFoto={fav.urlFoto}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {fav.nome}
                    </p>
                    {meta ? (
                      <p className="truncate text-sm text-muted-foreground">
                        {meta}
                      </p>
                    ) : null}
                  </div>
                </Link>
                <FavoriteButton size="sm" item={fav} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
