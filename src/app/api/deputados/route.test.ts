import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    deputyMandate: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    deputy: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { searchCache } from "@/lib/cache/memory-cache";
import { GET } from "./route";

describe("GET /api/deputados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchCache.clear();
  });

  it("serve do cache na segunda chamada idêntica", async () => {
    prisma.deputy.count.mockResolvedValue(1);
    prisma.deputy.findMany.mockResolvedValue([
      {
        id: 1,
        nome: "A",
        nomeEleitoral: null,
        siglaPartido: "PL",
        siglaUf: "MG",
        legislaturaId: 57,
        urlFoto: null,
        email: null,
        situacao: null,
        redesSociais: null,
        party: null,
      },
    ]);

    const req = new NextRequest(
      "http://localhost/api/deputados?siglaUf=MG&siglaPartido=PL",
    );
    const first = await GET(req);
    const second = await GET(req);
    expect(first.headers.get("X-Cache")).toBe("MISS");
    expect(second.headers.get("X-Cache")).toBe("HIT");
    expect(prisma.deputy.findMany).toHaveBeenCalledTimes(1);
  });

  it("busca por mandato via DeputyMandate", async () => {
    prisma.deputyMandate.count.mockResolvedValue(1);
    prisma.deputyMandate.findMany.mockResolvedValue([
      {
        legislaturaId: 56,
        siglaPartido: "AVANTE",
        siglaUf: "MG",
        situacao: null,
        nomeEleitoral: "ANDRÉ JANONES",
        deputy: {
          id: 204515,
          nome: "André Janones",
          nomeEleitoral: "ANDRÉ JANONES",
          siglaPartido: "REDE",
          siglaUf: "MG",
          urlFoto: null,
          email: null,
          situacao: "Exercício",
          redesSociais: "[]",
          party: null,
        },
        party: { id: 1, sigla: "AVANTE", nome: "Avante" },
      },
    ]);

    const res = await GET(
      new NextRequest(
        "http://localhost/api/deputados?legislaturaId=56&nome=Janones",
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].siglaPartido).toBe("AVANTE");
  });

  it("busca geral sem legislatura", async () => {
    prisma.deputy.count.mockResolvedValue(1);
    prisma.deputy.findMany.mockResolvedValue([
      {
        id: 1,
        nome: "A",
        nomeEleitoral: null,
        siglaPartido: "PL",
        siglaUf: "MG",
        legislaturaId: 57,
        urlFoto: null,
        email: null,
        situacao: null,
        redesSociais: null,
        party: null,
      },
    ]);

    const res = await GET(
      new NextRequest("http://localhost/api/deputados?siglaUf=MG&siglaPartido=PL"),
    );
    const body = await res.json();
    expect(body.items[0].id).toBe(1);
    expect(body.items[0].redesSociais).toEqual([]);
  });

  it("busca por nome e trata redesSociais inválidas", async () => {
    prisma.deputy.count.mockResolvedValue(1);
    prisma.deputy.findMany.mockResolvedValue([
      {
        id: 3,
        nome: "C",
        nomeEleitoral: "C",
        siglaPartido: "PT",
        siglaUf: "SP",
        legislaturaId: 57,
        urlFoto: null,
        email: null,
        situacao: null,
        redesSociais: "{bad",
        party: null,
      },
    ]);

    const res = await GET(
      new NextRequest("http://localhost/api/deputados?nome=C"),
    );
    const body = await res.json();
    expect(body.items[0].redesSociais).toEqual([]);
  });

  it("usa party do deputado quando mandato não tem party", async () => {
    prisma.deputyMandate.count.mockResolvedValue(1);
    prisma.deputyMandate.findMany.mockResolvedValue([
      {
        legislaturaId: 56,
        siglaPartido: null,
        siglaUf: null,
        situacao: null,
        nomeEleitoral: null,
        deputy: {
          id: 9,
          nome: "X",
          nomeEleitoral: null,
          siglaPartido: "PL",
          siglaUf: "MG",
          urlFoto: null,
          email: null,
          situacao: null,
          redesSociais: '{"a":1}',
          party: { id: 2, sigla: "PL", nome: "PL" },
        },
        party: null,
      },
    ]);

    const res = await GET(
      new NextRequest("http://localhost/api/deputados?legislaturaId=56"),
    );
    const body = await res.json();
    expect(body.items[0].party.sigla).toBe("PL");
    expect(body.items[0].redesSociais).toEqual([]);
  });
});

