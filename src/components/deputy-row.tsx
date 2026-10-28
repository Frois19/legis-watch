import { FavoriteButton } from "@/components/favorite-button";
import type { DeputyListItem } from "@/lib/api/types";
import Image from "next/image";
import Link from "next/link";

export function DeputyRow({
  deputy,
  index = 0,
}: {
  deputy: DeputyListItem;
  index?: number;
}) {
  return (
    <li
      className="animate-rise border-b border-border/80 last:border-b-0"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-center gap-3 py-3 sm:gap-4">
        <Link
          href={`/deputados/${deputy.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
            {deputy.urlFoto ? (
              <Image
                src={deputy.urlFoto}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {deputy.nomeEleitoral || deputy.nome}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {[deputy.siglaPartido, deputy.siglaUf, deputy.situacao]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </Link>
        <FavoriteButton
          size="sm"
          deputy={{
            id: deputy.id,
            nome: deputy.nomeEleitoral || deputy.nome,
            siglaPartido: deputy.siglaPartido,
            siglaUf: deputy.siglaUf,
            urlFoto: deputy.urlFoto,
          }}
        />
      </div>
    </li>
  );
}
