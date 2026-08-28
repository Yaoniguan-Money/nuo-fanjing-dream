"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DreamText } from "@/domain/dream-card";

export function useTypewriter(text: DreamText | null) {
  const [content, setContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!text) {
      const reset = window.setTimeout(() => {
        setContent("");
        setIsTyping(false);
      }, 0);
      return () => window.clearTimeout(reset);
    }
    if (text.display.mode === "instant") {
      const reveal = window.setTimeout(() => {
        setContent(text.content);
        setIsTyping(false);
      }, 0);
      return () => window.clearTimeout(reveal);
    }
    let index = 0;
    const reset = window.setTimeout(() => {
      setContent("");
      setIsTyping(true);
    }, 0);
    timerRef.current = window.setInterval(() => {
      index += 1;
      setContent(text.content.slice(0, index));
      if (index >= text.content.length) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setIsTyping(false);
      }
    }, 32);
    return () => {
      window.clearTimeout(reset);
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [text]);

  const complete = useCallback(() => {
    if (!text) return;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setContent(text.content);
    setIsTyping(false);
  }, [text]);

  return { content, isTyping, complete };
}
