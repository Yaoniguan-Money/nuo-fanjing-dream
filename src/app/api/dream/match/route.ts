import { NextResponse } from "next/server";
import { listDreamCards, getDreamCard } from "@/domain/dream-card";
import { matchRequestSchema, matchResponseSchema } from "@/domain/dream-session";
import { dreamAiProvider } from "@/server/ai";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = matchRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  const response = matchResponseSchema.parse(await dreamAiProvider.match(parsed.data, listDreamCards()));
  if (!getDreamCard(response.cardId)) return NextResponse.json({ error: "provider_returned_unknown_card" }, { status: 502 });
  return NextResponse.json(response);
}
