"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  advancePlayback,
  initialPlaybackState,
  inspectDreamCard,
  resolveAssetId,
  retreatPlayback,
  type DreamAct,
  type DreamCard,
  type DreamCharacter,
  type DreamText
} from "@/domain/dream-card";
import { useTypewriter } from "./use-typewriter";
import { StoryMusicControl } from "./story-music-control";
import "./dream-player.css";

function characterHorizontalPosition(position: DreamCharacter["position"], characterCount: number): number {
  if (position === "center") return 50;
  if (characterCount >= 3) return position === "left" ? 25 : 75;
  return position === "left" ? 100 / 3 : 200 / 3;
}

function CharacterLayer({ characters, activeSpeaker }: { characters: DreamCharacter[]; activeSpeaker: string }) {
  const byPosition = useMemo(() => new Map(characters.map((character) => [character.position, character])), [characters]);
  return <div className="character-layer" aria-hidden="true">{(["left", "center", "right"] as const).map((position) => {
    const character = byPosition.get(position);
    const assetUrl = character ? resolveAssetId(character.assetId) : null;
    return <div className={`character-slot character-${position}${character?.instanceId === activeSpeaker ? " active" : ""}`} key={position} style={{ left: `${characterHorizontalPosition(position, characters.length)}%` }}>
      {character && assetUrl ? <Image className="character-image" src={assetUrl} alt="" width={1024} height={1536} priority={position === "center"} /> : null}
    </div>;
  })}</div>;
}

function ActHud({ act, actIndex, actCount, textIndex }: { act: DreamAct; actIndex: number; actCount: number; textIndex: number }) {
  return <div className="act-hud"><div><div className="act-kicker">第 {actIndex + 1} 幕 · {act.id}</div><div className="act-title">{act.title}</div></div><div className="progress-dots" aria-hidden="true">{Array.from({ length: actCount }, (_, index) => <span className={index === actIndex ? "active" : index < actIndex ? "done" : ""} key={index} />)}</div><div className="line-position">{Math.max(0, textIndex + 1)} / {act.texts.length}</div></div>;
}

function DialoguePanel({ text, content, actIndex }: { text: DreamText | null; content: string; actIndex: number }) {
  const kind = text?.extensions.sourceType ?? "narration";
  const classes = ["dialogue-panel", text?.extensions.self ? "self" : "", text?.extensions.mystic ? "mystic" : ""].filter(Boolean).join(" ");
  return <div className={classes} data-kind={kind}><div className="speaker-name">{kind === "dialogue" ? text?.extensions.speakerName ?? text?.speakerId : ""}</div><div className={text ? "dialogue-content" : "dialogue-content act-ready"}>{text ? content : `第 ${actIndex + 1} 幕`}</div>{text ? <div className="advance-hint">点击继续 ▽</div> : null}</div>;
}

export interface DreamPlayerProps {
  card: DreamCard;
  onComplete?: (card: DreamCard) => void;
  debugControls?: React.ReactNode;
}

export function DreamPlayer({ card, onComplete, debugControls }: DreamPlayerProps) {
  const [playback, setPlayback] = useState(initialPlaybackState);
  const act = card.data.acts[playback.actIndex];
  const currentText = playback.phase === "playing" && playback.textIndex >= 0 ? act.texts[playback.textIndex] ?? null : null;
  const typewriter = useTypewriter(currentText);
  const backgroundUrl = resolveAssetId(act.backgroundAssetId);
  const issues = useMemo(() => inspectDreamCard(card), [card]);

  const next = useCallback(() => {
    if (typewriter.isTyping) return typewriter.complete();
    setPlayback((current) => advancePlayback(card, current));
  }, [card, typewriter]);
  const previous = useCallback(() => setPlayback((current) => retreatPlayback(card, current)), [card]);

  useEffect(() => {
    if (!currentText || typewriter.isTyping || currentText.display.advance !== "auto") return;
    const timer = window.setTimeout(next, Math.min(5200, Math.max(1500, 1300 + currentText.content.length * 45)));
    return () => window.clearTimeout(timer);
  }, [currentText, next, typewriter.isTyping]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ([" ", "Enter", "ArrowRight"].includes(event.key)) { event.preventDefault(); next(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous]);

  return <main className={`dream-player-page${debugControls ? " with-debug" : ""}`}>
    {debugControls}
    <section className="player-shell" data-card-id={card.meta.id}>
      <Link className="dream-home-link ui-return-control" href="/" aria-label="返回首页">← 返回首页</Link>
      {playback.phase === "playing" ? <StoryMusicControl /> : null}
      <div className="background-placeholder" />
      {backgroundUrl ? <Image className="background-image" src={backgroundUrl} alt="" fill sizes="100vw" priority /> : null}
      <div className="stage-shade" /><div className="stage-fog" />
      {playback.phase !== "playing" ? <span className="dream-player-brand-mark"><Image className="dream-player-brand-mark-image" src="/dream-assets/brand/nuo-dream-logo-dark.png" alt="大傩幻梦品牌标识" fill sizes="(max-width: 700px) 110px, 168px" /></span> : null}
      {playback.phase === "playing" ? <CharacterLayer characters={act.characters} activeSpeaker={currentText?.speakerId ?? ""} /> : null}
      {playback.phase === "title" ? <section className="title-view"><div className="title-eyebrow">幻梦卡 · DREAM CARD</div><h1>{card.meta.title}</h1><div className="title-divider" /><p>{card.meta.synopsis}</p><div className="tag-list">{card.meta.match.tags.slice(0, 7).map((tag) => <span key={tag}>{tag}</span>)}</div><button className="ritual-button ui-primary-cta" type="button" onClick={next}>进 入 幻 梦</button></section> : null}
      {playback.phase === "playing" ? <section className="play-view" onClick={next}><ActHud act={act} actIndex={playback.actIndex} actCount={card.data.acts.length} textIndex={playback.textIndex} /><DialoguePanel text={currentText} content={typewriter.content} actIndex={playback.actIndex} /></section> : null}
      {playback.phase === "finished" ? <section className="end-view"><div className="title-eyebrow">幻 梦 已 尽</div><h2>{card.meta.title}</h2><div className="title-divider" /><p>七幕已定。故事中的那一面，正在回到坛前。</p><button className="ritual-button ui-primary-cta" type="button" onClick={() => onComplete?.(card)}>出 戏 · 见 面</button><button className="text-button ui-utility-control" type="button" onClick={() => setPlayback(initialPlaybackState)}>重新观看</button></section> : null}
      {issues.some((issue) => issue.severity === "error") ? <div className="player-error">卡片存在阻塞性错误，请前往开发卡池检查。</div> : null}
    </section>
  </main>;
}
