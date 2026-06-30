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
      return key === "arrowup" && !event.altKey && !event.metaKey && !event.ctrlKey;
    case "arrowdown":
      return key === "arrowdown" && !event.altKey && !event.metaKey && !event.ctrlKey;
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
  "alt+arrowleft": { mac: "⌥←", other: "Alt+←" },
  "alt+arrowright": { mac: "⌥→", other: "Alt+→" },
  "alt+m": { mac: "⌥M", other: "Alt+M" },
};

export function formatShortcut(chord: KeyChord): string {
  const labels = SHORTCUT_LABELS[chord];
  return MAC ? labels.mac : labels.other;
}