import { DeputyPhoto } from "@/components/deputy-photo";
import { FavoriteButton } from "@/components/favorite-button";
import type { ParliamentarianListItem } from "@/lib/api/types";
import { favoriteKey } from "@/lib/favorites/storage";
import Link from "next/link";

export function ParliamentarianRow({
  item,
}: {
  item: ParliamentarianListItem;
}) {
  const name = item.nomeEleitoral || item.nome;
  const sphereLabel =
    item.sphere === "senador"
      ? "Senado"
      : item.sphere === "estadual_deputado"
        ? "Estadual"
        : "Federal";
  const meta = [sphereLabel, item.siglaPartido, item.siglaUf, item.situacao]
    .filter(Boolean)
    .join(" · ");

  const externalId =
    typeof item.id === "number"
      ? String(item.id)
      : String(item.id).includes(":")
        ? String(item.id).split(":").slice(1).join(":")
        : String(item.id);

  const photoId =
    typeof item.id === "number"
      ? item.id
      : item.sphere === "senador" && item.source === "senado"
        ? Number(externalId) || -1
        : item.urlFoto
          ? Number(externalId) || -1
          : -1;

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 py-3">
        <Link
          href={item.href}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
        <FavoriteButton
          size="sm"
          item={{
            key: favoriteKey(item.sphere, item.source, externalId),
            sphere: item.sphere,
            source: item.source,
            externalId,
            nome: name,
            siglaPartido: item.siglaPartido,
            siglaUf: item.siglaUf,
            urlFoto: item.urlFoto,
            href: item.href,
          }}
        />
      </div>
    </li>
  );
}
