"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { DreamCard } from "@/domain/dream-card";
import { DreamPlayer } from "./dream-player";
import { completeStoryRuntime, ensureStoryRuntime } from "./story-runtime";

export function DreamExperience({ card }: { card: DreamCard }) {
  const router = useRouter();
  useEffect(() => { ensureStoryRuntime(card.meta.id); }, [card.meta.id]);
  return <DreamPlayer card={card} onComplete={() => { completeStoryRuntime(card.meta.id); router.push("/result"); }} />;
}
