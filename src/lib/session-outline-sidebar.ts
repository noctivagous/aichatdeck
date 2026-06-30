const STORAGE_KEY = "aichatdeck-session-outline-sidebar";

export function loadSessionOutlineSidebarOpen(): boolean {
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

export function saveSessionOutlineSidebarOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    // ignore
  }
}