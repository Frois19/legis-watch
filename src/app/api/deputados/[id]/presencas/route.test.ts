import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getDeputyAttendance } = vi.hoisted(() => ({
  getDeputyAttendance: vi.fn(),
}));

vi.mock("@/lib/api/server", () => ({
  getDeputyAttendance: (...args: unknown[]) => getDeputyAttendance(...args),
}));

import { GET } from "./route";

describe("GET /api/deputados/[id]/presencas", () => {
  it("valida id", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/deputados/x/presencas"),
      { params: Promise.resolve({ id: "x" }) },
    );
    expect(res.status).toBe(400);
  });

  it("filtra por year quando legislatura ausente", async () => {
    getDeputyAttendance.mockResolvedValue({
      year: 2026,
      years: [2026],
      items: [
        { dataHoraInicio: "2026-01-01", presente: true },
        { dataHoraInicio: "2025-01-01", presente: false },
      ],
      summary: {
        eventosConsiderados: 2,
        presentes: 1,
        faltas: 1,
        metodologia: "m",
      },
    });

    const res = await GET(
      new NextRequest("http://localhost/api/deputados/1/presencas?year=2026"),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.eventosConsiderados).toBe(1);
    expect(body.summary.presentes).toBe(1);
  });

  it("usa legislaturaId e trata 404", async () => {
    getDeputyAttendance.mockResolvedValue({
      year: 2023,
      years: [2023],
      items: [],
      summary: {
        eventosConsiderados: 0,
        presentes: 0,
        faltas: 0,
        metodologia: "m",
      },
    });
    const ok = await GET(
      new NextRequest(
        "http://localhost/api/deputados/1/presencas?legislaturaId=57",
      ),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(ok.status).toBe(200);

    getDeputyAttendance.mockRejectedValue(new Error("legislature_not_found"));
    const missing = await GET(
      new NextRequest("http://localhost/api/deputados/1/presencas"),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(missing.status).toBe(404);
  });

  it("relança erros inesperados", async () => {
    getDeputyAttendance.mockRejectedValue(new Error("db"));
    await expect(
      GET(new NextRequest("http://localhost/api/deputados/1/presencas"), {
        params: Promise.resolve({ id: "1" }),
      }),
    ).rejects.toThrow("db");
  });
});

