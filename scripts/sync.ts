#!/usr/bin/env tsx
/**
 * CLI de sincronização com a Câmara.
 *
 * Exemplos:
 *   npm run sync -- deputies
 *   npm run sync -- parties
 *   npm run sync -- propositions --deputy=204379
 *   npm run sync -- votes --year=2026
 *   npm run sync -- attendance --year=2026
 *   npm run sync -- bootstrap   # parties + deputies (sem votos/presença)
 */

import {
  syncAttendanceForYear,
  syncDeputies,
  syncParties,
  syncPropositionsForDeputy,
  syncVotesForYear,
} from "../src/lib/sync";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const command = process.argv[2];
  const year = Number(arg("year") ?? new Date().getFullYear());
  const deputyId = Number(arg("deputy") ?? 0);

  switch (command) {
    case "parties":
      console.log(await syncParties());
      break;
    case "deputies":
      console.log(await syncDeputies());
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
      console.log("parties", await syncParties());
      console.log("deputies", await syncDeputies());
      break;
    default:
      console.error(`Unknown command: ${command ?? "(none)"}`);
      console.error(
        "Commands: parties | deputies | propositions | votes | attendance | bootstrap",
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
