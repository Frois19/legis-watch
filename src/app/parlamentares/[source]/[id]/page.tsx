import { SenatorProfileLoader } from "@/components/senator-profile-loader";
import { StateDeputyProfileLoader } from "@/components/state-deputy-profile-loader";
import { prisma } from "@/lib/db/prisma";
import { getAssembly } from "@/lib/parliament/assemblies";
import { serializeStateDeputyDetail } from "@/lib/parliament/serialize";
import { parliamentarianId } from "@/lib/parliament/types";
import { serializeSenatorDetail } from "@/lib/senado/serialize";
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
  const id = parliamentarianId("senado", String(externalId).trim());
  const row = await prisma.senator.findUnique({
    where: { id },
    include: {
      affiliations: { orderBy: { dataFiliacao: "desc" } },
      mandates: { orderBy: { dataInicio: "desc" } },
      matters: { orderBy: [{ ano: "desc" }, { numero: "desc" }] },
      votes: { orderBy: { dataSessao: "desc" } },
    },
  });
  if (!row) notFound();
  return <SenatorProfileLoader initial={serializeSenatorDetail(row)} />;
}

async function StateDeputyProfile({
  source,
  externalId,
}: {
  source: string;
  externalId: string;
}) {
  const id = parliamentarianId(source, String(externalId).trim());
  const row = await prisma.stateDeputy.findUnique({
    where: { id },
    include: {
      affiliations: { orderBy: { dataFiliacao: "desc" } },
      mandates: { orderBy: { dataInicio: "desc" } },
      propositions: { orderBy: [{ ano: "desc" }, { numero: "desc" }] },
      attendances: { orderBy: { dataSessao: "desc" } },
    },
  });
  if (!row) notFound();
  const assembly = getAssembly(row.source);
  return (
    <StateDeputyProfileLoader
      initial={serializeStateDeputyDetail(row)}
      docsUrl={assembly?.docsUrl}
    />
  );
}
