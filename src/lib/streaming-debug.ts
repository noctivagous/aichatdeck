"use client";

const STREAMING_DEBUG_ENABLED_KEY = "aichatdeck-streaming-debug-enabled";
const STREAMING_DEBUG_CHANNEL = "aichatdeck-streaming-debug-events";
const MAX_STREAMING_DEBUG_EVENTS = 500;

export type StreamingDebugEvent = {
  id: number;
  ts: number;
  source: string;
  event: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

type StreamingDebugSubscriber = (events: StreamingDebugEvent[]) => void;

declare global {
  interface Window {
    __aichatdeckStreamingDebugEvents?: StreamingDebugEvent[];
    __aichatdeckStreamingDebugSequence?: number;
    __aichatdeckStreamingDebugSubscribers?: Set<StreamingDebugSubscriber>;
    __aichatdeckStreamingDebugChannel?: BroadcastChannel | null;
    __aichatdeckStreamingDebugChannelBound?: boolean;
  }
}

function canUseBrowser(): boolean {
  return typeof window !== "undefined";
}

function getEventsBuffer(): StreamingDebugEvent[] {
  if (!canUseBrowser()) return [];
  if (!window.__aichatdeckStreamingDebugEvents) {
    window.__aichatdeckStreamingDebugEvents = [];
  }
  return window.__aichatdeckStreamingDebugEvents;
}

function getSubscribers(): Set<StreamingDebugSubscriber> {
  if (!canUseBrowser()) return new Set();
  if (!window.__aichatdeckStreamingDebugSubscribers) {
    window.__aichatdeckStreamingDebugSubscribers = new Set();
  }
  return window.__aichatdeckStreamingDebugSubscribers;
}

function nextEventId(): number {
  if (!canUseBrowser()) return 0;
  window.__aichatdeckStreamingDebugSequence =
    (window.__aichatdeckStreamingDebugSequence ?? 0) + 1;
  return window.__aichatdeckStreamingDebugSequence;
}

function notifySubscribers(): void {
  if (!canUseBrowser()) return;
  const events = getEventsBuffer();
  for (const subscriber of getSubscribers()) {
    subscriber(events);
  }
}

function pushEvent(event: StreamingDebugEvent): void {
  if (!canUseBrowser()) return;
  const events = getEventsBuffer();
  events.push(event);
  if (events.length > MAX_STREAMING_DEBUG_EVENTS) {
    events.splice(0, events.length - MAX_STREAMING_DEBUG_EVENTS);
  }
  notifySubscribers();
}

function getChannel(): BroadcastChannel | null {
  if (!canUseBrowser()) return null;
  if (typeof BroadcastChannel === "undefined") return null;
  if (!window.__aichatdeckStreamingDebugChannel) {
    window.__aichatdeckStreamingDebugChannel = new BroadcastChannel(
      STREAMING_DEBUG_CHANNEL,
    );
  }
  if (
    window.__aichatdeckStreamingDebugChannel &&
    !window.__aichatdeckStreamingDebugChannelBound
  ) {
    window.__aichatdeckStreamingDebugChannel.onmessage = (message) => {
      const data = message.data as StreamingDebugEvent | undefined;
      if (!data || typeof data !== "object") return;
      if (typeof data.id !== "number") return;
      if (typeof data.ts !== "number") return;
      if (typeof data.source !== "string") return;
      if (typeof data.event !== "string") return;
      pushEvent(data);
    };
    window.__aichatdeckStreamingDebugChannelBound = true;
  }
  return window.__aichatdeckStreamingDebugChannel;
}

export function isStreamingDebugEnabled(): boolean {
  if (!canUseBrowser()) return false;
  try {
    return localStorage.getItem(STREAMING_DEBUG_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStreamingDebugEnabled(enabled: boolean): void {
  if (!canUseBrowser()) return;
  try {
    localStorage.setItem(STREAMING_DEBUG_ENABLED_KEY, enabled ? "1" : "0");
  } catch {
    // ignore localStorage failures
  }
}

export function clearStreamingDebugEvents(): void {
  if (!canUseBrowser()) return;
  getEventsBuffer().length = 0;
  notifySubscribers();
}

export function getStreamingDebugEvents(): StreamingDebugEvent[] {
  if (!canUseBrowser()) return [];
  return [...getEventsBuffer()];
}

export function subscribeStreamingDebug(
  subscriber: StreamingDebugSubscriber,
): () => void {
  if (!canUseBrowser()) return () => {};
  const subscribers = getSubscribers();
  getChannel();
  subscribers.add(subscriber);
  subscriber(getStreamingDebugEvents());
  return () => {
    subscribers.delete(subscriber);
  };
}

export function logStreamingDebug(
  payload: Omit<StreamingDebugEvent, "id" | "ts">,
): void {
  if (!canUseBrowser() || !isStreamingDebugEnabled()) return;

  const entry: StreamingDebugEvent = {
    id: nextEventId(),
    ts: Date.now(),
    source: payload.source,
    event: payload.event,
    durationMs: payload.durationMs,
    meta: payload.meta,
  };

  pushEvent(entry);
  getChannel()?.postMessage(entry);
}
