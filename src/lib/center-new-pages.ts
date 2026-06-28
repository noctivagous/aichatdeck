const STORAGE_KEY = "aichatdeck-center-new-pages";

export function loadCenterNewPages(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "0" || stored === "false") return false;
    if (stored === "1" || stored === "true") return true;
  } catch {
    // ignore
  }
  return true;
}

export function saveCenterNewPages(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}