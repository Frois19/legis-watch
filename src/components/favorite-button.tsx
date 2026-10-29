"use client";

import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import type { FavoriteItem } from "@/lib/favorites/storage";
import { Star } from "lucide-react";

export function FavoriteButton({
  item,
  size = "default",
}: {
  item: FavoriteItem;
  size?: "default" | "sm" | "icon";
}) {
  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const active = hydrated && isFavorite(item.key);
  const label = active
    ? `Remover ${item.nome} dos favoritos`
    : `Adicionar ${item.nome} aos favoritos`;

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
        toggleFavorite(item);
      }}
    >
      <Star aria-hidden="true" className={active ? "fill-current" : undefined} />
      {size !== "icon" ? (active ? "Favorito" : "Favoritar") : null}
    </Button>
  );
}
