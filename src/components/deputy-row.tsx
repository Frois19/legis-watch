import { DeputyPhoto } from "@/components/deputy-photo";
import { FavoriteButton } from "@/components/favorite-button";
import type { DeputyListItem } from "@/lib/api/types";
import Link from "next/link";

export function DeputyRow({ deputy }: { deputy: DeputyListItem }) {
  const name = deputy.nomeEleitoral || deputy.nome;
  const meta = [deputy.siglaPartido, deputy.siglaUf, deputy.situacao]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 py-3">
        <Link
          href={`/deputados/${deputy.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <DeputyPhoto id={deputy.id} name={name} urlFoto={deputy.urlFoto} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{name}</p>
            {meta ? (
              <p className="truncate text-sm text-muted-foreground">{meta}</p>
            ) : null}
          </div>
        </Link>
        <FavoriteButton
          size="sm"
          deputy={{
            id: deputy.id,
            nome: name,
            siglaPartido: deputy.siglaPartido,
            siglaUf: deputy.siglaUf,
            urlFoto: deputy.urlFoto,
          }}
        />
      </div>
    </li>
  );
}
