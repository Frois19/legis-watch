"use client";

import { AttendancePanel } from "@/components/attendance-panel";
import { DeputyPhoto } from "@/components/deputy-photo";
import { FavoriteButton } from "@/components/favorite-button";
import { PropositionsPanel } from "@/components/propositions-panel";
import { VotesPanel } from "@/components/votes-panel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AttendanceResponse,
  DeputyDetail,
  Paginated,
  PropositionItem,
  PropositionStats,
  VoteItem,
} from "@/lib/api/types";
import { socialLabel } from "@/lib/format";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function DeputyProfile({
  deputy,
  propositions,
  votes,
  attendance,
}: {
  deputy: DeputyDetail;
  propositions: Paginated<PropositionItem> & { stats: PropositionStats };
  votes: Paginated<VoteItem>;
  attendance: AttendanceResponse;
}) {
  const router = useRouter();
  const name = deputy.nomeEleitoral || deputy.nome;
  const selectedMandate = deputy.mandates.find(
    (m) => m.legislaturaId === deputy.selectedLegislaturaId,
  );
  const meta = [deputy.siglaPartido, deputy.siglaUf, deputy.situacao]
    .filter(Boolean)
    .join(" · ");
  const { aprovados, apresentados } = propositions.stats;

  return (
    <article className="space-y-8">
      <header className="border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <DeputyPhoto
              id={deputy.id}
              name={name}
              urlFoto={deputy.urlFoto}
              size="lg"
              priority
            />
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                {name}
              </h1>
              {meta ? (
                <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
              ) : null}
              {deputy.nomeCivil && deputy.nomeCivil !== name ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Nome civil: {deputy.nomeCivil}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {deputy.condicaoEleitoral ? (
                  <Badge variant="secondary">{deputy.condicaoEleitoral}</Badge>
                ) : null}
                {deputy.email ? (
                  <a
                    href={`mailto:${deputy.email}`}
                    className="text-sm text-primary underline underline-offset-2"
                  >
                    {deputy.email}
                  </a>
                ) : null}
              </div>
              {deputy.mandates.length > 0 ? (
                <div className="mt-4 space-y-1.5">
                  <label
                    htmlFor={`mandato-${deputy.id}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Mandato
                  </label>
                  <select
                    id={`mandato-${deputy.id}`}
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
                    value={deputy.selectedLegislaturaId ?? ""}
                    onChange={(event) => {
                      const next = event.target.value;
                      router.push(
                        `/deputados/${deputy.id}?legislaturaId=${next}`,
                      );
                    }}
                  >
                    {deputy.mandates.map((mandate) => (
                      <option
                        key={mandate.legislaturaId}
                        value={mandate.legislaturaId}
                      >
                        {mandate.label}
                        {mandate.siglaPartido
                          ? ` · ${mandate.siglaPartido}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {selectedMandate ? (
                    <p className="text-xs text-muted-foreground">
                      Período {selectedMandate.dataInicio.slice(0, 10)} a{" "}
                      {selectedMandate.dataFim.slice(0, 10)}. Projetos, votos e
                      presença filtrados por este mandato.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <FavoriteButton
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

        {deputy.redesSociais.length > 0 ? (
          <nav aria-label="Redes sociais" className="mt-5 flex flex-wrap gap-2">
            {deputy.redesSociais.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 border border-border px-2.5 py-1.5 text-sm text-foreground hover:bg-secondary"
              >
                {socialLabel(url)}
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            ))}
          </nav>
        ) : null}

        <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Projetos (aprovados/apresentados)</dt>
            <dd className="font-medium">
              {aprovados}/{apresentados}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Votos nominais</dt>
            <dd className="font-medium">{votes.total}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Presença no plenário</dt>
            <dd className="font-medium">
              {attendance.summary.presentes}/{attendance.summary.eventosConsiderados}
            </dd>
          </div>
        </dl>
      </header>

      <Tabs defaultValue="proposicoes">
        <TabsList aria-label="Seções do perfil">
          <TabsTrigger value="proposicoes">
            Projetos ({propositions.total})
          </TabsTrigger>
          <TabsTrigger value="votos">Votações ({votes.total})</TabsTrigger>
          <TabsTrigger value="presenca">
            Presença ({attendance.summary.faltas} faltas)
          </TabsTrigger>
          <TabsTrigger value="partido">Partido</TabsTrigger>
        </TabsList>

        <TabsContent value="proposicoes">
          <SectionTitle
            title="Projetos propostos"
            description="Proposições sincronizadas em que este deputado figura como autor. Filtre por status para entender a fase de cada projeto."
          />
          <PropositionsPanel
            items={propositions.items}
            total={propositions.total}
          />
        </TabsContent>

        <TabsContent value="votos">
          <SectionTitle
            title="Histórico de votações"
            description="Como o deputado votou, o que era o projeto, o resultado da sessão e link para a ficha na Câmara."
          />
          <VotesPanel items={votes.items} total={votes.total} />
        </TabsContent>

        <TabsContent value="presenca">
          <SectionTitle
            title="Presença no Plenário"
            description={attendance.summary.metodologia}
          />
          <AttendancePanel attendance={attendance} />
        </TabsContent>

        <TabsContent value="partido">
          <SectionTitle
            title={deputy.party?.nome || deputy.siglaPartido || "Partido"}
            description={
              selectedMandate
                ? `Outros deputados do mesmo partido na ${selectedMandate.label}.`
                : "Outros deputados do mesmo partido neste mandato."
            }
          />
          {deputy.partyMembers.length === 0 ? (
            <EmptyState message="Nenhum outro membro encontrado." />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {deputy.partyMembers.map((member) => (
                <li key={member.id}>
                  <Link
                    href={
                      deputy.selectedLegislaturaId
                        ? `/deputados/${member.id}?legislaturaId=${deputy.selectedLegislaturaId}`
                        : `/deputados/${member.id}`
                    }
                    className="flex items-center gap-3 border border-border bg-card px-3 py-2 hover:bg-secondary"
                  >
                    <DeputyPhoto
                      id={member.id}
                      name={member.nome}
                      urlFoto={member.urlFoto}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.siglaUf}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </article>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

