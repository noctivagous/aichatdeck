import type { UIMessage } from "ai";
import { notFound } from "next/navigation";
import { ChatSession } from "@/components/chat/ChatSession";
import { getConversation } from "@/lib/server/conversations";
import { parseChatNavigateTarget } from "@/lib/chat-navigation";

export const dynamic = "force-dynamic";

type ChatPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { id } = await params;
  const record = await getConversation(id);
  if (!record) notFound();

  const query = await searchParams;
  const navigateTarget = parseChatNavigateTarget(
    new URLSearchParams(
      Object.entries(query).flatMap(([key, value]) => {
        if (Array.isArray(value)) return value.map((item) => [key, item]);
        if (value === undefined) return [];
        return [[key, value]];
      }),
    ),
  );

  return (
    <ChatSession
      conversationId={record.id}
      initialTitle={record.title}
      initialModelId={record.modelId}
      initialMessages={record.messages as UIMessage[]}
      initialPageBreaks={record.pageBreaks ?? []}
      initialSealedPageIndices={record.sealedPageIndices}
      initialActivePageIndex={record.activePageIndex}
      initialFocusedPageIndex={navigateTarget?.pageIndex ?? record.focusedPageIndex ?? 0}
      initialNavigateTo={navigateTarget}
    />
  );
}