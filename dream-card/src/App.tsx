import { useCallback, useEffect, useMemo, useState } from "react";
import { cardOptions, resolveAssetUrl } from "./library";
import type { DreamAct, DreamCard, DreamCharacter, DreamText, PlayerIssue } from "./types";
import { useTypewriter } from "./useTypewriter";
import { inspectCard } from "./validation";

type Phase = "title" | "playing" | "finished";

interface PlaybackState {
  phase: Phase;
  actIndex: number;
  textIndex: number;
}

const initialPlayback: PlaybackState = { phase: "title", actIndex: 0, textIndex: -1 };

function characterHorizontalPosition(position: DreamCharacter["position"], characterCount: number): number {
  if (position === "center") return 50;
  if (characterCount >= 3) return position === "left" ? 25 : 75;
  return position === "left" ? 100 / 3 : 200 / 3;
}

function TitleView({ card, onStart }: { card: DreamCard; onStart: () => void }) {
  return (
    <section className="title-view">
      <div className="title-eyebrow">大 傩 幻 梦 · DREAM CARD</div>
      <h1>{card.meta.title}</h1>
      <div className="title-divider" />
      <p>{card.meta.synopsis}</p>
      <div className="tag-list">
        {card.meta.match.tags.slice(0, 7).map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      <button className="ritual-button" type="button" onClick={onStart}>进 入 幻 梦</button>
    </section>
  );
}

function EndView({ card, onRestart }: { card: DreamCard; onRestart: () => void }) {
  return (
    <section className="end-view">
      <div className="title-eyebrow">幻 梦 已 尽</div>
      <h2>{card.meta.title}</h2>
      <div className="title-divider" />
      <p>这场幻梦已经完整播放。你可以重新观看，或从上方选择另一张幻梦卡。</p>
      <button className="ritual-button" type="button" onClick={onRestart}>重 新 观 看</button>
    </section>
  );
}

function CharacterLayer({ characters, activeSpeaker }: { characters: DreamCharacter[]; activeSpeaker: string }) {
  const charactersByPosition = useMemo(
    () => new Map(characters.map((character) => [character.position, character])),
    [characters]
  );

  return (
    <div className="character-layer" aria-hidden="true">
      {(["left", "center", "right"] as const).map((position) => {
        const character = charactersByPosition.get(position);
        const assetUrl = character ? resolveAssetUrl(character.assetId) : null;
        return (
          <div
            className={`character-slot character-${position}${character?.instanceId === activeSpeaker ? " active" : ""}`}
            key={position}
            style={{ left: `${characterHorizontalPosition(position, characters.length)}%` }}
          >
            {character && assetUrl ? (
              <img className="character-image" src={assetUrl} alt="" />
            ) : character ? (
              <div className="character-placeholder"><span>{character.assetId}</span></div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ActHud({ act, actIndex, actCount, textIndex }: {
  act: DreamAct;
  actIndex: number;
  actCount: number;
  textIndex: number;
}) {
  return (
    <div className="act-hud">
      <div>
        <div className="act-kicker">第 {actIndex + 1} 幕 · {act.id}</div>
        <div className="act-title">{act.title}</div>
      </div>
      <div className="progress-dots" aria-hidden="true">
        {Array.from({ length: actCount }, (_, index) => (
          <span className={index === actIndex ? "active" : index < actIndex ? "done" : ""} key={index} />
        ))}
      </div>
      <div className="line-position">{Math.max(0, textIndex + 1)} / {act.texts.length}</div>
    </div>
  );
}

function DialoguePanel({ text, content }: { text: DreamText | null; content: string }) {
  const kind = text?.extensions?.sourceType ?? "narration";
  const classes = [
    "dialogue-panel",
    text?.extensions?.self ? "self" : "",
    text?.extensions?.mystic ? "mystic" : ""
  ].filter(Boolean).join(" ");
  return (
    <div className={classes} data-kind={kind}>
      <div className="speaker-name">
        {kind === "dialogue" ? text?.extensions?.speakerName ?? text?.speakerId : ""}
      </div>
      <div className={text ? "dialogue-content" : "dialogue-content act-ready"}>
        {text ? content : "点击继续，开始本幕。"}
      </div>
      <div className="advance-hint">点击继续 ▽</div>
    </div>
  );
}

function PlayView({ act, actIndex, actCount, textIndex, text, typedContent, onAdvance }: {
  act: DreamAct;
  actIndex: number;
  actCount: number;
  textIndex: number;
  text: DreamText | null;
  typedContent: string;
  onAdvance: () => void;
}) {
  return (
    <section className="play-view" onClick={onAdvance}>
      <ActHud act={act} actIndex={actIndex} actCount={actCount} textIndex={textIndex} />
      <DialoguePanel text={text} content={typedContent} />
    </section>
  );
}

function DebugToolbar({ card, cardId, playback, isTyping, issueCount, onCardChange, onActChange, onPrevious, onNext, onRestart, onIssues }: {
  card: DreamCard;
  cardId: string;
  playback: PlaybackState;
  isTyping: boolean;
  issueCount: number;
  onCardChange: (cardId: string) => void;
  onActChange: (actIndex: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
  onIssues: () => void;
}) {
  return (
    <header className="debug-bar">
      <div className="debug-brand">Dream Card Player</div>
      <select aria-label="选择幻梦" value={cardId} onChange={(event) => onCardChange(event.target.value)}>
        {cardOptions.map((option) => <option value={option.card.meta.id} key={option.card.meta.id}>{option.card.meta.title}</option>)}
      </select>
      <select
        aria-label="跳转到指定 Act"
        value={playback.actIndex}
        onChange={(event) => onActChange(Number(event.target.value))}
      >
        {card.data.acts.map((act, index) => <option value={index} key={act.id}>{index + 1}. {act.title}</option>)}
      </select>
      <button type="button" onClick={onPrevious} disabled={playback.phase !== "playing" || (playback.actIndex === 0 && playback.textIndex < 0)}>← 上一步</button>
      <button type="button" onClick={onNext} disabled={playback.phase === "finished"}>下一步 →</button>
      <button type="button" onClick={onRestart}>重播</button>
      <div className="debug-spacer" />
      <span className="debug-status">{isTyping ? "PLAYING:TYPING" : playback.phase.toUpperCase()} · A{playback.actIndex + 1}:{playback.textIndex + 1}</span>
      <button className="issue-button" type="button" onClick={onIssues}>诊断 {issueCount}</button>
    </header>
  );
}

function IssueDrawer({ issues, onClose }: { issues: PlayerIssue[]; onClose: () => void }) {
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  return (
    <aside className="issue-drawer">
      <div className="issue-heading"><h2>卡片诊断</h2><button type="button" onClick={onClose}>关闭</button></div>
      <p>{errorCount} 个错误，{issues.length - errorCount} 个警告。</p>
      <ul>
        {issues.length === 0 ? <li>未发现问题。</li> : issues.map((issue) => (
          <li className={issue.severity} key={`${issue.code}-${issue.path}`}>
            <code>{issue.severity.toUpperCase()} · {issue.code} · {issue.path}</code>
            <span>{issue.message}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function PlayerApp({ initialCardId }: { initialCardId: string }) {
  const [cardId, setCardId] = useState(initialCardId);
  const [playback, setPlayback] = useState<PlaybackState>(initialPlayback);
  const [showIssues, setShowIssues] = useState(false);
  const card = (cardOptions.find((option) => option.card.meta.id === cardId)?.card ?? cardOptions[0].card)!;

  const act = card.data.acts[playback.actIndex];
  const currentText = playback.phase === "playing" && playback.textIndex >= 0
    ? act.texts[playback.textIndex] ?? null
    : null;
  const typewriter = useTypewriter(currentText);
  const issues = useMemo(() => inspectCard(card), [card]);
  const backgroundUrl = resolveAssetUrl(act.backgroundAssetId);

  const selectCard = useCallback((nextCardId: string) => {
    setCardId(nextCardId);
    setPlayback(initialPlayback);
    setShowIssues(false);
  }, []);

  const start = useCallback(() => setPlayback((current) => ({ ...current, phase: "playing" })), []);
  const restart = useCallback(() => setPlayback(initialPlayback), []);
  const jumpToAct = useCallback((actIndex: number) => {
    setPlayback({ phase: "playing", actIndex, textIndex: -1 });
  }, []);

  const next = useCallback(() => {
    if (typewriter.isTyping) {
      typewriter.complete();
      return;
    }
    setPlayback((current) => {
      if (current.phase === "title") return { ...current, phase: "playing" };
      if (current.phase === "finished") return current;
      const currentAct = card.data.acts[current.actIndex];
      if (current.textIndex < currentAct.texts.length - 1) {
        return { ...current, textIndex: current.textIndex + 1 };
      }
      if (current.actIndex < card.data.acts.length - 1) {
        return { phase: "playing", actIndex: current.actIndex + 1, textIndex: -1 };
      }
      return { ...current, phase: "finished" };
    });
  }, [card, typewriter.complete, typewriter.isTyping]);

  const previous = useCallback(() => {
    setPlayback((current) => {
      if (current.phase !== "playing") return current;
      if (current.textIndex > 0) return { ...current, textIndex: current.textIndex - 1 };
      if (current.textIndex === 0) return { ...current, textIndex: -1 };
      if (current.actIndex === 0) return current;
      const previousActIndex = current.actIndex - 1;
      return {
        phase: "playing",
        actIndex: previousActIndex,
        textIndex: card.data.acts[previousActIndex].texts.length - 1
      };
    });
  }, [card]);

  useEffect(() => {
    if (!currentText || typewriter.isTyping || currentText.display.advance !== "auto") return;
    const delay = Math.min(5200, Math.max(1500, 1300 + currentText.content.length * 45));
    const timer = window.setTimeout(next, delay);
    return () => window.clearTimeout(timer);
  }, [currentText, next, typewriter.isTyping]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous]);

  return (
    <>
      <DebugToolbar
        card={card}
        cardId={card.meta.id}
        playback={playback}
        isTyping={typewriter.isTyping}
        issueCount={issues.length}
        onCardChange={selectCard}
        onActChange={jumpToAct}
        onPrevious={previous}
        onNext={next}
        onRestart={restart}
        onIssues={() => setShowIssues((current) => !current)}
      />
      <main className="app-shell">
        <section className="player-shell">
          <div className="background-placeholder" />
          {backgroundUrl ? <img className="background-image" src={backgroundUrl} alt="" /> : null}
          <div className="stage-shade" />
          <div className="stage-fog" />
          {playback.phase === "playing" ? (
            <CharacterLayer characters={act.characters} activeSpeaker={currentText?.speakerId ?? ""} />
          ) : null}
          {playback.phase === "title" ? <TitleView card={card} onStart={start} /> : null}
          {playback.phase === "playing" ? (
            <PlayView
              act={act}
              actIndex={playback.actIndex}
              actCount={card.data.acts.length}
              textIndex={playback.textIndex}
              text={currentText}
              typedContent={typewriter.content}
              onAdvance={next}
            />
          ) : null}
          {playback.phase === "finished" ? <EndView card={card} onRestart={restart} /> : null}
        </section>
      </main>
      {showIssues ? <IssueDrawer issues={issues} onClose={() => setShowIssues(false)} /> : null}
    </>
  );
}

export default function App() {
  const firstCard = cardOptions[0]?.card;
  if (!firstCard) {
    return <main className="empty-library"><h1>没有可播放的幻梦卡</h1><p>请在 cards/ 中加入符合契约的 JSON。</p></main>;
  }
  return <PlayerApp initialCardId={firstCard.meta.id} />;
}
