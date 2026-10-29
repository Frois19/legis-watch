import { prisma } from "@/lib/db/prisma";
import { getStateAdapter } from "@/lib/parliament/adapters";
import { parliamentarianId } from "@/lib/parliament/types";
import { withSyncRun } from "./run";

export async function syncStateAssembly(source: string) {
  const adapter = getStateAdapter(source);
  if (!adapter) {
    throw new Error(`assembly_adapter_not_found:${source}`);
  }

  return withSyncRun(`estadual:${source}`, async () => {
    const rows = await adapter.listParliamentarians();
    let upserted = 0;

    for (const row of rows) {
      const id = parliamentarianId(adapter.info.source, row.externalId);
      await prisma.stateDeputy.upsert({
        where: { id },
        create: {
          id,
          source: adapter.info.source,
          externalId: row.externalId,
          uf: adapter.info.uf,
          nome: row.nome,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          siglaPartido: row.siglaPartido,
          email: row.email,
          urlFoto: row.urlFoto,
          situacao: row.situacao,
          rawJson: row.raw ? JSON.stringify(row.raw) : null,
          syncedAt: new Date(),
        },
        update: {
          nome: row.nome,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          siglaPartido: row.siglaPartido,
          email: row.email,
          urlFoto: row.urlFoto,
          situacao: row.situacao,
          rawJson: row.raw ? JSON.stringify(row.raw) : null,
          syncedAt: new Date(),
        },
      });
      upserted += 1;
    }

    return { parliamentarians: upserted };
  });
}
