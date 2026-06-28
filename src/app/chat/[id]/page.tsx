import { ChatClient } from "@/components/chat/ChatClient";

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  return <ChatClient conversationId={id} />;
}