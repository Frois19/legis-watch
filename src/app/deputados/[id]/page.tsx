import { DeputyProfile } from "@/components/deputy-profile";
import { getDeputyProfileBundle } from "@/lib/api/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ legislaturaId?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) return { title: "Deputado" };
  try {
    const { deputy } = await getDeputyProfileBundle(id);
    return {
      title: deputy.nomeEleitoral || deputy.nome,
      description: `Perfil de ${deputy.nomeEleitoral || deputy.nome} no Legis Watch`,
    };
  } catch {
    return { title: "Deputado não encontrado" };
  }
}

export default async function DeputyPage({ params, searchParams }: Props) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const legislaturaRaw = (await searchParams).legislaturaId;
  const legislaturaId = legislaturaRaw ? Number(legislaturaRaw) : null;

  let bundle;
  try {
    bundle = await getDeputyProfileBundle(
      id,
      legislaturaId && Number.isFinite(legislaturaId) ? legislaturaId : null,
    );
  } catch {
    notFound();
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Navegação secundária">
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          ← Voltar à busca
        </Link>
      </nav>
      <DeputyProfile
        deputy={bundle.deputy}
        propositions={bundle.propositions}
        votes={bundle.votes}
        attendance={bundle.attendance}
      />
    </div>
  );
}
