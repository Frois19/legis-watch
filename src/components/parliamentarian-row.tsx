import { DeputyPhoto } from "@/components/deputy-photo";
import type { ParliamentarianListItem } from "@/lib/api/types";
import Link from "next/link";

export function ParliamentarianRow({
  item,
}: {
  item: ParliamentarianListItem;
}) {
  const name = item.nomeEleitoral || item.nome;
  const meta = [
    item.sphere === "estadual_deputado" ? "Estadual" : "Federal",
    item.siglaPartido,
    item.siglaUf,
    item.situacao,
  ]
    .filter(Boolean)
    .join(" · ");

  const photoId = typeof item.id === "number" ? item.id : -1;

  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={item.href}
        className="flex items-center gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <DeputyPhoto id={photoId} name={name} urlFoto={item.urlFoto} />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{name}</p>
          {meta ? (
            <p className="truncate text-sm text-muted-foreground">{meta}</p>
          ) : null}
          {item.assemblyName ? (
            <p className="truncate text-xs text-muted-foreground">
              {item.assemblyName}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
