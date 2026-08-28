import { NextResponse } from "next/server";
import { getDreamCard } from "@/domain/dream-card";
import { interpretRequestSchema, interpretResponseSchema } from "@/domain/interpretation";
import { dreamAiProvider } from "@/server/ai";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = interpretRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  const card = getDreamCard(parsed.data.cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  const response = interpretResponseSchema.parse(await dreamAiProvider.interpret(parsed.data, card));
  return NextResponse.json(response);
}
