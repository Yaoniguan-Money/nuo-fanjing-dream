"use client";

import { useRouter } from "next/navigation";
import type { DreamCard } from "@/domain/dream-card";
import { DreamPlayer } from "./dream-player";
import { completeDreamSession } from "@/domain/dream-session/storage";

export function DreamExperience({ card }: { card: DreamCard }) {
  const router = useRouter();
  return <DreamPlayer card={card} onComplete={() => { completeDreamSession(card.meta.id); router.push("/result"); }} />;
}
