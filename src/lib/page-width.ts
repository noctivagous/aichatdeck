export type PageWidthMode = "auto" | "fixed";

export const PAGE_WIDTH = {
  narrow: 600,
  wide: 880,
  min: 480,
  max: 960,
  step: 10,
} as const;

export const PAGE_WIDTH_MODE_OPTIONS = [
  {
    id: "auto",
    label: "Auto",
    description:
      "Fit the slide to the track with a peek of adjacent slides on each side.",
  },
  {
    id: "fixed",
    label: "Fixed",
    description: "Set an exact slide width with the slider.",
  },
] as const satisfies ReadonlyArray<{
  id: PageWidthMode;
  label: string;
  description: string;
}>;

export const PAGE_WIDTH_MODE_DEFAULT: PageWidthMode = "auto";

/** Peek of adjacent slides on each side when width mode is Auto. */
export const AUTO_SIDE_INSET = {
  default: 100,
  min: 0,
  max: 200,
  step: 5,
} as const;

const STORAGE_KEY = "aichatdeck-page-width";
const MODE_STORAGE_KEY = "aichatdeck-page-width-mode";
const AUTO_SIDE_INSET_STORAGE_KEY = "aichatdeck-page-width-auto-inset";

export function isUltrawideViewport(width: number, height: number): boolean {
  return width >= 1920 || width / Math.max(height, 1) >= 2.1;
}

export function detectDefaultPageWidth(
  width = typeof window !== "undefined" ? window.innerWidth : 1280,
  height = typeof window !== "undefined" ? window.innerHeight : 800,
): number {
  return isUltrawideViewport(width, height)
    ? PAGE_WIDTH.wide
    : PAGE_WIDTH.narrow;
}

export function clampPageWidth(value: number): number {
  return Math.min(PAGE_WIDTH.max, Math.max(PAGE_WIDTH.min, Math.round(value)));
}

export function isPageWidthMode(value: string): value is PageWidthMode {
  return value === "auto" || value === "fixed";
}

export function clampAutoSideInset(value: number): number {
  return Math.min(
    AUTO_SIDE_INSET.max,
    Math.max(AUTO_SIDE_INSET.min, Math.round(value)),
  );
}

export function pageWidthModeDescription(
  mode: PageWidthMode,
  autoSideInset: number = AUTO_SIDE_INSET.default,
): string {
  if (mode === "auto") {
    return `Fit the slide to the track with ${clampAutoSideInset(autoSideInset)}px peek of adjacent slides on each side.`;
  }
  return (
    PAGE_WIDTH_MODE_OPTIONS.find((option) => option.id === mode)?.description ??
    mode
  );
}

export function autoPageWidth(
  containerWidth: number,
  sideInset: number = AUTO_SIDE_INSET.default,
): number {
  const inset = clampAutoSideInset(sideInset);
  return Math.max(
    PAGE_WIDTH.min,
    Math.round(containerWidth - inset * 2),
  );
}

export function resolvePageWidth(
  mode: PageWidthMode,
  fixedWidth: number,
  containerWidth: number | null,
  autoSideInset: number = AUTO_SIDE_INSET.default,
): number {
  if (mode === "auto" && containerWidth !== null) {
    return autoPageWidth(containerWidth, autoSideInset);
  }
  return clampPageWidth(fixedWidth);
}

export function loadAutoSideInset(): number {
  if (typeof window === "undefined") return AUTO_SIDE_INSET.default;
  try {
    const stored = localStorage.getItem(AUTO_SIDE_INSET_STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) return clampAutoSideInset(parsed);
    }
  } catch {
    // ignore
  }
  return AUTO_SIDE_INSET.default;
}

export function saveAutoSideInset(inset: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      AUTO_SIDE_INSET_STORAGE_KEY,
      String(clampAutoSideInset(inset)),
    );
  } catch {
    // ignore
  }
}

export function loadPageWidthMode(): PageWidthMode {
  if (typeof window === "undefined") return PAGE_WIDTH_MODE_DEFAULT;
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored && isPageWidthMode(stored)) return stored;
  } catch {
    // ignore
  }
  return PAGE_WIDTH_MODE_DEFAULT;
}

export function savePageWidthMode(mode: PageWidthMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function loadPageWidth(): number {
  if (typeof window === "undefined") return PAGE_WIDTH.narrow;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) return clampPageWidth(parsed);
    }
  } catch {
    // ignore
  }
  return detectDefaultPageWidth();
}

export function savePageWidth(width: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(clampPageWidth(width)));
  } catch {
    // ignore
  }
}

export function slideEdgeGutter(trackWidth: number, pageWidth: number): number {
  return Math.max(0, (trackWidth - pageWidth) / 2);
}