import {
  currentLegislatura,
  getDeputy,
  listDeputies,
  listParties,
  partyIdFromUri,
} from "@/lib/camara/client";
import { resolveDeputyPhotoUrl } from "@/lib/camara/photo";
import { prisma } from "@/lib/db/prisma";
import { upsertDeputyMandate } from "./legislatures";
import { withSyncRun } from "./run";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncParties(legislaturaId = currentLegislatura()) {
  return withSyncRun("parties", async () => {
    const parties = await listParties(legislaturaId);
    let upserted = 0;

    for (const party of parties) {
      await prisma.party.upsert({
        where: { id: party.id },
        create: {
          id: party.id,
          sigla: party.sigla ?? "?",
          nome: party.nome,
          uri: party.uri,
          legislaturaId: party.idLegislatura ?? legislaturaId,
        },
        update: {
          sigla: party.sigla ?? "?",
          nome: party.nome,
          uri: party.uri,
          legislaturaId: party.idLegislatura ?? legislaturaId,
        },
      });
      upserted += 1;
    }

    return { parties: upserted };
  });
}

export async function syncDeputies(legislaturaId = currentLegislatura()) {
  return withSyncRun("deputies", async () => {
    const current = currentLegislatura();
    const list = await listDeputies({ idLegislatura: legislaturaId });
    let upserted = 0;
    let detailed = 0;
    let mandates = 0;

    for (const item of list) {
      const partyId =
        partyIdFromUri(item.uriPartido) ??
        (item.siglaPartido
          ? (
              await prisma.party.findFirst({
                where: {
                  sigla: item.siglaPartido,
                  legislaturaId,
                },
              })
            )?.id
          : null);

      const existing = await prisma.deputy.findUnique({
        where: { id: item.id },
        select: { id: true },
      });

      if (!existing) {
        await prisma.deputy.create({
          data: {
            id: item.id,
            uri: item.uri,
            nome: item.nome,
            siglaPartido: item.siglaPartido,
            partyId: partyId ?? undefined,
            siglaUf: item.siglaUf,
            legislaturaId: item.idLegislatura ?? legislaturaId,
            urlFoto: resolveDeputyPhotoUrl(item.id, item.urlFoto),
            email: item.email,
            syncedAt: new Date(),
          },
        });
        upserted += 1;
      } else if (legislaturaId === current) {
        await prisma.deputy.update({
          where: { id: item.id },
          data: {
            uri: item.uri,
            nome: item.nome,
            siglaPartido: item.siglaPartido,
            partyId: partyId ?? undefined,
            siglaUf: item.siglaUf,
            legislaturaId: item.idLegislatura ?? legislaturaId,
            urlFoto: resolveDeputyPhotoUrl(item.id, item.urlFoto),
            email: item.email,
            syncedAt: new Date(),
          },
        });
        upserted += 1;
      }

      const legislature = await prisma.legislature.findUnique({
        where: { id: legislaturaId },
        select: { id: true },
      });
      if (legislature) {
        await upsertDeputyMandate({
          deputyId: item.id,
          legislaturaId,
          siglaPartido: item.siglaPartido,
          uriPartido: item.uriPartido,
          siglaUf: item.siglaUf,
          nomeEleitoral: item.nome,
        });
        mandates += 1;
      }
    }

    const skipDetail = process.env.SKIP_DEPUTY_DETAIL === "1";
    const detailLimit = Number(process.env.DEPUTY_DETAIL_LIMIT ?? 0);

    if (!skipDetail) {
      const toDetail =
        detailLimit > 0 ? list.slice(0, detailLimit) : list;

      for (const item of toDetail) {
        try {
          const detail = await getDeputy(item.id);
          const status = detail.ultimoStatus;
          const detailedPartyId =
            partyIdFromUri(status?.uriPartido) ??
            (status?.siglaPartido
              ? (
                  await prisma.party.findFirst({
                    where: { sigla: status.siglaPartido, legislaturaId },
                  })
                )?.id
              : null);

          const gabineteEmail =
            status?.gabinete && typeof status.gabinete.email === "string"
              ? status.gabinete.email
              : undefined;

          await prisma.deputy.update({
            where: { id: item.id },
            data: {
              nomeCivil: detail.nomeCivil,
              nomeEleitoral: status?.nomeEleitoral ?? status?.nome,
              nome: status?.nome ?? item.nome,
              siglaPartido: status?.siglaPartido ?? item.siglaPartido,
              partyId: detailedPartyId ?? undefined,
              siglaUf: status?.siglaUf ?? item.siglaUf,
              legislaturaId: status?.idLegislatura ?? legislaturaId,
              urlFoto: resolveDeputyPhotoUrl(
                item.id,
                status?.urlFoto ?? item.urlFoto,
              ),
              email: status?.email ?? gabineteEmail ?? item.email,
              situacao: status?.situacao,
              condicaoEleitoral: status?.condicaoEleitoral,
              redesSociais: JSON.stringify(detail.redeSocial ?? []),
              dataNascimento: detail.dataNascimento,
              municipioNascimento: detail.municipioNascimento,
              escolaridade: detail.escolaridade,
              gabineteJson: status?.gabinete
                ? JSON.stringify(status.gabinete)
                : null,
              syncedAt: new Date(),
            },
          });
          detailed += 1;
        } catch (error) {
          console.warn(`Failed to detail deputy ${item.id}`, error);
        }
        await sleep(Number(process.env.CAMARA_REQUEST_DELAY_MS ?? 600));
      }
    }

    return { deputies: upserted, detailed, mandates };
  });
}
