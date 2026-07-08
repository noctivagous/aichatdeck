"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PageView } from "@/lib/types";
import { buildMessageHeadingSlugPlan } from "@/lib/session-outline";
import { logStreamingDebug } from "@/lib/streaming-debug";

const PageSlugPlanContext = createContext<Map<string, string[]> | null>(null);

const MessageSlugContext = createContext<string[] | null>(null);

const SLUG_PLAN_STREAMING_DEBOUNCE_MS = 400;

export function PageSlugPlanProvider({
  page,
  streamingMessageId,
  children,
}: {
  page: PageView;
  streamingMessageId?: string;
  children: ReactNode;
}) {
  const [plan, setPlan] = useState(() => buildMessageHeadingSlugPlan(page));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const delay = streamingMessageId ? SLUG_PLAN_STREAMING_DEBOUNCE_MS : 0;
    timerRef.current = setTimeout(() => {
      const startedAt = performance.now();
      const nextPlan = buildMessageHeadingSlugPlan(page);
      const durationMs = performance.now() - startedAt;
      if (durationMs >= 6) {
        logStreamingDebug({
          source: "PageSlugPlanProvider",
          event: "build-plan",
          durationMs,
          meta: {
            pageIndex: page.index,
            messages: page.messages.length,
            streamingMessageId: streamingMessageId ?? null,
          },
        });
      }
      setPlan(nextPlan);
      timerRef.current = null;
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [page.messages, streamingMessageId]);

  return (
    <PageSlugPlanContext.Provider value={plan}>
      {children}
    </PageSlugPlanContext.Provider>
  );
}

export function AssistantMessageSlugProvider({
  messageId,
  children,
}: {
  messageId: string;
  children: ReactNode;
}) {
  const plan = useContext(PageSlugPlanContext);
  const slugs = plan?.get(messageId) ?? [];

  return <MessageSlugContext.Provider value={slugs}>{children}</MessageSlugContext.Provider>;
}

export function useMessageHeadingSlugs(): string[] {
  return useContext(MessageSlugContext) ?? [];
}