import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/server", () => ({
  listLegislatures: vi.fn(async () => [
    {
      id: 57,
      dataInicio: "2023-02-01",
      dataFim: "2027-01-31",
      label: "57ª (2023–2027)",
    },
  ]),
}));

import { GET } from "./route";

describe("GET /api/legislaturas", () => {
  it("lista legislaturas", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      items: [
        {
          id: 57,
          dataInicio: "2023-02-01",
          dataFim: "2027-01-31",
          label: "57ª (2023–2027)",
        },
      ],
    });
  });
});
