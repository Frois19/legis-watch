import { enrichPropositions } from "@/lib/propositions/enrich";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  ids: z.array(z.number().int().positive()).max(40),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ids inválidos (máx. 40 números positivos)" },
        { status: 400 },
      );
    }

    const items = await enrichPropositions(parsed.data.ids);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "erro ao enriquecer proposições";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
