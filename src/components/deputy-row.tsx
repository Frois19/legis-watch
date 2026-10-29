import { DeputyPhoto } from "@/components/deputy-photo";
import { FavoriteButton } from "@/components/favorite-button";
import type { DeputyListItem } from "@/lib/api/types";
import Link from "next/link";

export function DeputyRow({
  deputy,
  legislaturaId,
}: {
  deputy: DeputyListItem;
  legislaturaId?: number | null;
}) {
  const name = deputy.nomeEleitoral || deputy.nome;
  const meta = [deputy.siglaPartido, deputy.siglaUf, deputy.situacao]
    .filter(Boolean)
    .join(" · ");
  const href =
    legislaturaId != null
      ? `/deputados/${deputy.id}?legislaturaId=${legislaturaId}`
      : `/deputados/${deputy.id}`;

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 py-3">
        <Link
          href={href}
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
          item={{
            key: `camara:${deputy.id}`,
            sphere: "federal_deputado",
            source: "camara",
            externalId: String(deputy.id),
            nome: name,
            siglaPartido: deputy.siglaPartido,
            siglaUf: deputy.siglaUf,
            urlFoto: deputy.urlFoto,
            href: `/deputados/${deputy.id}`,
          }}
        />
      </div>
    </li>
  );
}
