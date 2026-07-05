export type NewPageMode = "manual" | "auto";

export const NEW_PAGE_MODE_OPTIONS = [
  {
    id: "manual",
    label: "Keep Open",
    description: "Use Send to New Page when you want a fresh page.",
  },
  {
    id: "auto",
    label: "New Page",
    description: "Each prompt starts on a new page automatically.",
  },
] as const satisfies ReadonlyArray<{
  id: NewPageMode;
  label: string;
  description: string;
}>;

export const NEW_PAGE_MODE_DEFAULT: NewPageMode = "manual";

export function newPageModeDescription(mode: NewPageMode): string {
  return (
    NEW_PAGE_MODE_OPTIONS.find((option) => option.id === mode)?.description ??
    mode
  );
}

const STORAGE_KEY = "aichatdeck-new-page-mode";
const LEGACY_STORAGE_KEY = "aichatdeck-new-pagecard-per-prompt";

export function isNewPageMode(value: string): value is NewPageMode {
  return value === "manual" || value === "auto";
}

export function loadNewPageMode(): NewPageMode {
  if (typeof window === "undefined") return NEW_PAGE_MODE_DEFAULT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isNewPageMode(stored)) return stored;

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === "1" || legacy === "true") return "auto";
    if (legacy === "0" || legacy === "false") return "manual";
  } catch {
    // ignore
  }
  return NEW_PAGE_MODE_DEFAULT;
}

export function saveNewPageMode(mode: NewPageMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}