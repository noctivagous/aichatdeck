"use client";

import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildChatNavigateHref } from "@/lib/chat-navigation";
import type { ConversationSearchMatch } from "@/lib/conversation-list-query";
import { pushWithViewTransition } from "@/lib/view-transition-nav";
import { MessageSearchSnippet } from "./MessageSearchSnippet";

type MessageSearchResultProps = {
  conversationId: string;
  match: ConversationSearchMatch;
  roleLabel: (role: UIMessage["role"]) => string;
  className?: string;
};

export function MessageSearchResult({
  conversationId,
  match,
  roleLabel,
  className,
}: MessageSearchResultProps) {
  const router = useRouter();
  const href = buildChatNavigateHref(
    conversationId,
    match.pageIndex,
    match.headingSlug,
  );

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        pushWithViewTransition(router, href, "forward");
      }}
      className={cn(
        "w-full min-w-0 rounded-md border border-zinc-200/80 px-2 py-1.5 text-left ring-1 ring-inset ring-blue-500/40 transition",
        "hover:border-zinc-300 hover:bg-zinc-100/90 dark:border-zinc-700/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/70",
        className,
      )}
    >
      <p className="truncate text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
        {match.pageLabel} · {roleLabel(match.role)} · {match.sectionLabel}
      </p>
      <MessageSearchSnippet
        content={match.snippet}
        className="mt-0.5 line-clamp-2 text-zinc-600 dark:text-zinc-300"
      />
    </button>
  );
}