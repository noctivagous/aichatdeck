"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { PageView } from "@/lib/types";
import { buildMessageHeadingSlugPlan } from "@/lib/session-outline";

const PageSlugPlanContext = createContext<Map<string, string[]> | null>(null);

const MessageSlugContext = createContext<string[] | null>(null);

export function PageSlugPlanProvider({
  page,
  children,
}: {
  page: PageView;
  children: ReactNode;
}) {
  const plan = useMemo(
    () => buildMessageHeadingSlugPlan(page),
    [page.messages],
  );

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