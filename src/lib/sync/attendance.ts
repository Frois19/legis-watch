import { downloadAttendances, downloadEvents } from "@/lib/camara/client";
import { prisma } from "@/lib/db/prisma";
import { withSyncRun } from "./run";

async function createManyChunks<T extends object>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
  chunkSize = 1000,
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insert(rows.slice(i, i + chunkSize));
  }
}

export async function syncAttendanceForYear(year: number) {
  return withSyncRun(`attendance:${year}`, async () => {
    console.log(`[attendance:${year}] baixando arquivos…`);
    const [events, attendances] = await Promise.all([
      downloadEvents(year),
      downloadAttendances(year),
    ]);
    console.log(
      `[attendance:${year}] events=${events.length} attendances=${attendances.length}`,
    );

    await prisma.attendance.deleteMany({ where: { year } });
    await prisma.event.deleteMany({ where: { year } });

    const eventRows = events.map((event) => {
      const localCamara =
        typeof event.localCamara === "string"
          ? event.localCamara
          : event.localCamara?.nome ?? null;

      return {
        id: event.id,
        dataHoraInicio: event.dataHoraInicio ?? null,
        dataHoraFim: event.dataHoraFim || null,
        situacao: event.situacao ?? null,
        descricaoTipo: event.descricaoTipo ?? null,
        descricao: event.descricao ?? null,
        localCamara,
        year,
        syncedAt: new Date(),
      };
    });

    await createManyChunks(eventRows, (chunk) =>
      prisma.event.createMany({ data: chunk }),
    );

    const deputyIds = new Set(
      (await prisma.deputy.findMany({ select: { id: true } })).map((d) => d.id),
    );
    const eventIds = new Set(eventRows.map((e) => e.id));

    const attendanceRows: Array<{
      eventId: number;
      deputyId: number;
      presente: boolean;
      year: number;
    }> = [];
    let skipped = 0;

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
      attendanceRows.push({
        eventId,
        deputyId,
        presente: true,
        year,
      });
    }

    const uniqueAttendance = Array.from(
      new Map(
        attendanceRows.map((a) => [`${a.eventId}:${a.deputyId}`, a]),
      ).values(),
    );

    await createManyChunks(uniqueAttendance, (chunk) =>
      prisma.attendance.createMany({ data: chunk }),
    );

    console.log(
      `[attendance:${year}] ok events=${eventRows.length} attendances=${uniqueAttendance.length} skipped=${skipped}`,
    );

    return {
      events: eventRows.length,
      attendances: uniqueAttendance.length,
      skipped,
    };
  });
}
