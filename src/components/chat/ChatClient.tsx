"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import { ChatSession } from "./ChatSession";
import { getConversation } from "@/lib/db";
import type { ConversationRecord } from "@/lib/types";
import { parseChatNavigateTarget } from "@/lib/chat-navigation";

type ChatClientProps = {
  conversationId: string;
};

export function ChatClient({ conversationId }: ChatClientProps) {
  const searchParams = useSearchParams();
  const navigateTarget = useMemo(
    () => parseChatNavigateTarget(searchParams),
    [searchParams],
  );
  const [conversation, setConversation] = useState<ConversationRecord | null>(
    null,
  );

  useEffect(() => {
    void (async () => {
      const record = await getConversation(conversationId);
      if (!record) {
        toast.error("Conversation not found");
        return;
      }
      setConversation(record);
    })();
  }, [conversationId]);

  if (!conversation) {
    return (
      <div className="grid h-[100dvh] place-items-center text-sm text-zinc-500">
        Loading conversation…
      </div>
    );
  }

  return (
    <ChatSession
      conversationId={conversation.id}
      initialTitle={conversation.title}
      initialModelId={conversation.modelId}
      initialMessages={conversation.messages as UIMessage[]}
      initialPageBreaks={conversation.pageBreaks ?? []}
      initialSealedPageIndices={conversation.sealedPageIndices}
      initialActivePageIndex={conversation.activePageIndex}
      initialFocusedPageIndex={
        navigateTarget?.pageIndex ?? conversation.focusedPageIndex ?? 0
      }
      initialNavigateTo={navigateTarget}
    />
  );
}