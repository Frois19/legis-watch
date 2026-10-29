import { listLegislatures } from "@/lib/api/server";
import { NextResponse } from "next/server";

export async function GET() {
  const items = await listLegislatures();
  return NextResponse.json({ items });
}
