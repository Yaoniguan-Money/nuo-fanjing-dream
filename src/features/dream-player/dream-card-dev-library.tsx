"use client";

import { useState } from "react";
import type { DreamCard } from "@/domain/dream-card";
import { DreamPlayer } from "./dream-player";

export function DreamCardDevLibrary({ cards }: { cards: DreamCard[] }) {
  const [cardId, setCardId] = useState(cards[0]?.meta.id ?? "");
  const card = cards.find((candidate) => candidate.meta.id === cardId);
  if (!card) return <main className="route-shell"><p>卡池为空。</p></main>;
  const controls = <header className="debug-bar"><strong>Dream Card Dev</strong><select aria-label="选择幻梦卡" value={cardId} onChange={(event) => setCardId(event.target.value)}>{cards.map((candidate) => <option key={candidate.meta.id} value={candidate.meta.id}>{candidate.meta.title} · {candidate.data.acts.length} Acts</option>)}</select><span>Data 固定 · 仅开发环境</span></header>;
  return <DreamPlayer key={card.meta.id} card={card} debugControls={controls} onComplete={() => undefined} />;
}
