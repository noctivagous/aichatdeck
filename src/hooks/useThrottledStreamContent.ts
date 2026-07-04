"use client";

import { useEffect, useRef, useState } from "react";
import type { StreamPacedIntervalMs, StreamUpdateMode } from "@/lib/streaming-display";

type ThrottledStreamState = {
  displayed: string;
  pendingChars: number;
  isCatchingUp: boolean;
};

export function useThrottledStreamContent(
  content: string,
  streaming: boolean,
  updateMode: StreamUpdateMode,
  pacedIntervalMs: StreamPacedIntervalMs,
): ThrottledStreamState {
  const [displayed, setDisplayed] = useState(content);
  const targetRef = useRef(content);
  const rafRef = useRef<number | null>(null);
  const pacedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPacedFlushRef = useRef(0);

  targetRef.current = content;

  useEffect(() => {
    const clearTimers = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pacedTimerRef.current !== null) {
        clearTimeout(pacedTimerRef.current);
        pacedTimerRef.current = null;
      }
    };

    if (!streaming) {
      clearTimers();
      setDisplayed(content);
      lastPacedFlushRef.current = 0;
      return;
    }

    if (updateMode === "instant") {
      clearTimers();
      setDisplayed(content);
      return;
    }

    const flush = () => {
      setDisplayed(targetRef.current);
      lastPacedFlushRef.current = Date.now();
    };

    if (updateMode === "smooth") {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        flush();
      });
      return clearTimers;
    }

    const elapsed = Date.now() - lastPacedFlushRef.current;
    if (elapsed >= pacedIntervalMs) {
      flush();
      return clearTimers;
    }

    if (pacedTimerRef.current !== null) return clearTimers;

    pacedTimerRef.current = setTimeout(() => {
      pacedTimerRef.current = null;
      flush();
    }, pacedIntervalMs - elapsed);

    return clearTimers;
  }, [content, streaming, updateMode, pacedIntervalMs]);

  const pendingChars = streaming
    ? Math.max(0, content.length - displayed.length)
    : 0;

  return {
    displayed,
    pendingChars,
    isCatchingUp: streaming && pendingChars > 0,
  };
}