import type { UIMessage } from "ai";

export function estimateTokens(text = ""): number {
  return Math.round(text.length / 4);
}

export function messageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function messageTokens(msg: UIMessage): number {
  return estimateTokens(messageText(msg));
}

export function totalTokens(messages: UIMessage[]): number {
  return messages.reduce((sum, msg) => sum + messageTokens(msg), 0);
}