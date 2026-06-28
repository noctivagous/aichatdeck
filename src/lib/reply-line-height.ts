export const REPLY_LINE_HEIGHT = {
  default: "1.6" as const,
} as const;

export const REPLY_LINE_HEIGHTS = [
  { id: "1.4", value: 1.4, label: "Compact · 1.4" },
  { id: "1.5", value: 1.5, label: "Snug · 1.5" },
  { id: "1.6", value: 1.6, label: "Default · 1.6" },
  { id: "1.75", value: 1.75, label: "Relaxed · 1.75" },
  { id: "2", value: 2, label: "Airy · 2" },
] as const;

export type ReplyLineHeightId = (typeof REPLY_LINE_HEIGHTS)[number]["id"];

const LINE_HEIGHT_IDS = REPLY_LINE_HEIGHTS.map((option) => option.id);
const STORAGE_KEY = "aichatdeck-reply-line-height";

export function isReplyLineHeightId(value: string): value is ReplyLineHeightId {
  return (LINE_HEIGHT_IDS as readonly string[]).includes(value);
}

export function replyLineHeightValue(id: ReplyLineHeightId): number {
  return REPLY_LINE_HEIGHTS.find((option) => option.id === id)?.value ?? 1.6;
}

export function replyLineHeightLabel(id: ReplyLineHeightId): string {
  return (
    REPLY_LINE_HEIGHTS.find((option) => option.id === id)?.label ??
    "Default · 1.6"
  );
}

export function loadReplyLineHeight(): ReplyLineHeightId {
  if (typeof window === "undefined") return REPLY_LINE_HEIGHT.default;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isReplyLineHeightId(stored)) return stored;
  } catch {
    // ignore
  }
  return REPLY_LINE_HEIGHT.default;
}

export function saveReplyLineHeight(id: ReplyLineHeightId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(
      new CustomEvent("aichatdeck-reply-line-height", { detail: id }),
    );
  } catch {
    // ignore
  }
}