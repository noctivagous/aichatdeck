import type { KeyChord } from "./types";

const MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT";
}

export function isOverlayOpen(): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector("[role=dialog][data-state=open]")) return true;
  if (document.querySelector("[data-radix-popper-content-wrapper]")) return true;
  return false;
}

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

export function matchKey(event: KeyboardEvent, chord: KeyChord): boolean {
  const key = normalizeKey(event.key);

  switch (chord) {
    case "enter":
      return key === "enter" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "alt+enter":
      return key === "enter" && event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey;
    case "arrowleft":
      return key === "arrowleft" && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "arrowright":
      return key === "arrowright" && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "arrowup":
      return key === "arrowup" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "arrowdown":
      return key === "arrowdown" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "shift+arrowup":
      return key === "arrowup" && event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "shift+arrowdown":
      return key === "arrowdown" && event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "pageup":
      return key === "pageup" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "pagedown":
      return key === "pagedown" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "shift+pageup":
      return key === "pageup" && event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "shift+pagedown":
      return key === "pagedown" && event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "alt+arrowleft":
      return key === "arrowleft" && event.altKey && !event.metaKey && !event.ctrlKey;
    case "alt+arrowright":
      return key === "arrowright" && event.altKey && !event.metaKey && !event.ctrlKey;
    case "alt+m":
      return (key === "m" || key === "µ") && event.altKey && !event.metaKey && !event.ctrlKey;
    default:
      return false;
  }
}

const SHORTCUT_LABELS: Record<KeyChord, { mac: string; other: string }> = {
  enter: { mac: "↵", other: "Enter" },
  "alt+enter": { mac: "⌥↵", other: "Alt+Enter" },
  arrowleft: { mac: "←", other: "←" },
  arrowright: { mac: "→", other: "→" },
  arrowup: { mac: "↑", other: "↑" },
  arrowdown: { mac: "↓", other: "↓" },
  "shift+arrowup": { mac: "⇧↑", other: "Shift+↑" },
  "shift+arrowdown": { mac: "⇧↓", other: "Shift+↓" },
  pageup: { mac: "PgUp", other: "PgUp" },
  pagedown: { mac: "PgDn", other: "PgDn" },
  "shift+pageup": { mac: "⇧PgUp", other: "Shift+PgUp" },
  "shift+pagedown": { mac: "⇧PgDn", other: "Shift+PgDn" },
  "alt+arrowleft": { mac: "⌥←", other: "Alt+←" },
  "alt+arrowright": { mac: "⌥→", other: "Alt+→" },
  "alt+m": { mac: "⌥M", other: "Alt+M" },
};

export function formatShortcut(chord: KeyChord): string {
  const labels = SHORTCUT_LABELS[chord];
  return MAC ? labels.mac : labels.other;
}

export const keyBadgeClass =
  "mx-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded border border-zinc-200 bg-zinc-100 px-1 font-sans text-[10px] font-medium leading-none text-zinc-600 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]";