import { Badge } from "@/components/ui/badge";
import { SenatorProfileView } from "@/components/senator-profile";
import type { StateDeputyDetail } from "@/lib/api/types";
import { prisma } from "@/lib/db/prisma";
import { getAssembly } from "@/lib/parliament/assemblies";
import { parliamentarianId } from "@/lib/parliament/types";
import { serializeSenatorDetail } from "@/lib/senado/serialize";
import { ensureSenatorProfile } from "@/lib/sync/senado";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ source: string; id: string }> };

export default async function ParliamentarianPage({ params }: Params) {
  const { source, id: externalId } = await params;
  if (source === "senado") {
    return <SenatorProfile externalId={externalId} />;
  }
  return <StateDeputyProfile source={source} externalId={externalId} />;
}

async function SenatorProfile({ externalId }: { externalId: string }) {
  const row = await ensureSenatorProfile(externalId);
  if (!row) notFound();
  return <SenatorProfileView detail={serializeSenatorDetail(row)} />;
}

async function StateDeputyProfile({
  source,
  externalId,
}: {
  source: string;
  externalId: string;
}) {
  const key = parliamentarianId(source, externalId);
  const row = await prisma.stateDeputy.findUnique({ where: { id: key } });
  if (!row) notFound();

  const assembly = getAssembly(row.source);
  const detail: StateDeputyDetail = {
    key: row.id,
    sphere: "estadual_deputado",
    source: row.source,
    id: row.id,
    externalId: row.externalId,
    nome: row.nome,
    nomeEleitoral: row.nomeEleitoral,
    siglaPartido: row.siglaPartido,
    siglaUf: row.uf,
    urlFoto: row.urlFoto,
    email: row.email,
    situacao: row.situacao,
    assemblyName: assembly?.name ?? row.source,
    coverage: assembly?.coverage ?? {
      search: true,
      profile: true,
      propositions: false,
      votes: false,
      attendance: false,
    },
    syncedAt: row.syncedAt?.toISOString() ?? null,
    href: `/parlamentares/${row.source}/${row.externalId}`,
  };

  const name = detail.nomeEleitoral || detail.nome;
  const meta = [detail.siglaPartido, detail.siglaUf, detail.situacao]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="space-y-6">
      <Link
        href="/"
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← Voltar à busca
      </Link>

      <header className="space-y-3 border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Deputado estadual</Badge>
          <Badge variant="secondary">{detail.assemblyName}</Badge>
        </div>
        <h1 className="font-display text-3xl font-semibold text-primary">
          {name}
        </h1>
        {meta ? <p className="text-muted-foreground">{meta}</p> : null}
        {detail.email ? (
          <p className="text-sm text-muted-foreground">{detail.email}</p>
        ) : null}
        {assembly?.docsUrl ? (
          <a
            href={assembly.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2"
          >
            Dados abertos da casa
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </header>

      <section className="space-y-2 border border-border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">Cobertura nesta casa</h2>
        <p className="text-sm text-muted-foreground">
          O piloto estadual começa pelo cadastro. Projetos, votações e presença
          entram quando o adapter da Assembleia publicar esses dados.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["Busca / perfil", detail.coverage.profile],
              ["Proposições", detail.coverage.propositions],
              ["Votações", detail.coverage.votes],
              ["Presença", detail.coverage.attendance],
            ] as const
          ).map(([label, ok]) => (
            <li
              key={label}
              className="flex items-center justify-between border border-border px-3 py-2 text-sm"
            >
              <span>{label}</span>
              <Badge variant={ok ? "success" : "secondary"}>
                {ok ? "Disponível" : "Em breve"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
