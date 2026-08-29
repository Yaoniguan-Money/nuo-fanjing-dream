"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDreamCard, type DreamCard } from "@/domain/dream-card";
import { clearDreamSession, readDreamSession } from "@/domain/dream-session/storage";
import { clearGetFaceRitualSession, readGetFaceRitualSession, type GetFaceRitualSession } from "@/domain/get-face/session";
import { GetFaceResult } from "@/features/get-face/get-face-result";
import "./dream-result.css";

type ResultState = { status: "loading" } | { status: "missing" } | { status: "ready"; session: GetFaceRitualSession; card: DreamCard };

export function DreamResult() {
  const router = useRouter();
  const [state, setState] = useState<ResultState>({ status: "loading" });
  useEffect(() => {
    const dream = readDreamSession();
    const ritual = readGetFaceRitualSession();
    const card = dream ? getDreamCard(dream.match.cardId) : null;
    const timer = window.setTimeout(() => {
      if (!dream || !ritual || !card || ritual.phase !== "complete") setState({ status: "missing" });
      else setState({ status: "ready", session: ritual, card });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (state.status === "loading") return <main className="result-page"><p>傩面正在显影……</p></main>;
  if (state.status === "missing") return <main className="result-page"><div><h1>尚无完整幻梦</h1><p>请先走完一条故事，再回到坛前收录傩面。</p><Link href="/">返回山门</Link></div></main>;
  return <GetFaceResult session={state.session} card={state.card} onRestart={() => { clearDreamSession(); clearGetFaceRitualSession(); router.push("/"); }} />;
}
