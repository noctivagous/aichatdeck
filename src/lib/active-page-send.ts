import {
  generateId,
  parseJsonEventStream,
  readUIMessageStream,
  uiMessageChunkSchema,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import type { ChatLengthId } from "./chat-length";
import { getPageInsertIndex, shiftPageBreaks } from "./pages";

type SendToActivePageArgs = {
  text: string;
  files?: FileList;
  messages: UIMessage[];
  pageBreaks: number[];
  sealedPageIndices: number[];
  activePageIndex: number;
  modelId: string;
  chatLength: ChatLengthId;
  onMessagesChange: (messages: UIMessage[]) => void;
  onPageBreaksChange: (pageBreaks: number[]) => void;
};

function buildUserMessage(text: string, files?: FileList): UIMessage {
  const parts: UIMessage["parts"] = [];

  if (text) {
    parts.push({ type: "text", text });
  }

  if (files) {
    for (const file of files) {
      parts.push({
        type: "file",
        mediaType: file.type,
        filename: file.name,
        url: URL.createObjectURL(file),
      });
    }
  }

  return {
    id: generateId(),
    role: "user",
    parts,
  };
}

async function streamAssistantReply(
  apiMessages: UIMessage[],
  modelId: string,
  chatLength: ChatLengthId,
  assistantId: string,
  onAssistantUpdate: (assistant: UIMessage) => void,
): Promise<UIMessage> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: apiMessages, modelId, chatLength }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to generate response");
  }

  if (!response.body) {
    throw new Error("Missing response stream");
  }

  let assistant: UIMessage = {
    id: assistantId,
    role: "assistant",
    parts: [],
  };

  const chunkStream = parseJsonEventStream({
    stream: response.body,
    schema: uiMessageChunkSchema,
  }).pipeThrough(
    new TransformStream({
      transform(part, controller) {
        if (!part.success) {
          controller.error(part.error);
          return;
        }
        controller.enqueue(part.value);
      },
    }),
  ) as ReadableStream<UIMessageChunk>;

  const stream = readUIMessageStream({
    message: assistant,
    stream: chunkStream,
  });

  for await (const updated of stream) {
    assistant = updated;
    onAssistantUpdate(updated);
  }

  return assistant;
}

export async function sendToActivePage({
  text,
  files,
  messages,
  pageBreaks,
  sealedPageIndices,
  activePageIndex,
  modelId,
  chatLength,
  onMessagesChange,
  onPageBreaksChange,
}: SendToActivePageArgs): Promise<void> {
  const userMessage = buildUserMessage(text, files);
  const insertIndex = getPageInsertIndex(
    activePageIndex,
    messages,
    pageBreaks,
    sealedPageIndices,
  );

  if (insertIndex >= messages.length) {
    throw new Error("ACTIVE_PAGE_APPEND");
  }

  const withUser = [
    ...messages.slice(0, insertIndex),
    userMessage,
    ...messages.slice(insertIndex),
  ];
  onMessagesChange(withUser);

  const assistantId = generateId();
  const apiMessages = withUser.slice(0, insertIndex + 1);

  let assistant: UIMessage = {
    id: assistantId,
    role: "assistant",
    parts: [],
  };

  const withPlaceholder = [
    ...withUser.slice(0, insertIndex + 1),
    assistant,
    ...withUser.slice(insertIndex + 1),
  ];
  onMessagesChange(withPlaceholder);
  onPageBreaksChange(shiftPageBreaks(pageBreaks, insertIndex, 1));

  try {
    assistant = await streamAssistantReply(
      apiMessages,
      modelId,
      chatLength,
      assistantId,
      (updatedAssistant) => {
        onMessagesChange([
          ...withUser.slice(0, insertIndex + 1),
          updatedAssistant,
          ...withUser.slice(insertIndex + 1),
        ]);
      },
    );
  } catch (error) {
    onMessagesChange(withUser);
    onPageBreaksChange(pageBreaks);
    throw error;
  }

  onMessagesChange([
    ...withUser.slice(0, insertIndex + 1),
    assistant,
    ...withUser.slice(insertIndex + 1),
  ]);
  onPageBreaksChange(shiftPageBreaks(pageBreaks, insertIndex, 2));
}

export function shouldAppendToActivePage(
  messages: UIMessage[],
  pageBreaks: number[],
  sealedPageIndices: number[],
  activePageIndex: number,
): boolean {
  return (
    getPageInsertIndex(
      activePageIndex,
      messages,
      pageBreaks,
      sealedPageIndices,
    ) >= messages.length
  );
}