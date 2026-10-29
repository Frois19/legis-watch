import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, update } = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    syncRun: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

import { finishSyncRun, startSyncRun, withSyncRun } from "./run";

describe("sync run helpers", () => {
  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    create.mockResolvedValue({ id: 10, domain: "deputies", status: "running" });
    update.mockResolvedValue({ id: 10, status: "success" });
  });

  it("inicia sync run", async () => {
    await startSyncRun("deputies");
    expect(create).toHaveBeenCalledWith({
      data: { domain: "deputies", status: "running" },
    });
  });

  it("finaliza com counts e mensagem truncável", async () => {
    await finishSyncRun(10, "success", "ok", { deputies: 2 });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          status: "success",
          message: "ok",
          countsJson: JSON.stringify({ deputies: 2 }),
        }),
      }),
    );

    await finishSyncRun(11, "error", "x".repeat(3000));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({
          status: "error",
          message: "x".repeat(2000),
          countsJson: undefined,
        }),
      }),
    );
  });

  it("withSyncRun marca sucesso", async () => {
    const counts = await withSyncRun("votes", async () => ({ votes: 3 }));
    expect(counts).toEqual({ votes: 3 });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "success" }),
      }),
    );
  });

  it("withSyncRun marca erro e relança", async () => {
    await expect(
      withSyncRun("votes", async () => {
        throw new Error("falhou");
      }),
    ).rejects.toThrow("falhou");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "error",
          message: "falhou",
        }),
      }),
    );
  });

  it("withSyncRun serializa erro não-Error", async () => {
    await expect(
      withSyncRun("votes", async () => {
        throw "boom";
      }),
    ).rejects.toBe("boom");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ message: "boom" }),
      }),
    );
  });
});
