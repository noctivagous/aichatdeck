import {
  replyFontEffectivePx,
  type ReplyFontScaleId,
} from "@/lib/reply-font-size";
import {
  replyLineHeightValue,
  type ReplyLineHeightId,
} from "@/lib/reply-line-height";

export const PAGE_CARD_LAYOUT_MODE_OPTIONS = [
  {
    id: "scroll",
    label: "Scroll",
    description: "Scroll the full page",
  },
  {
    id: "scroll-contained",
    label: "Contained",
    description:
      "Scroll-contained replies · assistant portion limited to 8 lines",
  },
] as const;

export type PageCardLayoutMode =
  (typeof PAGE_CARD_LAYOUT_MODE_OPTIONS)[number]["id"];

export const PAGE_CARD_LAYOUT_MODE_DEFAULT: PageCardLayoutMode = "scroll";

export const SCROLL_CONTAINED_REPLY_LINE_COUNT = 8;

const STORAGE_KEY = "aichatdeck-page-card-layout-mode";

const LAYOUT_MODE_IDS = PAGE_CARD_LAYOUT_MODE_OPTIONS.map(
  (option) => option.id,
);

export function isPageCardLayoutMode(
  value: string,
): value is PageCardLayoutMode {
  return (LAYOUT_MODE_IDS as readonly string[]).includes(value);
}

export function pageCardLayoutModeDescription(mode: PageCardLayoutMode): string {
  return (
    PAGE_CARD_LAYOUT_MODE_OPTIONS.find((option) => option.id === mode)
      ?.description ?? mode
  );
}

export function scrollContainedReplyMaxHeightPx(
  fontScale: ReplyFontScaleId,
  lineHeight: ReplyLineHeightId,
): number {
  return (
    SCROLL_CONTAINED_REPLY_LINE_COUNT *
    replyFontEffectivePx(fontScale) *
    replyLineHeightValue(lineHeight)
  );
}

export function loadPageCardLayoutMode(): PageCardLayoutMode {
  if (typeof window === "undefined") return PAGE_CARD_LAYOUT_MODE_DEFAULT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isPageCardLayoutMode(stored)) return stored;
  } catch {
    // ignore
  }
  return PAGE_CARD_LAYOUT_MODE_DEFAULT;
}

export function savePageCardLayoutMode(mode: PageCardLayoutMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}