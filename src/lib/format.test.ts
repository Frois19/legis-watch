import { describe, expect, it } from "vitest";
import {
  camaraPropositionUrl,
  formatDate,
  formatDateTime,
  propositionLabel,
  socialLabel,
  voteApprovalLabel,
} from "./format";

describe("formatDateTime", () => {
  it("trata valor vazio e inválido", () => {
    expect(formatDateTime(null)).toBe("Data indisponível");
    expect(formatDateTime("não-é-data")).toBe("não-é-data");
  });

  it("formata data válida em pt-BR", () => {
    const formatted = formatDateTime("2026-10-18T12:00:00.000Z");
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe("formatDate", () => {
  it("trata valor vazio e inválido", () => {
    expect(formatDate(undefined)).toBe("Data indisponível");
    expect(formatDate("xyz")).toBe("xyz");
  });

  it("formata data válida", () => {
    const formatted = formatDate("2026-02-03");
    expect(formatted.toLowerCase()).toMatch(/2026|fev|feb|3/);
  });
});

describe("propositionLabel", () => {
  it("junta tipo, número e ano ignorando vazios", () => {
    expect(
      propositionLabel({ siglaTipo: "PL", numero: 123, ano: 2024 }),
    ).toBe("PL 123 2024");
    expect(propositionLabel({ siglaTipo: "PEC", numero: null, ano: 2023 })).toBe(
      "PEC 2023",
    );
    expect(propositionLabel({})).toBe("");
  });
});

describe("camaraPropositionUrl", () => {
  it("monta a ficha de tramitação", () => {
    expect(camaraPropositionUrl(123)).toBe(
      "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=123",
    );
  });
});

describe("voteApprovalLabel", () => {
  it("traduz aprovado, rejeitado e desconhecido", () => {
    expect(voteApprovalLabel(true)).toBe("Aprovado");
    expect(voteApprovalLabel(false)).toBe("Rejeitado");
    expect(voteApprovalLabel(null)).toBe("Resultado não informado");
    expect(voteApprovalLabel(undefined)).toBe("Resultado não informado");
  });
});

describe("socialLabel", () => {
  it("reconhece redes conhecidas", () => {
    expect(socialLabel("https://twitter.com/x")).toBe("X (Twitter)");
    expect(socialLabel("https://www.x.com/y")).toBe("X (Twitter)");
    expect(socialLabel("https://facebook.com/z")).toBe("Facebook");
    expect(socialLabel("https://instagram.com/z")).toBe("Instagram");
    expect(socialLabel("https://youtube.com/z")).toBe("YouTube");
  });

  it("usa hostname genérico ou fallback", () => {
    expect(socialLabel("https://www.exemplo.gov.br/perfil")).toBe(
      "exemplo.gov.br",
    );
    expect(socialLabel("not-a-url")).toBe("Rede social");
  });

  it("distingue redes diferentes", () => {
    expect(socialLabel("https://twitter.com/a")).not.toBe(
      socialLabel("https://facebook.com/a"),
    );
    expect(socialLabel("https://instagram.com/a")).not.toBe(
      socialLabel("https://youtube.com/a"),
    );
  });
});

