"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatShortcut, keyBadgeClass } from "@/lib/keybindings/match";
import { pushWithViewTransition } from "@/lib/view-transition-nav";

export function MainMenuHeaderButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 shrink-0 gap-1.5 px-2.5"
      asChild
    >
      <Link
        href="/"
        aria-label="Main menu"
        onClick={(event) => {
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          pushWithViewTransition(router, "/", "back");
        }}
      >
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          Main Menu
        </span>
        <kbd className={keyBadgeClass}>{formatShortcut("alt+m")}</kbd>
      </Link>
    </Button>
  );
}