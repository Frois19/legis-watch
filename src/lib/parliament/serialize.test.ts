import { describe, expect, it } from "vitest";
import { serializeStateDeputyDetail } from "./serialize";

describe("serializeStateDeputyDetail contrato", () => {
  it("expõe campos públicos estáveis do perfil estadual", () => {
    const detail = serializeStateDeputyDetail({
      id: "alep:7000394",
      source: "alep",
      externalId: "7000394",
      uf: "PR",
      nome: "ADEMAR LUIZ TRAIANO",
      nomeEleitoral: "ADEMAR LUIZ TRAIANO",
      siglaPartido: null,
      email: null,
      urlFoto: null,
      situacao: "Exercício",
      rawJson: null,
      profileSyncedAt: new Date("2026-10-30T12:00:00.000Z"),
      syncedAt: new Date("2026-10-30T11:00:00.000Z"),
      createdAt: new Date("2026-10-30T11:00:00.000Z"),
      updatedAt: new Date("2026-10-30T12:00:00.000Z"),
      affiliations: [],
      mandates: [],
      propositions: [
        {
          id: "alep:prop:1",
          source: "alep",
          externalId: "1",
          stateDeputyId: "alep:7000394",
          siglaTipo: "REQ",
          numero: 10,
          ano: 2026,
          ementa: "Teste",
          dataApresentacao: "2026-01-01",
          statusResumo: "TRAMITANDO",
          urlPublica: null,
          syncedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      attendances: [
        {
          id: 1,
          stateDeputyId: "alep:7000394",
          dataSessao: "2025-12-10",
          year: 2025,
          status: "presente",
          observacao: null,
          syncedAt: null,
        },
      ],
    });

    expect(detail).toMatchObject({
      sphere: "estadual_deputado",
      source: "alep",
      dataMode: "live",
      isDemoData: false,
      coverage: { attendance: true, propositions: true },
      attendanceSummary: {
        eventosConsiderados: 1,
        presentes: 1,
        justificados: 0,
        ausentes: 0,
      },
      href: "/parlamentares/alep/7000394",
    });
    expect(Object.keys(detail).sort()).toEqual(
      [
        "affiliations",
        "assemblyName",
        "attendance",
        "attendanceSummary",
        "coverage",
        "dataMode",
        "email",
        "externalId",
        "href",
        "id",
        "isDemoData",
        "key",
        "mandates",
        "nome",
        "nomeEleitoral",
        "profileSyncedAt",
        "propositions",
        "siglaPartido",
        "siglaUf",
        "situacao",
        "source",
        "sphere",
        "syncedAt",
        "urlFoto",
      ].sort(),
    );
  });

  it("marca fixture como dados de demonstração", () => {
    const detail = serializeStateDeputyDetail({
      id: "alerj:fulano",
      source: "alerj",
      externalId: "fulano",
      uf: "RJ",
      nome: "Fulano",
      nomeEleitoral: "Fulano",
      siglaPartido: "PT",
      email: null,
      urlFoto: null,
      situacao: "Exercício",
      rawJson: JSON.stringify({ fixture: true }),
      profileSyncedAt: null,
      syncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      affiliations: [],
      mandates: [],
      propositions: [],
      attendances: [],
    });
    expect(detail.dataMode).toBe("fixture");
    expect(detail.isDemoData).toBe(true);
  });
});
