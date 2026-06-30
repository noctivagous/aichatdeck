const STORAGE_KEY = "aichatdeck-auto-follow-live-reply";

export function loadAutoFollowLiveReply(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "0" || stored === "false") return false;
    if (stored === "1" || stored === "true") return true;
  } catch {
    // ignore
  }
  return false;
}

export function saveAutoFollowLiveReply(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}
