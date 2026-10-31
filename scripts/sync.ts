#!/usr/bin/env tsx
/**
 * CLI de sincronização com a Câmara.
 *
 * Exemplos:
 *   npm run sync -- legislatures
 *   npm run sync -- deputies
 *   npm run sync -- deputies --legislatura=56
 *   npm run sync -- mandates --deputy=204515
 *   npm run sync -- parties
 *   npm run sync -- propositions --deputy=204379
 *   npm run sync -- votes --year=2022
 *   npm run sync -- attendance --year=2022
 *   npm run sync -- bootstrap
 */

import {
  syncAttendanceForYear,
  syncCron,
  syncDeputies,
  syncDeputiesForLegislature,
  syncLegislatures,
  syncMandatesForDeputy,
  syncParties,
  syncPropositionsForDeputy,
  syncAllStateAssemblies,
  syncSenatorProfile,
  syncSenadores,
  syncStateAssembly,
  syncStateDeputyProfile,
  syncVotesForYear,
} from "../src/lib/sync";
import { currentLegislatura } from "../src/lib/camara/client";
import { prisma } from "../src/lib/db/prisma";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const command = process.argv[2];
  const year = Number(arg("year") ?? new Date().getFullYear());
  const deputyId = Number(arg("deputy") ?? 0);
  const legislaturaId = Number(arg("legislatura") ?? currentLegislatura());
  const source = arg("source") ?? "all";
  const codigo = arg("codigo") ?? arg("senator");

  switch (command) {
    case "legislatures":
      console.log(await syncLegislatures());
      break;
    case "parties":
      console.log(await syncParties(legislaturaId));
      break;
    case "deputies":
      if (legislaturaId !== currentLegislatura()) {
        console.log(await syncDeputiesForLegislature(legislaturaId));
      } else {
        console.log(await syncDeputies(legislaturaId));
      }
      break;
    case "mandates":
      if (!deputyId) throw new Error("Use --deputy=<id>");
      console.log(await syncMandatesForDeputy(deputyId));
      break;
    case "propositions":
      if (!deputyId) throw new Error("Use --deputy=<id>");
      console.log(await syncPropositionsForDeputy(deputyId));
      break;
    case "votes":
      console.log(await syncVotesForYear(year));
      break;
    case "attendance":
      console.log(await syncAttendanceForYear(year));
      break;
    case "bootstrap":
      console.log("legislatures", await syncLegislatures());
      console.log("parties", await syncParties());
      console.log("deputies", await syncDeputies());
      break;
    case "cron":
      console.log(await syncCron());
      break;
    case "estadual":
      if (source === "all") {
        console.log(await syncAllStateAssemblies());
      } else {
        console.log(await syncStateAssembly(source));
      }
      break;
    case "estadual-perfil": {
      if (!codigo) {
        throw new Error(
          "Use --source=<casa> --codigo=<id> (ex.: --source=aleac --codigo=248)",
        );
      }
      const house = source === "all" ? "" : source;
      if (!house) throw new Error("Use --source=<casa> (ex.: aleac, almg)");
      console.log(await syncStateDeputyProfile(house, codigo));
      break;
    }
    case "senadores":
    case "senado":
      console.log(await syncSenadores());
      break;
    case "senador-perfil":
    case "senadores-perfil": {
      if (codigo) {
        console.log(await syncSenatorProfile(codigo));
        break;
      }
      if (command === "senadores-perfil" || arg("all") === "1") {
        const rows = await prisma.senator.findMany({
          select: { externalId: true, nome: true },
          orderBy: { nome: "asc" },
        });
        let ok = 0;
        for (const row of rows) {
          try {
            const result = await syncSenatorProfile(row.externalId);
            console.log(row.externalId, row.nome, result);
            ok += 1;
          } catch (error) {
            console.error(
              row.externalId,
              row.nome,
              error instanceof Error ? error.message : error,
            );
          }
        }
        console.log({ enriched: ok, total: rows.length });
        break;
      }
      throw new Error(
        "Use --codigo=<id> (ex.: 5672) ou senadores-perfil / --all=1",
      );
    }
    default:
      console.error(`Unknown command: ${command ?? "(none)"}`);
      console.error(
        "Commands: legislatures | parties | deputies | mandates | propositions | votes | attendance | bootstrap | cron | estadual | estadual-perfil | senadores | senador-perfil",
      );
      console.error(
        "estadual: npm run sync -- estadual --source=all | --source=alepe",
      );
      console.error(
        "estadual-perfil: npm run sync -- estadual-perfil --source=aleac --codigo=248",
      );
      console.error(
        "senador-perfil: npm run sync -- senador-perfil --codigo=5672",
      );
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
