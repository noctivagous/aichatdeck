import { formatShortcut, keyBadgeClass } from "@/lib/keybindings/match";

type ScrollShortcutHintProps = {
  composerFocused: boolean;
};

export function ScrollShortcutHint({ composerFocused }: ScrollShortcutHintProps) {
  if (composerFocused) {
    return (
      <>
        <kbd className={keyBadgeClass}>
          {formatShortcut("shift+arrowup")}
        </kbd>{" "}
        and{" "}
        <kbd className={keyBadgeClass}>
          {formatShortcut("shift+arrowdown")}
        </kbd>{" "}
        scroll
      </>
    );
  }

  return (
    <>
      <kbd className={keyBadgeClass}>↑</kbd> and{" "}
      <kbd className={keyBadgeClass}>↓</kbd> scroll
    </>
  );
}
