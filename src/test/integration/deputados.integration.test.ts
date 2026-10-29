import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listDeputies } from "@/app/api/deputados/route";
import { GET as getDeputy } from "@/app/api/deputados/[id]/route";
import { GET as getPropositions } from "@/app/api/deputados/[id]/proposicoes/route";
import { GET as getVotes } from "@/app/api/deputados/[id]/votos/route";
import { GET as getPresencas } from "@/app/api/deputados/[id]/presencas/route";
import { resetDatabase, seedCoreFixtures } from "./db";

describe("integration deputados API", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedCoreFixtures();
  });

  it("busca por mandato 56 encontra Janones como AVANTE e não Nikolas", async () => {
    const janones = await listDeputies(
      new NextRequest(
        "http://localhost/api/deputados?legislaturaId=56&nome=Janones",
      ),
    );
    const janonesBody = await janones.json();
    expect(janonesBody.total).toBe(1);
    expect(janonesBody.items[0]).toMatchObject({
      id: 204515,
      siglaPartido: "AVANTE",
      legislaturaId: 56,
    });

    const nikolas = await listDeputies(
      new NextRequest(
        "http://localhost/api/deputados?legislaturaId=56&nome=Nikolas",
      ),
    );
    const nikolasBody = await nikolas.json();
    expect(nikolasBody.total).toBe(0);
  });

  it("perfil aplica mandato selecionado e lista mandatos", async () => {
    const res56 = await getDeputy(
      new NextRequest(
        "http://localhost/api/deputados/204515?legislaturaId=56",
      ),
      { params: Promise.resolve({ id: "204515" }) },
    );
    const body56 = await res56.json();
    expect(body56.siglaPartido).toBe("AVANTE");
    expect(body56.selectedLegislaturaId).toBe(56);
    expect(body56.mandates.map((m: { legislaturaId: number }) => m.legislaturaId)).toEqual(
      [57, 56],
    );

    const res57 = await getDeputy(
      new NextRequest(
        "http://localhost/api/deputados/204515?legislaturaId=57",
      ),
      { params: Promise.resolve({ id: "204515" }) },
    );
    const body57 = await res57.json();
    expect(body57.siglaPartido).toBe("REDE");
  });

  it("proposições e stats filtrados por legislatura", async () => {
    const res56 = await getPropositions(
      new NextRequest(
        "http://localhost/api/deputados/204515/proposicoes?legislaturaId=56",
      ),
      { params: Promise.resolve({ id: "204515" }) },
    );
    const body56 = await res56.json();
    expect(body56.stats).toEqual({ apresentados: 2, aprovados: 1 });
    expect(body56.items.every((p: { ano: number }) => p.ano <= 2023)).toBe(
      true,
    );

    const res57 = await getPropositions(
      new NextRequest(
        "http://localhost/api/deputados/204515/proposicoes?legislaturaId=57",
      ),
      { params: Promise.resolve({ id: "204515" }) },
    );
    const body57 = await res57.json();
    expect(body57.stats).toEqual({ apresentados: 1, aprovados: 0 });
  });

  it("votos filtrados por legislatura", async () => {
    const res56 = await getVotes(
      new NextRequest(
        "http://localhost/api/deputados/204515/votos?legislaturaId=56",
      ),
      { params: Promise.resolve({ id: "204515" }) },
    );
    const body56 = await res56.json();
    expect(body56.total).toBe(1);
    expect(body56.items[0].tipoVoto).toBe("Sim");
    expect(body56.items[0].year).toBe(2022);

    const res57 = await getVotes(
      new NextRequest(
        "http://localhost/api/deputados/204515/votos?legislaturaId=57",
      ),
      { params: Promise.resolve({ id: "204515" }) },
    );
    const body57 = await res57.json();
    expect(body57.total).toBe(1);
    expect(body57.items[0].tipoVoto).toBe("Não");
  });

  it("presença resume presentes/faltas do mandato", async () => {
    const res = await getPresencas(
      new NextRequest(
        "http://localhost/api/deputados/204515/presencas?legislaturaId=56",
      ),
      { params: Promise.resolve({ id: "204515" }) },
    );
    const body = await res.json();
    expect(body.summary.eventosConsiderados).toBe(2);
    expect(body.summary.presentes).toBe(1);
    expect(body.summary.faltas).toBe(1);
    expect(body.years).toContain(2022);
  });

  it("retorna 404 para deputado inexistente", async () => {
    const res = await getDeputy(
      new NextRequest("http://localhost/api/deputados/1"),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(404);
  });
});
