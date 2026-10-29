import { prisma } from "@/lib/db/prisma";
import { parliamentarianId } from "@/lib/parliament/types";
import { listSenadoresAtual } from "@/lib/senado/client";
import { withSyncRun } from "./run";

export async function syncSenadores() {
  return withSyncRun("senadores", async () => {
    const rows = await listSenadoresAtual();
    let upserted = 0;

    for (const row of rows) {
      const id = parliamentarianId("senado", row.externalId);
      await prisma.senator.upsert({
        where: { id },
        create: {
          id,
          source: "senado",
          externalId: row.externalId,
          nome: row.nome,
          nomeCivil: row.nomeCivil,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          siglaPartido: row.siglaPartido,
          siglaUf: row.siglaUf,
          email: row.email,
          urlFoto: row.urlFoto,
          urlPagina: row.urlPagina,
          situacao: row.situacao,
          participacao: row.participacao,
          rawJson: row.raw ? JSON.stringify(row.raw) : null,
          syncedAt: new Date(),
        },
        update: {
          nome: row.nome,
          nomeCivil: row.nomeCivil,
          nomeEleitoral: row.nomeEleitoral ?? row.nome,
          siglaPartido: row.siglaPartido,
          siglaUf: row.siglaUf,
          email: row.email,
          urlFoto: row.urlFoto,
          urlPagina: row.urlPagina,
          situacao: row.situacao,
          participacao: row.participacao,
          rawJson: row.raw ? JSON.stringify(row.raw) : null,
          syncedAt: new Date(),
        },
      });
      upserted += 1;
    }

    return { senators: upserted };
  });
}
