"use client";

import { useEffect, useRef, useState } from "react";
import type { StreamPacedIntervalMs, StreamUpdateMode } from "@/lib/streaming-display";
import { logStreamingDebug } from "@/lib/streaming-debug";

type ThrottledStreamState = {
  displayed: string;
  pendingChars: number;
  isCatchingUp: boolean;
};

type ThrottledStreamOptions = {
  minChunkChars?: number;
  maxChunkDelayMs?: number;
  maxCharsPerFlush?: number;
  /** Resets displayed state when the active stream identity changes. */
  streamKey?: string;
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
  const maxCharsPerFlush =
    options?.maxCharsPerFlush && options.maxCharsPerFlush > 0
      ? Math.floor(options.maxCharsPerFlush)
      : null;
  const streamKey = options?.streamKey;
  const streamKeyRef = useRef(streamKey);

  const resetDisplayed = (next: string) => {
    displayedRef.current = next;
    setDisplayed(next);
    lastPacedFlushRef.current = 0;
  };

  if (streamKey !== streamKeyRef.current) {
    streamKeyRef.current = streamKey;
    resetDisplayed(content);
  } else if (
    streaming &&
    displayedRef.current.length > 0 &&
    (content.length < displayedRef.current.length ||
      !content.startsWith(displayedRef.current))
  ) {
    resetDisplayed(content);
  }

  targetRef.current = content;

  const clearPacedTimer = () => {
    if (pacedTimerRef.current !== null) {
      clearTimeout(pacedTimerRef.current);
      pacedTimerRef.current = null;
      pacedTimerDueAtRef.current = null;
    }
  };

  const flushStep = (
    reason: "smooth-raf" | "paced-timer" | "direct",
    perFlushLimit: number | null,
  ) => {
    const target = targetRef.current;
    const current = displayedRef.current;
    const pendingChars = Math.max(0, target.length - current.length);
    if (pendingChars === 0) return 0;

    const canLimit = perFlushLimit !== null && Number.isFinite(perFlushLimit);
    const nextLength = canLimit
      ? Math.min(target.length, current.length + perFlushLimit)
      : target.length;
    const next = target.slice(0, nextLength);

    displayedRef.current = next;
    setDisplayed(next);
    lastPacedFlushRef.current = Date.now();

    const remainingChars = Math.max(0, target.length - next.length);
    logStreamingDebug({
      source: "useThrottledStreamContent",
      event: "flush",
      meta: {
        reason,
        updateMode,
        pendingChars: Math.max(0, next.length - current.length),
        nextChars: next.length,
        remainingChars,
      },
    });

    return remainingChars;
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
      const remainingChars = flushStep("paced-timer", null);
      if (remainingChars > 0) {
        schedulePacedFlush(Math.min(maxChunkDelayMs, pacedIntervalMs));
      }
    }, safeDelay);
  };

  const scheduleSmoothFlush = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const remainingChars = flushStep("smooth-raf", maxCharsPerFlush);
      if (remainingChars > 0) {
        scheduleSmoothFlush();
      }
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
      flushStep("direct", null);
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
    maxCharsPerFlush,
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