import { Badge } from "@/components/ui/badge";
import { DeputyPhoto } from "@/components/deputy-photo";
import type { SenatorDetail, StateDeputyDetail } from "@/lib/api/types";
import { prisma } from "@/lib/db/prisma";
import { getAssembly } from "@/lib/parliament/assemblies";
import { parliamentarianId } from "@/lib/parliament/types";
import {
  SENADO_ATTENDANCE_DISCLAIMER,
  SENADO_COVERAGE,
} from "@/lib/senado/types";
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
  const key = parliamentarianId("senado", externalId);
  const row = await prisma.senator.findUnique({ where: { id: key } });
  if (!row) notFound();

  const detail: SenatorDetail = {
    key: row.id,
    sphere: "senador",
    source: "senado",
    id: row.id,
    externalId: row.externalId,
    nome: row.nome,
    nomeCivil: row.nomeCivil,
    nomeEleitoral: row.nomeEleitoral,
    siglaPartido: row.siglaPartido,
    siglaUf: row.siglaUf,
    urlFoto: row.urlFoto,
    urlPagina: row.urlPagina,
    email: row.email,
    situacao: row.situacao,
    participacao: row.participacao,
    assemblyName: "Senado Federal",
    coverage: SENADO_COVERAGE,
    attendanceDisclaimer: SENADO_ATTENDANCE_DISCLAIMER,
    syncedAt: row.syncedAt?.toISOString() ?? null,
    href: `/parlamentares/senado/${row.externalId}`,
  };

  const name = detail.nomeEleitoral || detail.nome;
  const meta = [
    detail.siglaPartido,
    detail.siglaUf,
    detail.participacao,
    detail.situacao,
  ]
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
        <div className="flex flex-wrap items-start gap-4">
          <DeputyPhoto
            id={Number(detail.externalId) || -1}
            name={name}
            urlFoto={detail.urlFoto}
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Senador(a)</Badge>
              <Badge variant="secondary">{detail.assemblyName}</Badge>
            </div>
            <h1 className="font-display text-3xl font-semibold text-primary">
              {name}
            </h1>
            {detail.nomeCivil && detail.nomeCivil !== name ? (
              <p className="text-sm text-muted-foreground">{detail.nomeCivil}</p>
            ) : null}
            {meta ? <p className="text-muted-foreground">{meta}</p> : null}
            {detail.email ? (
              <p className="text-sm text-muted-foreground">{detail.email}</p>
            ) : null}
            <div className="flex flex-wrap gap-3 text-sm font-medium text-primary">
              {detail.urlPagina ? (
                <a
                  href={detail.urlPagina}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  Página no Senado
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
              <a
                href="https://legis.senado.leg.br/dadosabertos/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
              >
                Dados abertos do Senado
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-2 border border-border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">Cobertura no Senado</h2>
        <p className="text-sm text-muted-foreground">
          Esta fase cobre cadastro e busca. Matérias e votações entram em seguida;
          presença exige disclaimer — a API do Senado não equivale à da Câmara.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["Busca / perfil", detail.coverage.profile],
              ["Proposições / matérias", detail.coverage.propositions],
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

      <aside
        className="border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground"
        role="note"
      >
        <p className="font-medium text-foreground">Sobre presença no Senado</p>
        <p className="mt-1">{detail.attendanceDisclaimer}</p>
        <a
          href="https://www12.senado.leg.br/assessoria-de-imprensa/tutorial-de-verificacao-da-assiduidade-dos-senadores"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
        >
          Tutorial de assiduidade (Senado)
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </aside>
    </article>
  );
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
