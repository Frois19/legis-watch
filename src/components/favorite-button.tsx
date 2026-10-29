"use client";

import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import type { FavoriteDeputy } from "@/lib/favorites/storage";
import { Star } from "lucide-react";

export function FavoriteButton({
  deputy,
  size = "default",
}: {
  deputy: FavoriteDeputy;
  size?: "default" | "sm" | "icon";
}) {
  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const active = hydrated && isFavorite(deputy.id);
  const label = active
    ? `Remover ${deputy.nome} dos favoritos`
    : `Adicionar ${deputy.nome} aos favoritos`;

  return (
    <Button
      type="button"
      size={size}
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(deputy);
      }}
    >
      <Star aria-hidden="true" className={active ? "fill-current" : undefined} />
      {size !== "icon" ? (active ? "Favorito" : "Favoritar") : null}
    </Button>
  );
}
