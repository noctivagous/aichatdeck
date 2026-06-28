export const PAGE_WIDTH = {
  narrow: 600,
  wide: 880,
  min: 480,
  max: 960,
  step: 10,
} as const;

const STORAGE_KEY = "aichatdeck-page-width";

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