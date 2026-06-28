export type PageColumnCount = 1 | 2 | 3;

export const PAGE_COLUMNS = {
  min: 1 as PageColumnCount,
  max: 3 as PageColumnCount,
  default: 1 as PageColumnCount,
} as const;

const STORAGE_KEY = "aichatdeck-page-columns";

export function clampPageColumns(value: number): PageColumnCount {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= 3) return 3;
  return rounded as PageColumnCount;
}

export function loadPageColumns(): PageColumnCount {
  if (typeof window === "undefined") return PAGE_COLUMNS.default;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) return clampPageColumns(parsed);
    }
  } catch {
    // ignore
  }
  return PAGE_COLUMNS.default;
}

export function savePageColumns(columns: PageColumnCount): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(columns));
  } catch {
    // ignore
  }
}