"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { interpretResponseSchema, type Interpretation } from "@/domain/interpretation";
import { readDreamSession, saveInterpretation } from "@/domain/dream-session/storage";
import "./dream-result.css";

type ResultState = { status: "loading" } | { status: "missing" } | { status: "error" } | { status: "ready"; wish: string; interpretation: Interpretation };

export function DreamResult() {
  const [state, setState] = useState<ResultState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    const session = readDreamSession();
    if (!session) {
      const timer = window.setTimeout(() => { if (active) setState({ status: "missing" }); }, 0);
      return () => { active = false; window.clearTimeout(timer); };
    }
    if (session.interpretation) {
      const timer = window.setTimeout(() => { if (active) setState({ status: "ready", wish: session.wish, interpretation: session.interpretation! }); }, 0);
      return () => { active = false; window.clearTimeout(timer); };
    }
    fetch("/api/dream/interpret", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cardId: session.match.cardId, wish: session.wish }) })
      .then(async (response) => { if (!response.ok) throw new Error(`interpret:${response.status}`); return interpretResponseSchema.parse(await response.json()); })
      .then((response) => { saveInterpretation(response.interpretation); if (active) setState({ status: "ready", wish: session.wish, interpretation: response.interpretation }); })
      .catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, []);

  if (state.status === "loading") return <main className="result-page"><p>正在解签……</p></main>;
  if (state.status === "missing") return <main className="result-page"><div><h1>尚无幻梦</h1><p>请先从山门进入，写下愿望并走完幻梦。</p><Link href="/">返回山门</Link></div></main>;
  if (state.status === "error") return <main className="result-page"><div><h1>山雾未散</h1><p>签解暂时无法显现，但你的幻梦仍保存在本次浏览会话中。</p><Link href="/result">再次解签</Link></div></main>;
  return <main className="result-page"><article className="result-card"><span>愿望 · {state.wish}</span><h1>{state.interpretation.title}</h1><blockquote>{state.interpretation.sign}</blockquote><p>{state.interpretation.reflection}</p><h2>带回现实的三步</h2><ol>{state.interpretation.actions.map((action) => <li key={action}>{action}</li>)}</ol><small>{state.interpretation.boundary}</small><Link href="/">重新入梦</Link></article></main>;
}
