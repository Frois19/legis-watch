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
      <p className="animate-fade text-sm text-muted-foreground">
        Carregando favoritos…
      </p>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="animate-rise rounded-xl border border-dashed border-border bg-white/60 p-8 text-center">
        <p className="font-display text-xl font-semibold text-foreground">
          Nenhum favorito ainda
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Busque um deputado e toque em Favoritar para acompanhar o perfil neste
          dispositivo.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Ir para a busca</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {favorites.length} parlamentar{favorites.length === 1 ? "" : "es"}{" "}
          neste navegador
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => writeFavorites([])}
        >
          Limpar todos
        </Button>
      </div>
      <ul className="rounded-xl border border-border/80 bg-white/80 px-4 shadow-sm sm:px-5">
        {favorites.map((fav, index) => (
          <DeputyRow
            key={fav.id}
            index={index}
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
