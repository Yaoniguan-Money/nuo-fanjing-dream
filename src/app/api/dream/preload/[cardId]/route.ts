import { NextResponse } from "next/server";
import { getDreamActAssetUrls, getDreamCard, getDreamCardAssetUrls } from "@/domain/dream-card";
import { getCodexPreloadUrlsForCard } from "@/domain/codex/assets";

interface PreloadRouteContext {
  params: Promise<{ cardId: string }>;
}

export async function GET(_request: Request, { params }: PreloadRouteContext) {
  const { cardId } = await params;
  const card = getDreamCard(cardId);
  if (!card) return NextResponse.json({ error: "card_not_found" }, { status: 404 });
  return NextResponse.json({
    cardId,
    firstAct: getDreamActAssetUrls(card.data.acts[0]),
    story: getDreamCardAssetUrls(card),
    codex: getCodexPreloadUrlsForCard(cardId)
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600"
    }
  });
}
