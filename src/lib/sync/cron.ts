import { syncDeputies, syncParties } from "./deputies";
import { syncAllStateAssemblies } from "./estadual";
import { syncSenadores } from "./senado";

/**
 * Sync agendado: federal (partidos + deputados) + lista estadual + senadores.
 * Perfis enriquecidos (proposições/votos/presença) continuam sob demanda no perfil.
 */
export async function syncCron() {
  const parties = await syncParties();
  const deputies = await syncDeputies();
  const estadual = await syncAllStateAssemblies();
  const senadores = await syncSenadores();
  return {
    parties,
    deputies,
    estadual,
    senadores,
  };
}
