import type { UIMessage } from "ai";

/** How items on a slide are counted for display and auto-pagination. */
export type CountingTypeId = "qa" | "messages";

export const DEFAULT_COUNTING_TYPE: CountingTypeId = "qa";

export const COUNTING_TYPE_LABELS: Record<CountingTypeId, string> = {
  qa: "Q&A",
  messages: "Messages",
};

export function countItems(
  messages: UIMessage[],
  type: CountingTypeId = DEFAULT_COUNTING_TYPE,
): number {
  if (type === "messages") return messages.length;
  return messages.reduce(
    (count, message) => (message.role === "user" ? count + 1 : count),
    0,
  );
}

export function formatCountLabel(
  count: number,
  type: CountingTypeId = DEFAULT_COUNTING_TYPE,
): string {
  if (type === "messages") {
    return count === 1 ? "1 msg" : `${count} msgs`;
  }
  return count === 1 ? "1 Q&A" : `${count} Q&As`;
}