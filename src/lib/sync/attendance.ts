import { downloadAttendances, downloadEvents } from "@/lib/camara/client";
import { prisma } from "@/lib/db/prisma";
import { withSyncRun } from "./run";

export async function syncAttendanceForYear(year: number) {
  return withSyncRun(`attendance:${year}`, async () => {
    const events = await downloadEvents(year);
    const attendances = await downloadAttendances(year);

    let eventsUpserted = 0;
    let attendancesUpserted = 0;
    let skipped = 0;

    for (const event of events) {
      const localCamara =
        typeof event.localCamara === "string"
          ? event.localCamara
          : event.localCamara?.nome;

      await prisma.event.upsert({
        where: { id: event.id },
        create: {
          id: event.id,
          dataHoraInicio: event.dataHoraInicio,
          dataHoraFim: event.dataHoraFim,
          situacao: event.situacao,
          descricaoTipo: event.descricaoTipo,
          descricao: event.descricao,
          localCamara,
          year,
          syncedAt: new Date(),
        },
        update: {
          dataHoraInicio: event.dataHoraInicio,
          dataHoraFim: event.dataHoraFim,
          situacao: event.situacao,
          descricaoTipo: event.descricaoTipo,
          descricao: event.descricao,
          localCamara,
          year,
          syncedAt: new Date(),
        },
      });
      eventsUpserted += 1;
    }

    const deputyIds = new Set(
      (await prisma.deputy.findMany({ select: { id: true } })).map((d) => d.id),
    );
    const eventIds = new Set(
      (await prisma.event.findMany({ select: { id: true } })).map((e) => e.id),
    );

    for (const row of attendances) {
      const eventId = row.idEvento;
      const deputyId = row.idDeputado;
      if (!eventId || !deputyId) {
        skipped += 1;
        continue;
      }
      if (!deputyIds.has(deputyId) || !eventIds.has(eventId)) {
        skipped += 1;
        continue;
      }

      await prisma.attendance.upsert({
        where: {
          eventId_deputyId: { eventId, deputyId },
        },
        create: {
          eventId,
          deputyId,
          presente: true,
          year,
        },
        update: {
          presente: true,
          year,
        },
      });
      attendancesUpserted += 1;
    }

    return {
      events: eventsUpserted,
      attendances: attendancesUpserted,
      skipped,
    };
  });
}
