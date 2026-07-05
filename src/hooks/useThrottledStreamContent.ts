"use client";

import { useEffect, useRef, useState } from "react";
import type { StreamPacedIntervalMs, StreamUpdateMode } from "@/lib/streaming-display";

type ThrottledStreamState = {
  displayed: string;
  pendingChars: number;
  isCatchingUp: boolean;
};

type ThrottledStreamOptions = {
  minChunkChars?: number;
  maxChunkDelayMs?: number;
};

export function useThrottledStreamContent(
  content: string,
  streaming: boolean,
  updateMode: StreamUpdateMode,
  pacedIntervalMs: StreamPacedIntervalMs,
  options?: ThrottledStreamOptions,
): ThrottledStreamState {
  const [displayed, setDisplayed] = useState(content);
  const targetRef = useRef(content);
  const displayedRef = useRef(content);
  const rafRef = useRef<number | null>(null);
  const pacedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pacedTimerDueAtRef = useRef<number | null>(null);
  const lastPacedFlushRef = useRef(0);
  const minChunkChars = Math.max(1, options?.minChunkChars ?? 1);
  const maxChunkDelayMs = Math.max(16, options?.maxChunkDelayMs ?? 120);

  targetRef.current = content;

  const clearPacedTimer = () => {
    if (pacedTimerRef.current !== null) {
      clearTimeout(pacedTimerRef.current);
      pacedTimerRef.current = null;
      pacedTimerDueAtRef.current = null;
    }
  };

  const flushNow = () => {
    const next = targetRef.current;
    displayedRef.current = next;
    setDisplayed(next);
    lastPacedFlushRef.current = Date.now();
  };

  const schedulePacedFlush = (delayMs: number) => {
    const safeDelay = Math.max(0, Math.round(delayMs));
    const dueAt = Date.now() + safeDelay;
    if (
      pacedTimerRef.current !== null &&
      pacedTimerDueAtRef.current !== null &&
      pacedTimerDueAtRef.current <= dueAt
    ) {
      return;
    }

    clearPacedTimer();
    pacedTimerDueAtRef.current = dueAt;
    pacedTimerRef.current = setTimeout(() => {
      pacedTimerRef.current = null;
      pacedTimerDueAtRef.current = null;
      flushNow();
    }, safeDelay);
  };

  const scheduleSmoothFlush = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      flushNow();
    });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      clearPacedTimer();
    };
  }, []);

  useEffect(() => {
    const clearTimers = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      clearPacedTimer();
    };

    if (!streaming) {
      clearTimers();
      displayedRef.current = content;
      setDisplayed(content);
      lastPacedFlushRef.current = 0;
      return;
    }

    if (updateMode === "instant") {
      clearTimers();
      displayedRef.current = content;
      setDisplayed(content);
      lastPacedFlushRef.current = Date.now();
      return;
    }

    const pendingChars = Math.max(
      0,
      targetRef.current.length - displayedRef.current.length,
    );
    if (pendingChars === 0) return;

    const now = Date.now();
    const elapsed = now - lastPacedFlushRef.current;
    const meetsChunkTarget = pendingChars >= minChunkChars;
    const reachedMaxDelay = elapsed >= maxChunkDelayMs;

    if (updateMode === "smooth") {
      if (reachedMaxDelay || meetsChunkTarget) {
        scheduleSmoothFlush();
      } else {
        schedulePacedFlush(maxChunkDelayMs - elapsed);
      }
      return;
    }

    if (reachedMaxDelay || (meetsChunkTarget && elapsed >= pacedIntervalMs)) {
      flushNow();
      return;
    }

    const waitForInterval = Math.max(0, pacedIntervalMs - elapsed);
    const waitForMaxDelay = Math.max(0, maxChunkDelayMs - elapsed);
    const nextDelay = meetsChunkTarget
      ? Math.min(waitForInterval, waitForMaxDelay)
      : waitForMaxDelay;
    schedulePacedFlush(nextDelay);
  }, [
    content,
    maxChunkDelayMs,
    minChunkChars,
    pacedIntervalMs,
    streaming,
    updateMode,
  ]);

  const pendingChars = streaming
    ? Math.max(0, content.length - displayedRef.current.length)
    : 0;

  return {
    displayed,
    pendingChars,
    isCatchingUp: streaming && pendingChars > 0,
  };
}