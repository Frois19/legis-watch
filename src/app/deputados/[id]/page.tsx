import { DeputyProfile } from "@/components/deputy-profile";
import { Button } from "@/components/ui/button";
import { getDeputy } from "@/lib/api/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function DeputyPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  let deputy;
  try {
    deputy = await getDeputy(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/">← Voltar à busca</Link>
      </Button>
      <DeputyProfile deputy={deputy} />
    </div>
  );
}
