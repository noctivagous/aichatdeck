export const REPLY_FONT_SCALE = {
  basePx: 17,
  default: "1" as const,
} as const;

export const REPLY_FONT_SCALES = [
  { id: "0.75", scale: 0.75 },
  { id: "0.85", scale: 0.85 },
  { id: "0.95", scale: 0.95 },
  { id: "1", scale: 1 },
  { id: "1.1", scale: 1.1 },
  { id: "1.2", scale: 1.2 },
  { id: "1.35", scale: 1.35 },
  { id: "1.45", scale: 1.45 },
  { id: "1.6", scale: 1.6 },
  { id: "1.75", scale: 1.75 },
] as const;

export type ReplyFontScaleId = (typeof REPLY_FONT_SCALES)[number]["id"];

const SCALE_IDS = REPLY_FONT_SCALES.map((option) => option.id);

const STORAGE_KEY = "aichatdeck-reply-font-size";

const LEGACY_SCALE_MAP: Record<string, ReplyFontScaleId> = {
  small: "0.85",
  medium: "1",
  large: "1.2",
  "x-large": "1.45",
};

export function isReplyFontScaleId(value: string): value is ReplyFontScaleId {
  return (SCALE_IDS as readonly string[]).includes(value);
}

export function replyFontScaleValue(id: ReplyFontScaleId): number {
  return REPLY_FONT_SCALES.find((option) => option.id === id)?.scale ?? 1;
}

export function replyFontEffectivePx(id: ReplyFontScaleId): number {
  return Math.round(REPLY_FONT_SCALE.basePx * replyFontScaleValue(id));
}

function formatScaleFactor(scale: number): string {
  return Number.isInteger(scale) ? `${scale}×` : `${scale}×`;
}

export function replyFontScaleLabel(id: ReplyFontScaleId): string {
  const scale = replyFontScaleValue(id);
  const px = replyFontEffectivePx(id);
  return `${formatScaleFactor(scale)} · ${px}px`;
}

export function replyFontScaleTriggerLabel(id: ReplyFontScaleId): string {
  return `${replyFontEffectivePx(id)}px`;
}

export function loadReplyFontScale(): ReplyFontScaleId {
  if (typeof window === "undefined") return REPLY_FONT_SCALE.default;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return REPLY_FONT_SCALE.default;
    if (isReplyFontScaleId(stored)) return stored;
    if (stored in LEGACY_SCALE_MAP) return LEGACY_SCALE_MAP[stored];
  } catch {
    // ignore
  }
  return REPLY_FONT_SCALE.default;
}

export function saveReplyFontScale(id: ReplyFontScaleId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}