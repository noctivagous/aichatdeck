import { Suspense } from "react";
import { ChatClient } from "@/components/chat/ChatClient";

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="grid h-[100dvh] place-items-center text-sm text-zinc-500">
          Loading conversation…
        </div>
      }
    >
      <ChatClient conversationId={id} />
    </Suspense>
  );
}