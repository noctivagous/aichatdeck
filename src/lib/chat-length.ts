import { CHAT_SYSTEM_PROMPT } from "@/lib/chat-system-prompt";

export const CHAT_LENGTH_OPTIONS = [
  {
    id: "short",
    label: "Short",
    description: "1-2 sentences",
  },
  {
    id: "small",
    label: "Small",
    description: "1-2 paragraphs",
  },
  {
    id: "medium",
    label: "Medium",
    description: "3-5 paragraphs",
  },
  {
    id: "auto",
    label: "Auto",
    description: "Determined by AI, current setting.",
  },
] as const;

export type ChatLengthId = (typeof CHAT_LENGTH_OPTIONS)[number]["id"];

export const CHAT_LENGTH_DEFAULT: ChatLengthId = "auto";

const STORAGE_KEY = "aichatdeck-chat-length";

const CHAT_LENGTH_IDS = CHAT_LENGTH_OPTIONS.map((option) => option.id);

export function isChatLengthId(value: string): value is ChatLengthId {
  return (CHAT_LENGTH_IDS as readonly string[]).includes(value);
}

export function chatLengthDescription(id: ChatLengthId): string {
  return (
    CHAT_LENGTH_OPTIONS.find((option) => option.id === id)?.description ?? id
  );
}

/** Natural-language length guidance appended to the system prompt. */
export function chatLengthInstruction(id: ChatLengthId): string | null {
  switch (id) {
    case "short":
      return "Keep your reply very brief: 1–2 sentences total unless the user explicitly asks for more detail.";
    case "small":
      return "Keep your reply concise: about 1–2 short paragraphs unless the user explicitly asks for more detail.";
    case "medium":
      return "Aim for a moderate reply: about 3–5 paragraphs unless the user explicitly asks for a different length.";
    case "auto":
      return null;
  }
}

export function buildChatSystemPrompt(chatLength: ChatLengthId = "auto"): string {
  const instruction = chatLengthInstruction(chatLength);
  if (!instruction) return CHAT_SYSTEM_PROMPT;

  return `${CHAT_SYSTEM_PROMPT}\n\nResponse length for this turn: ${instruction}`;
}

export function loadChatLength(): ChatLengthId {
  if (typeof window === "undefined") return CHAT_LENGTH_DEFAULT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isChatLengthId(stored)) return stored;
  } catch {
    // ignore
  }
  return CHAT_LENGTH_DEFAULT;
}

export function saveChatLength(id: ChatLengthId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}