import { prisma } from "@/lib/db/prisma";

export async function startSyncRun(domain: string) {
  return prisma.syncRun.create({
    data: { domain, status: "running" },
  });
}

export async function finishSyncRun(
  id: number,
  status: "success" | "error",
  message?: string,
  counts?: Record<string, number>,
) {
  return prisma.syncRun.update({
    where: { id },
    data: {
      status,
      message: message?.slice(0, 2000),
      countsJson: counts ? JSON.stringify(counts) : undefined,
      finishedAt: new Date(),
    },
  });
}

export async function withSyncRun<T extends Record<string, number>>(
  domain: string,
  fn: () => Promise<T>,
): Promise<T> {
  const run = await startSyncRun(domain);
  try {
    const counts = await fn();
    await finishSyncRun(run.id, "success", undefined, counts);
    return counts;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishSyncRun(run.id, "error", message);
    throw error;
  }
}
