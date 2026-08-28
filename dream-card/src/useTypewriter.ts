import { useCallback, useEffect, useMemo, useState } from "react";
import type { DreamText } from "./types";

function splitGraphemes(text: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter("zh-CN", { granularity: "grapheme" }).segment(text),
      (item) => item.segment
    );
  }
  return Array.from(text);
}

export function useTypewriter(text: DreamText | null) {
  const units = useMemo(() => splitGraphemes(text?.content ?? ""), [text?.content]);
  const shouldAnimate =
    text?.display.mode === "typewriter" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [visibleCount, setVisibleCount] = useState(() => (shouldAnimate ? 0 : units.length));

  useEffect(() => {
    if (!text || !shouldAnimate) {
      setVisibleCount(units.length);
      return;
    }

    setVisibleCount(0);
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += 1;
      setVisibleCount(cursor);
      if (cursor >= units.length) window.clearInterval(timer);
    }, 34);
    return () => window.clearInterval(timer);
  }, [text?.id, shouldAnimate, units.length]);

  const complete = useCallback(() => setVisibleCount(units.length), [units.length]);
  return {
    content: units.slice(0, visibleCount).join(""),
    complete,
    isTyping: visibleCount < units.length
  };
}
