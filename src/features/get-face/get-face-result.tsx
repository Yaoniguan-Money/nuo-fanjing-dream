"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Interpretation } from "@/domain/interpretation";
import { createCodexCollection, type CodexCollection, type CodexEntryInput, type StorageLike } from "@/domain/codex";
import { buildVariant, getFaceData, resolveRole, type FaceRoleResolution, type FaceVariant } from "@/domain/get-face";
import type { GetFaceRitualSession } from "@/domain/get-face/session";
import { CodexExperience } from "@/features/codex/codex-experience";
import "./get-face-result.css";

export type FaceOmenStatus = "idle" | "pending" | "ready" | "error";

export interface FaceOmen {
  status: FaceOmenStatus;
  qian: string;
  jie: string;
  error?: string;
  /** Kept in memory for diagnostics only; never sent to the codex boundary. */
  meta?: unknown;
}

export interface GetFaceResultModel {
  role: FaceRoleResolution["role"];
  mask: FaceRoleResolution["mask"];
  variant: FaceVariant;
  choices: [number, number, number];
  sources: typeof getFaceData.sources;
  visualText: string;
  reasonText: string;
}

export interface GetFaceResultProps {
  session: GetFaceRitualSession;
  interpretation: Interpretation;
  collection?: CodexCollection;
  storage?: StorageLike;
  onRestart: () => void;
}

const pendingOmen: FaceOmen = {
  status: "pending",
  qian: "神意正在成形",
  jie: "傩引正在结签，请稍候。"
};

function choicesOf(session: GetFaceRitualSession): [number, number, number] {
  const choices = session.choices.slice(0, 3).map((choice) => choice === 1 ? 1 : 0);
  return [choices[0] ?? 0, choices[1] ?? 0, choices[2] ?? 0];
}

export function resolveGetFaceResult(session: GetFaceRitualSession): GetFaceResultModel {
  const choices = choicesOf(session);
  const resolved = resolveRole(getFaceData, {
    name: session.name,
    wish: session.wish,
    choices,
    maskIndex: session.selectedMaskIndex ?? undefined
  });
  const variant = buildVariant(getFaceData, { name: session.name, wish: session.wish, choices }, resolved.role);
  const sources = resolved.role.sources
    .map((id) => getFaceData.sources.find((source) => source.id === id))
    .filter((source): source is (typeof getFaceData.sources)[number] => Boolean(source));
  return {
    role: resolved.role,
    mask: resolved.mask,
    variant,
    choices,
    sources,
    visualText: `视觉母体：${resolved.mask.name}。固定标志为${resolved.role.signs.join("、")}；本回变体采用${variant.tint}色调与${variant.mark}，以象征剪影入坛。`,
    reasonText: `本回愿望主题与三幕选择共同指向此面。${resolved.role.reason}`
  };
}

export function makeGetFaceCodexEntry(result: GetFaceResultModel, omen: FaceOmen): CodexEntryInput {
  return {
    mask: result.mask,
    role: result.role,
    variant: result.variant,
    visualText: result.visualText,
    reasonText: result.reasonText,
    sources: result.sources,
    // Deliberately select only qian/jie/status. API metadata, wish and portrait
    // are transient and must not cross into localStorage.
    omen: { status: omen.status, qian: omen.qian, jie: omen.jie }
  };
}

export function persistGetFaceResult(result: GetFaceResultModel, omen: FaceOmen, collection: CodexCollection): boolean {
  return collection.upsert(getFaceData.codex.storageKey, makeGetFaceCodexEntry(result, omen)).ok;
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

async function requestOmen(result: GetFaceResultModel, session: GetFaceRitualSession): Promise<FaceOmen> {
  const response = await fetch("/api/v1/omen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wish: session.wish,
      choices: result.choices,
      role: { id: result.role.id, name: result.role.name, duty: result.role.duty, reason: result.role.reason, kind: result.role.kind },
      evidence: { mask_id: result.mask.id, signs: result.role.signs, prompt_version: getFaceData.promptVersion }
    })
  });
  let body: unknown = {};
  try {
    body = await response.json();
  } catch {
    // The status below still gives the visitor an explicit local fallback.
  }
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : "傩引暂时无法回应。";
    throw new Error(message);
  }
  if (!body || typeof body !== "object" || typeof (body as { qian?: unknown }).qian !== "string" || typeof (body as { jie?: unknown }).jie !== "string") {
    throw new Error("傩引返回的签解无法读取。");
  }
  const payload = body as { qian: string; jie: string; meta?: unknown };
  return { status: "ready", qian: payload.qian, jie: payload.jie, meta: payload.meta };
}

function omenStatusText(omen: FaceOmen): string {
  if (omen.status === "pending") return "傩引正在结签，先看见属于你的这一面。";
  if (omen.status === "error") return `傩签未成，已降级为本地确定性解读：${omen.error || "本地傩引不可用。"}`;
  if (omen.status === "idle") return "本地确定性解读已保留；网络可用时可以重新求签。";
  return "傩签已成形。";
}

export function GetFaceResult({ session, interpretation, collection: controlledCollection, storage, onRestart }: GetFaceResultProps) {
  const result = useMemo(() => resolveGetFaceResult(session), [session]);
  const [omen, setOmen] = useState<FaceOmen>(pendingOmen);
  const [revealed, setRevealed] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const requestStarted = useRef(false);
  const browser = browserStorage();
  const collection = useMemo(() => controlledCollection ?? ((storage ?? browser) ? createCodexCollection(storage ?? browser!) : null), [browser, controlledCollection, storage]);

  const retryOmen = useCallback(() => {
    if (omen.status === "pending") return;
    setOmen(pendingOmen);
    void requestOmen(result, session).then(setOmen).catch((error: unknown) => {
      setOmen({ status: "error", qian: "神意未成", jie: "这一次傩引未能结出文字。你可以保留已得之面，或在网络与本地服务可用后重新求签。", error: error instanceof Error ? error.message : "请求失败" });
    });
  }, [omen.status, result, session]);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 40);
    if (!requestStarted.current) {
      requestStarted.current = true;
      void requestOmen(result, session).then(setOmen).catch((error: unknown) => {
        setOmen({ status: "error", qian: "神意未成", jie: "这一次傩引未能结出文字。你可以保留已得之面，或在网络与本地服务可用后重新求签。", error: error instanceof Error ? error.message : "请求失败" });
      });
    }
    return () => window.clearTimeout(timer);
  }, [result, session]);

  const enterCodex = useCallback(() => {
    if (collection) persistGetFaceResult(result, omen, collection);
    setShowCodex(true);
    // Navigation into the existing codex is not blocked by a best-effort
    // localStorage write; the collection boundary itself reports failures.
  }, [collection, omen, result]);

  if (showCodex) {
    return <CodexExperience data={getFaceData} collection={collection ?? undefined} storage={storage} onRestart={onRestart} />;
  }

  const sourceKind = result.role.kind === "traditional_reference" ? "传统职司借鉴" : "项目新创";
  return <main className="face-result-page" data-revealed={revealed ? "true" : "false"}>
    <section className="face-result-cinematic" aria-labelledby="face-result-title">
      <div className="face-result-haze" aria-hidden="true" />
      <div className="face-result-mask-wrap"><Image src={result.mask.asset} alt={result.mask.name} width={1086} height={1448} priority /></div>
      <span className="face-result-kicker">得 · 面 · 已 · 成</span>
      <h1 id="face-result-title">傩 · {result.role.name}</h1>
      <p className="face-result-duty">职司 · {result.role.duty}</p>
      <p className="face-result-omen-status" role="status">{omenStatusText(omen)}</p>
      <blockquote className="face-result-qian">{omen.qian}</blockquote>
      <button type="button" className="face-result-confirm" onClick={enterCodex} disabled={!revealed || !collection}>确认此面，入傩谱</button>
      {!collection ? <p className="face-result-storage-error">本机收录不可用，但本次得面与确定性解读仍可查看。</p> : null}
    </section>

    <section className="face-result-scroll" aria-label="得面结果详情">
      <div className="face-result-section"><span>傩 · 面</span><p>{result.visualText}</p><p>变体 · {result.variant.tint} · {result.variant.mark} · 种子 {result.variant.seed}</p></div>
      <div className="face-result-section"><span>职司 · 类 · 型</span><p>{sourceKind}。{result.role.duty}</p></div>
      <div className="face-result-section"><span>授 · 面 · 理 · 由</span><p>{result.reasonText}</p></div>
      <div className="face-result-section"><span>角 · 色 · 背 · 景</span><p>{result.role.background}</p></div>
      <div className="face-result-section face-result-omen"><span>傩 · 解</span><p>{omen.jie}</p><button type="button" onClick={retryOmen} disabled={omen.status === "pending"}>{omen.status === "pending" ? "傩引正在结签" : "重新求签"}</button></div>
      <div className="face-result-section"><span>幻 · 梦 · 确 · 定 · 性 · 解 · 读</span><h2>{interpretation.title}</h2><blockquote>{interpretation.sign}</blockquote><p>{interpretation.reflection}</p><ol>{interpretation.actions.map((action) => <li key={action}>{action}</li>)}</ol><small>{interpretation.boundary}</small></div>
      <div className="face-result-section"><span>溯 · 源</span><p className="face-result-source-kind">{sourceKind} · {getFaceData.localAssetNotice}</p>{result.sources.length ? result.sources.map((source) => <a className="face-result-source" key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><small>{source.institution} · {source.accessedAt}</small><em>{source.meaning}</em><i>{source.imageRights}</i></a>) : <p>本回没有额外溯源条目。</p>}</div>
      <p className="face-result-asset-notice">本地资产声明：{getFaceData.localAssetNotice}</p>
    </section>
  </main>;
}
