import { SenatorProfileView } from "@/components/senator-profile";
import { StateDeputyProfileView } from "@/components/state-deputy-profile";
import { getAssembly } from "@/lib/parliament/assemblies";
import { serializeStateDeputyDetail } from "@/lib/parliament/serialize";
import { serializeSenatorDetail } from "@/lib/senado/serialize";
import {
  ensureStateDeputyProfile,
} from "@/lib/sync/estadual";
import { ensureSenatorProfile } from "@/lib/sync/senado";
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
  const row = await ensureStateDeputyProfile(source, externalId);
  if (!row) notFound();
  const assembly = getAssembly(row.source);
  return (
    <StateDeputyProfileView
      detail={serializeStateDeputyDetail(row)}
      docsUrl={assembly?.docsUrl}
    />
  );
}
